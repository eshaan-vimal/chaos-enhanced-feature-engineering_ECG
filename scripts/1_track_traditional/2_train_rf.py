import sys
import os
# add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pandas as pd
import joblib
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
from imblearn.over_sampling import SMOTE
from src.config import PROCESSED_BASE_DIR, MODEL_BASE_DIR, RANDOM_SEED

# paths for Track 1
DATA_DIR = os.path.join(PROCESSED_BASE_DIR, '1_traditional')
SAVE_DIR = os.path.join(MODEL_BASE_DIR, '1_traditional')

def main():
    os.makedirs(SAVE_DIR, exist_ok=True)
    
    print(f"--- Track 1: Training Random Forest (Baseline) ---")
    print(f"Loading data from: {DATA_DIR}")
    
    try:
        train = pd.read_csv(os.path.join(DATA_DIR, 'train.csv'))
        test = pd.read_csv(os.path.join(DATA_DIR, 'test.csv'))
    except FileNotFoundError:
        print("Error: Data not found. Run 1_run_etl.py first.")
        return

    # features vs labels (remove PatientID to prevent leakage)
    X_train = train.drop(['Label', 'PatientID'], axis=1)
    y_train = train['Label']
    
    X_test = test.drop(['Label', 'PatientID'], axis=1)
    y_test = test['Label']
    
    # scale features
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    
    # balance training set
    print("Applying SMOTE...")
    smote = SMOTE(random_state=RANDOM_SEED)
    X_res, y_res = smote.fit_resample(X_train_s, y_train)
    
    # train model
    print("Training Random Forest...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        n_jobs=-1,
        random_state=RANDOM_SEED
    )
    model.fit(X_res, y_res)
    
    # evaluate
    print("\n--- BASELINE RESULTS (Track 1: Traditional) ---")
    y_pred = model.predict(X_test_s)
    
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Anomaly']))
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    
    sensitivity = tp / (tp + fn)
    specificity = tn / (tn + fp)
    print(f"Sensitivity (Recall): {sensitivity:.4f}")
    print(f"Specificity:          {specificity:.4f}")
    
    # save model + scaler
    joblib.dump(model, os.path.join(SAVE_DIR, 'rf_model.pkl'))
    joblib.dump(scaler, os.path.join(SAVE_DIR, 'scaler.pkl'))
    print(f"Model saved to {SAVE_DIR}")

if __name__ == "__main__":
    main()