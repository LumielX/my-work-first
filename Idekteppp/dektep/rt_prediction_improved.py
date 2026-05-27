"""
rt_prediction_improved.py
==========================
Real-time prediction ผ่าน MQTT
- แก้: typo  file_exits → file_exists
- แก้: double inference (predict + predict_proba) → ใช้ proba แล้ว argmax
- เพิ่ม: โหลด feature list จาก metadata (ป้องกัน mismatch)
- เพิ่ม: feature engineering เดียวกับ train
- เพิ่ม: input validation + range check
- เพิ่ม: buffer เขียน CSV ทุก N rows แทนเปิดไฟล์ทุก message
- เพิ่ม: logging แทน print ล้วนๆ
- เพิ่ม: reconnect อัตโนมัติ
- ใช้ CPU (เร็วกว่า GPU สำหรับ inference ทีละ 1 row)
"""

import json
import os
import csv
import sys
import time
import logging
import numpy as np
from xgboost import XGBClassifier
import paho.mqtt.client as mqtt

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
BROKER_HOST = ""          # ← IP ของ MQTT broker
BROKER_PORT = 1883

TOPIC_IN  = ""            # ← topic รับข้อมูล sensor
TOPIC_OUT = ""            # ← topic ส่งผล prediction

MODEL_PATH = r""          # ← path โมเดล .json
META_PATH  = r""          # ← path metadata จาก train (สำคัญ!)
OUTPUT_CSV = r""          # ← path บันทึก CSV ผลลัพธ์

FLUSH_EVERY = 10          # บันทึก CSV ทุกกี่ row (ลด file I/O)
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

LABEL_MAP = {0: "normal", 1: "alert", 2: "alarm"}

# ─── Validate paths ───
def check_file(path: str, label: str):
    if not path:
        log.error(f"กรุณาใส่ {label} ใน CONFIG")
        sys.exit(1)
    if not os.path.isfile(path):
        log.error(f"ไม่พบไฟล์ {label}: {path}")
        sys.exit(1)

check_file(MODEL_PATH, "MODEL_PATH")
check_file(META_PATH,  "META_PATH")

# ─── โหลด metadata → feature list ───
with open(META_PATH, "r", encoding="utf-8") as f:
    train_meta = json.load(f)

FEATURES      = train_meta["features"]
BASE_FEATURES = train_meta.get("base_features", ["temp_c", "humidity_pct", "lux", "vpd_kpa"])
log.info(f"Features ({len(FEATURES)}): {FEATURES}")


# ─── Feature engineering (ต้องเหมือน train/test ทุกอย่าง) ───
def add_features_single(temp, hum, lux, vpd) -> np.ndarray:
    """
    รับค่า sensor ดิบ 4 ตัว คืน array shape (1, n_features)
    ลำดับต้องตรงกับ FEATURES
    """
    heat_index  = temp * (1 + 0.33 * (hum / 100) - 0.55)
    vpd_per_lux = vpd / (lux + 1)
    log_lux     = np.log1p(lux)
    temp_vpd    = temp * vpd

    # สร้าง dict แล้ว reorder ตาม FEATURES
    feat_dict = {
        "temp_c"      : temp,
        "humidity_pct": hum,
        "lux"         : lux,
        "vpd_kpa"     : vpd,
        "heat_index"  : heat_index,
        "vpd_per_lux" : vpd_per_lux,
        "log_lux"     : log_lux,
        "temp_vpd"    : temp_vpd,
    }
    return np.array([[feat_dict[f] for f in FEATURES]], dtype=np.float32)


# ─── โหลด model (ครั้งเดียว) ───
log.info(f"Loading model: {MODEL_PATH}")
model = XGBClassifier()
model.load_model(MODEL_PATH)
log.info("Model loaded ✅")

# ─── CSV buffer ───
_csv_buffer   = []
_csv_fieldnames = None
_csv_initialized = False


def flush_csv():
    global _csv_initialized, _csv_fieldnames
    if not _csv_buffer:
        return
    file_exists = os.path.isfile(OUTPUT_CSV)  # แก้ typo: file_exits → file_exists
    with open(OUTPUT_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=_csv_fieldnames)
        if not file_exists or not _csv_initialized:
            writer.writeheader()
            _csv_initialized = True
        writer.writerows(_csv_buffer)
    _csv_buffer.clear()


def save_prediction_row(data: dict):
    global _csv_fieldnames
    if _csv_fieldnames is None:
        _csv_fieldnames = list(data.keys())
    _csv_buffer.append(data)
    if len(_csv_buffer) >= FLUSH_EVERY:
        flush_csv()
        log.info(f"Flushed {FLUSH_EVERY} rows → {OUTPUT_CSV}")


# ─── Input validation ───
def validate_input(data: dict):
    """คืน (temp, hum, lux, vpd) หรือ raise ValueError"""
    required = {"temp_c": (-10, 60), "humidity_pct": (0, 100), "lux": (0, 100000), "vpd_kpa": (0, 10)}
    vals = {}
    for key, (lo, hi) in required.items():
        val = data.get(key)
        if val is None:
            raise ValueError(f"Missing field: {key}")
        val = float(val)
        if not (lo <= val <= hi):
            raise ValueError(f"{key}={val} out of range [{lo}, {hi}]")
        vals[key] = val
    return vals["temp_c"], vals["humidity_pct"], vals["lux"], vals["vpd_kpa"]


# ─── MQTT callbacks ───
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        log.info("Connected to MQTT broker.")
        client.subscribe(TOPIC_IN)
        log.info(f"Subscribed to: {TOPIC_IN}")
    else:
        log.error(f"Connection failed, rc={rc}")


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode("utf-8"))

        # validate + extract
        temp, hum, lux, vpd = validate_input(data)

        # feature engineering + inference (1 รอบ)
        x_input = add_features_single(temp, hum, lux, vpd)
        y_prob  = model.predict_proba(x_input)[0]   # shape (3,)
        y_pred  = int(np.argmax(y_prob))
        label   = LABEL_MAP.get(y_pred, "unknown")

        # เตรียม output payload
        out = {
            "timestamp"           : str(data.get("timestamp", "")),
            "temp_c"              : temp,
            "humidity_pct"        : hum,
            "lux"                 : lux,
            "vpd_kpa"             : vpd,
            "y_pred"              : y_pred,
            "y_label_pred"        : label,
            "y_pred_prob_normal"  : round(float(y_prob[0]), 4),
            "y_pred_prob_alert"   : round(float(y_prob[1]), 4),
            "y_pred_prob_alarm"   : round(float(y_prob[2]), 4),
        }

        # publish ผล
        if TOPIC_OUT:
            client.publish(TOPIC_OUT, json.dumps(out))

        # บันทึก CSV (buffer)
        if OUTPUT_CSV:
            save_prediction_row(out)

        log.info(f"pred={label} ({y_pred}) | proba={[round(p,3) for p in y_prob]}")

    except ValueError as e:
        log.warning(f"[SKIP] Invalid input: {e}")
    except Exception as e:
        log.error(f"Error in on_message: {e}", exc_info=True)


def on_disconnect(client, userdata, rc, properties=None):
    if rc != 0:
        log.warning(f"Unexpected disconnect rc={rc}. Reconnecting...")


# ─── MAIN ───
def main():
    assert BROKER_HOST, "❌ กรุณาใส่ BROKER_HOST"
    assert TOPIC_IN,    "❌ กรุณาใส่ TOPIC_IN"

    # ใช้ paho v2 API
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        client = mqtt.Client()

    client.on_connect    = on_connect
    client.on_message    = on_message
    client.on_disconnect = on_disconnect

    client.reconnect_delay_set(min_delay=1, max_delay=30)
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)

    log.info("Starting real-time predictor. Ctrl+C to stop.")
    try:
        client.loop_forever()
    except KeyboardInterrupt:
        log.info("Stopping predictor...")
    finally:
        flush_csv()   # flush rows ที่ค้างอยู่ใน buffer
        client.disconnect()
        log.info("Disconnected from MQTT broker.")


if __name__ == "__main__":
    main()
