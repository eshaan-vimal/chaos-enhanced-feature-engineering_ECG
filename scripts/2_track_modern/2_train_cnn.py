import sys
import os
# project root path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import numpy as np
from keras import layers, models, callbacks, optimizers
from sklearn.metrics import classification_report, confusion_matrix
from src.config import PROCESSED_BASE_DIR, MODEL_BASE_DIR, WINDOW_SIZE

DATA_DIR = os.path.join(PROCESSED_BASE_DIR, '2_modern')
SAVE_DIR = os.path.join(MODEL_BASE_DIR, '2_modern')

def build_cnn():
    # CNN model blocks
    model = models.Sequential([
        layers.Input(shape=(WINDOW_SIZE, 1)),
        
        layers.Conv1D(32, 11, activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling1D(2),
        
        layers.Conv1D(64, 7, activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling1D(2),
        
        layers.Conv1D(128, 5, activation='relu', padding='same'),
        layers.BatchNormalization(),
        layers.MaxPooling1D(2),
        
        layers.GlobalAveragePooling1D(),
        
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.4),
        layers.Dense(1, activation='sigmoid')
    ])
    
    # optimized learning rate
    opt = optimizers.Adam(learning_rate=0.0005)
    model.compile(optimizer=opt, loss='binary_crossentropy', metrics=['accuracy'])
    return model

def main():
    os.makedirs(SAVE_DIR, exist_ok=True)
    
    print("Loading Raw Signals...")
    try:
        X_train = np.load(os.path.join(DATA_DIR, 'X_train.npy'))
        y_train = np.load(os.path.join(DATA_DIR, 'y_train.npy'))
        X_test = np.load(os.path.join(DATA_DIR, 'X_test.npy'))
        y_test = np.load(os.path.join(DATA_DIR, 'y_test.npy'))
    except FileNotFoundError:
        print("Run ETL first.")
        return
        
    X_train = X_train.reshape(X_train.shape[0], WINDOW_SIZE, 1)
    X_test = X_test.reshape(X_test.shape[0], WINDOW_SIZE, 1)
    
    # moderate class weights
    class_weight = {0: 1.0, 1: 1.5}
    
    print("Training CNN (High Accuracy Mode)...")
    model = build_cnn()
    
    # training callbacks
    lr_scheduler = callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=0.00001)
    early_stop = callbacks.EarlyStopping(monitor='val_accuracy', patience=5, restore_best_weights=True)
    
    history = model.fit(
        X_train, y_train,
        epochs=20,
        batch_size=64,
        validation_split=0.15,
        class_weight=class_weight,
        callbacks=[early_stop, lr_scheduler],
        verbose=1
    )
    
    print("\n--- MODERN RESULTS (Track 2: CNN) ---")
    y_pred = (model.predict(X_test) > 0.5).astype(int)
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Anomaly']))
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    
    acc = (tp + tn) / (tp + tn + fp + fn)
    print(f"Final Accuracy: {acc*100:.2f}%")
    
    model.save(os.path.join(SAVE_DIR, 'cnn_model.keras'))

if __name__ == "__main__":
    main()
