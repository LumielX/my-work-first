"""
train_model_improved.py
========================
Train XGBoost classifier สำหรับ plant environment classification
- เพิ่ม: StratifiedKFold cross-validation (ไม่ใช้ train score ล้วนๆ)
- เพิ่ม: จัดการ class imbalance ด้วย scale_pos_weight + class_weight
- เพิ่ม: feature engineering (derived features)
- เพิ่ม: early stopping บน validation set
- เพิ่ม: บันทึก feature list ใน metadata (ป้องกัน mismatch)
- เพิ่ม: random seed ครบ
- ปรับ: hyperparameter ให้เหมาะกับ i5 Gen14 / 16GB RAM
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import f1_score, accuracy_score, classification_report
from sklearn.utils.class_weight import compute_sample_weight

warnings.filterwarnings("ignore", category=UserWarning)

# ─────────────────────────────────────────────
# CONFIG — แก้ path ตรงนี้
# ─────────────────────────────────────────────
TRAIN_CSV = r""   # ← ใส่ path CSV ที่ได้จาก subscriber
MODEL_OUT = r""   # ← ใส่ path บันทึกโมเดล เช่น r"C:\...\model.json"
META_OUT  = r""   # ← ใส่ path metadata เช่น r"C:\...\model_meta.json"

BASE_FEATURES = ["temp_c", "humidity_pct", "lux", "vpd_kpa"]
TARGET        = "y"
LABELS        = [0, 1, 2]
SEED          = 42
N_SPLITS      = 5     # จำนวน fold สำหรับ cross-validation
# ─────────────────────────────────────────────


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature engineering — สร้าง derived features
    ทุก feature ที่เพิ่มตรงนี้ต้องทำซ้ำใน rt_prediction ด้วย
    """
    df = df.copy()
    # อุณหภูมิสัมพัทธ์กับ humidity
    df["heat_index"] = df["temp_c"] * (1 + 0.33 * (df["humidity_pct"] / 100) - 0.55)
    # VPD ต่อ lux (สัดส่วนความเครียดของน้ำเทียบแสง)
    df["vpd_per_lux"] = df["vpd_kpa"] / (df["lux"] + 1)
    # log lux (ลด skewness ของแสง)
    df["log_lux"] = np.log1p(df["lux"])
    # temp × vpd (interaction)
    df["temp_vpd"] = df["temp_c"] * df["vpd_kpa"]
    return df


def get_features(df: pd.DataFrame) -> list:
    """คืน feature columns ทั้งหมด (base + engineered)"""
    df_tmp = add_features(df.head(1))
    return [c for c in df_tmp.columns if c not in [TARGET, "timestamp", "y_label"]]


def validate_paths():
    assert TRAIN_CSV, "❌ กรุณาใส่ TRAIN_CSV path"
    assert MODEL_OUT, "❌ กรุณาใส่ MODEL_OUT path"
    assert META_OUT,  "❌ กรุณาใส่ META_OUT path"
    assert os.path.isfile(TRAIN_CSV), f"❌ ไม่พบไฟล์: {TRAIN_CSV}"
    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
validate_paths()

# โหลดข้อมูล
print("📂 Loading data...")
df = pd.read_csv(TRAIN_CSV)
df = df.dropna(subset=BASE_FEATURES + [TARGET])
df = df.drop_duplicates(subset=["timestamp"] if "timestamp" in df.columns else BASE_FEATURES)
df[TARGET] = df[TARGET].astype(int)

print(f"Total samples after clean: {len(df)}")
print("Class distribution:")
print(df[TARGET].value_counts().sort_index())

# Feature engineering
df = add_features(df)
FEATURES = get_features(df)
print(f"\nFeatures ({len(FEATURES)}): {FEATURES}")

X = df[FEATURES].values.astype(np.float32)
y = df[TARGET].values

# class weight สำหรับชดเชย imbalance
sample_weights = compute_sample_weight(class_weight="balanced", y=y)

# คำนวณ scale_pos_weight สำหรับ XGBoost (ใช้กับ class minority)
class_counts = np.bincount(y)
# สำหรับ multiclass ใช้ sample_weight แทน scale_pos_weight
print(f"\nClass counts: {dict(enumerate(class_counts))}")

# Train / Validation split (20% validation สำหรับ early stopping)
X_tr, X_val, y_tr, y_val, sw_tr, _ = train_test_split(
    X, y, sample_weights,
    test_size=0.2, random_state=SEED, stratify=y
)

# ─────────────────────────────────────────────
# XGBoost model
# ─────────────────────────────────────────────
model = XGBClassifier(
    n_estimators=500,           # เพิ่มจาก 200 → 500 (early stopping จะหยุดเอง)
    max_depth=5,                # เพิ่มจาก 4 → 5 เล็กน้อย
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,         # ป้องกัน overfitting บน minority class
    gamma=0.1,                  # ป้องกัน overfitting
    reg_alpha=0.1,              # L1
    reg_lambda=1.0,             # L2
    objective="multi:softprob",
    num_class=3,
    tree_method="hist",         # เร็วที่สุดบน CPU
    device="cpu",               # RTX 5050 ยังไม่รองรับ XGBoost CUDA ใน Windows ทุกเวอร์ชัน
    eval_metric="mlogloss",
    random_state=SEED,
    n_jobs=-1,                  # ใช้ทุก core ของ i5 Gen14
    verbosity=0,
)

print("\n🚀 Training...")
model.fit(
    X_tr, y_tr,
    sample_weight=sw_tr,
    eval_set=[(X_val, y_val)],
    verbose=50,                 # แสดงทุก 50 round
    early_stopping_rounds=30,   # หยุดถ้าไม่ดีขึ้น 30 round ติดกัน
)

best_round = model.best_iteration
print(f"\n✅ Best round: {best_round}")

# ─────────────────────────────────────────────
# Cross-validation (5-fold) — ดู generalization
# ─────────────────────────────────────────────
print("\n📊 5-Fold Stratified Cross-Validation...")
skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)
cv_scores = []

for fold, (tr_idx, val_idx) in enumerate(skf.split(X, y)):
    xf_tr, xf_val = X[tr_idx], X[val_idx]
    yf_tr, yf_val = y[tr_idx], y[val_idx]
    sw_fold = compute_sample_weight("balanced", yf_tr)

    m_fold = XGBClassifier(
        n_estimators=best_round if best_round > 0 else 200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="multi:softprob",
        num_class=3,
        tree_method="hist",
        device="cpu",
        eval_metric="mlogloss",
        random_state=SEED,
        n_jobs=-1,
        verbosity=0,
    )
    m_fold.fit(xf_tr, yf_tr, sample_weight=sw_fold, verbose=False)
    preds = m_fold.predict(xf_val)
    score = f1_score(yf_val, preds, average="macro", labels=LABELS, zero_division=0)
    cv_scores.append(score)
    print(f"  Fold {fold+1}: Macro-F1 = {score:.4f}")

print(f"\nCV Macro-F1: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")

# ─────────────────────────────────────────────
# Final evaluation บน validation set
# ─────────────────────────────────────────────
val_pred = model.predict(X_val)
val_f1   = f1_score(y_val, val_pred, average="macro", labels=LABELS, zero_division=0)
val_acc  = accuracy_score(y_val, val_pred)

print(f"\nValidation Accuracy : {val_acc:.4f}")
print(f"Validation Macro-F1 : {val_f1:.4f}")
print("\nClassification Report (Validation):")
print(classification_report(y_val, val_pred, labels=LABELS, zero_division=0))

# ─────────────────────────────────────────────
# บันทึก model + metadata
# ─────────────────────────────────────────────
model.save_model(MODEL_OUT)

meta = {
    "features"         : FEATURES,
    "base_features"    : BASE_FEATURES,
    "labels"           : LABELS,
    "seed"             : SEED,
    "total_samples"    : int(len(y)),
    "best_round"       : int(best_round) if best_round else None,
    "cv_macro_f1_mean" : float(np.mean(cv_scores)),
    "cv_macro_f1_std"  : float(np.std(cv_scores)),
    "val_macro_f1"     : float(val_f1),
    "val_accuracy"     : float(val_acc),
    "class_distribution": {str(k): int(v) for k, v in enumerate(class_counts)},
    "model_params"     : model.get_params(),
}

with open(META_OUT, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2, ensure_ascii=False)

print(f"\n✅ Model saved → {MODEL_OUT}")
print(f"🧾 Metadata saved → {META_OUT}")
print("\n⚠️  Feature list ที่ใช้ (ต้องตรงกับ test และ rt_prediction):")
for i, feat in enumerate(FEATURES):
    print(f"   {i}: {feat}")
