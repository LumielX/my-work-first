"""
test_model_improved.py
=======================
ประเมิน XGBoost model บน test set
- แก้: ใส่ zero_division=0 เพื่อกำจัด UndefinedMetricWarning
- เพิ่ม: โหลด feature list จาก metadata (ป้องกัน feature mismatch)
- เพิ่ม: feature engineering เดียวกับ train
- เพิ่ม: error handling สำหรับ file/model ไม่พบ
- เพิ่ม: วิเคราะห์ error (row ที่พลาด)
- เพิ่ม: แสดง feature importance
"""

import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import (
    f1_score, accuracy_score,
    classification_report, confusion_matrix,
)

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
TEST_CSV      = r""   # ← path CSV test
MODEL_IN      = r""   # ← path โมเดล (.json)
META_IN       = r""   # ← path metadata จาก train (สำคัญ — ใช้ feature list)
META_OUT_JSON = r""   # ← path บันทึกผล test (.json)
META_OUT_CSV  = r""   # ← path บันทึกผล test (.csv)

TARGET = "y"
LABELS = [0, 1, 2]
# ─────────────────────────────────────────────


# ─── Feature engineering (ต้องเหมือนกับ train ทุกอย่าง) ───
def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["heat_index"]  = df["temp_c"] * (1 + 0.33 * (df["humidity_pct"] / 100) - 0.55)
    df["vpd_per_lux"] = df["vpd_kpa"] / (df["lux"] + 1)
    df["log_lux"]     = np.log1p(df["lux"])
    df["temp_vpd"]    = df["temp_c"] * df["vpd_kpa"]
    return df


# ─── Validate paths ───
def check_file(path: str, label: str):
    if not path:
        print(f"❌ กรุณาใส่ {label} ใน CONFIG")
        sys.exit(1)
    if not os.path.isfile(path):
        print(f"❌ ไม่พบไฟล์ {label}: {path}")
        sys.exit(1)

check_file(TEST_CSV, "TEST_CSV")
check_file(MODEL_IN, "MODEL_IN")
check_file(META_IN,  "META_IN")

# ─── โหลด metadata → ได้ feature list จาก train ───
with open(META_IN, "r", encoding="utf-8") as f:
    train_meta = json.load(f)

FEATURES = train_meta["features"]
print(f"✅ Feature list จาก train ({len(FEATURES)} features):")
for i, feat in enumerate(FEATURES):
    print(f"   {i}: {feat}")

# ─── โหลด test data ───
print(f"\n📂 Loading test data: {TEST_CSV}")
test_df = pd.read_csv(TEST_CSV)
print(f"Raw rows: {len(test_df)}")

base_features = train_meta.get("base_features", ["temp_c", "humidity_pct", "lux", "vpd_kpa"])
test_df = test_df.dropna(subset=base_features + [TARGET])
test_df[TARGET] = test_df[TARGET].astype(int)

# feature engineering
test_df = add_features(test_df)

# ตรวจ feature ครบไหม
missing_cols = [f for f in FEATURES if f not in test_df.columns]
if missing_cols:
    print(f"❌ Test data ขาด feature: {missing_cols}")
    sys.exit(1)

X_test = test_df[FEATURES].values.astype(np.float32)
y_test = test_df[TARGET].values

print(f"Test samples: {len(y_test)}")
print("Test class distribution:")
print(pd.Series(y_test).value_counts().sort_index())

# ─── โหลด model ───
print(f"\n📦 Loading model: {MODEL_IN}")
model = XGBClassifier()
model.load_model(MODEL_IN)

# ─── Predict ───
y_prob = model.predict_proba(X_test)   # [n, 3]
y_pred = np.argmax(y_prob, axis=1)    # ใช้ proba แทน predict() → 1 รอบ inference

# ─── Metrics ───
test_f1  = f1_score(y_test, y_pred, average="macro", labels=LABELS, zero_division=0)
test_acc = accuracy_score(y_test, y_pred)
conf_mat = confusion_matrix(y_test, y_pred, labels=LABELS).tolist()
cls_report = classification_report(
    y_test, y_pred, labels=LABELS, digits=4,
    output_dict=True, zero_division=0
)

print(f"\n{'='*45}")
print(f"TEST PERFORMANCE (Never-seen data)")
print(f"{'='*45}")
print(f"Accuracy : {test_acc:.4f}")
print(f"Macro-F1 : {test_f1:.4f}")
print(f"\nConfusion matrix (rows=actual, cols=predicted):")
print(f"         pred0  pred1  pred2")
for i, row in enumerate(conf_mat):
    print(f"actual{i}   {row}")
print(f"\nClassification Report:")
print(classification_report(y_test, y_pred, labels=LABELS, zero_division=0))

# ─── Error analysis — แสดง row ที่ predict ผิด ───
error_mask = y_pred != y_test
if error_mask.sum() > 0:
    print(f"\n🔍 Error analysis ({error_mask.sum()} misclassified rows):")
    err_df = test_df[error_mask].copy()
    err_df["y_pred"] = y_pred[error_mask]
    err_df["y_actual"] = y_test[error_mask]
    print(err_df[[*base_features, TARGET, "y_pred"]].to_string(index=False))
else:
    print("\n🎉 Perfect prediction on test set!")

# ─── Feature importance ───
fi = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
print("\n📊 Feature Importance (top 10):")
print(fi.head(10).to_string())

# ─── บันทึก metadata ───
if META_OUT_JSON:
    os.makedirs(os.path.dirname(META_OUT_JSON) or ".", exist_ok=True)
    metadata = {
        "test_samples"           : int(len(y_test)),
        "test_class_distribution": {str(k): int(v) for k, v in pd.Series(y_test).value_counts().items()},
        "accuracy"               : round(float(test_acc), 4),
        "macro_f1"               : round(float(test_f1), 4),
        "confusion_matrix"       : conf_mat,
        "classification_report"  : cls_report,
        "features_used"          : FEATURES,
    }
    with open(META_OUT_JSON, "w", encoding="utf-8") as jf:
        json.dump(metadata, jf, indent=4, ensure_ascii=False)
    print(f"\n💾 Test metadata → {META_OUT_JSON}")

if META_OUT_CSV:
    pd.DataFrame(cls_report).transpose().to_csv(META_OUT_CSV, index=True)
    print(f"💾 Test report → {META_OUT_CSV}")
