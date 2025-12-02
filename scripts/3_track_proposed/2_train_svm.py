import sys
import os
# add project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pandas as pd
import joblib
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
from imblearn.over_sampling import SMOTE
from src.config import PROCESSED_BASE_DIR, MODEL_BASE_DIR, RANDOM_SEED

DATA_DIR = os.path.join(PROCESSED_BASE_DIR, '3_proposed_combined')
SAVE_DIR = os.path.join(MODEL_BASE_DIR, '3_proposed_svm')

def main():
    os.makedirs(SAVE_DIR, exist_ok=True)
    print(f"--- Track 3: Training SVM (Physics + Stats) ---")
    
    # load data
    train = pd.read_csv(os.path.join(DATA_DIR, 'train.csv'))
    test = pd.read_csv(os.path.join(DATA_DIR, 'test.csv'))
    
    X_train = train.drop(['Label', 'PatientID'], axis=1, errors='ignore')
    y_train = train['Label']
    X_test = test.drop(['Label', 'PatientID'], axis=1, errors='ignore')
    y_test = test['Label']
    
    # scale features (required for SVM)
    print("Scaling Features...")
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    
    # balance dataset
    print("Applying SMOTE...")
    smote = SMOTE(random_state=RANDOM_SEED)
    X_res, y_res = smote.fit_resample(X_train_s, y_train)
    
    # train model
    print("Training SVM (RBF Kernel)...")
    model = SVC(kernel='rbf', C=1.0, probability=True, random_state=RANDOM_SEED, cache_size=1000)
    model.fit(X_res, y_res)
    
    # evaluate
    print("\n--- RESULTS (SVM) ---")
    y_pred = model.predict(X_test_s)
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Anomaly']))
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    acc = (tp + tn) / (tp + tn + fp + fn)
    sens = tp / (tp + fn)
    
    print(f"Final Accuracy: {acc*100:.2f}%")
    print(f"Sensitivity:    {sens:.4f}")
    
    joblib.dump(model, os.path.join(SAVE_DIR, 'svm_model.pkl'))

if __name__ == "__main__":
    main()
