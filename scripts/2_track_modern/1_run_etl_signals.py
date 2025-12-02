import sys
import os
# project root path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import glob
import wfdb
import numpy as np
from tqdm import tqdm
from multiprocessing import Pool
from sklearn.model_selection import train_test_split
from src.config import RAW_DATA_DIR, PROCESSED_BASE_DIR, TEST_SPLIT_RATIO, RANDOM_SEED, NUM_CORES, WINDOW_SIZE
from src.data_loader import denoise_signal

OUTPUT_DIR = os.path.join(PROCESSED_BASE_DIR, '2_modern')

def worker(record_id):
    path = os.path.join(RAW_DATA_DIR, record_id)
    try:
        record = wfdb.rdrecord(path)
        signal = record.p_signal[:, 0]
        annot = wfdb.rdann(path, 'atr')
        clean_sig = denoise_signal(signal)
        
        segments = []
        labels = []
        norm_sym = ['N', 'L', 'R', 'e', 'j']
        half_win = WINDOW_SIZE // 2
        
        # extract heartbeat windows + labels
        for r, lbl in zip(annot.sample, annot.symbol):
            if lbl in ['[', ']', '!', 'x', '|', '~', '+', '"', 'p', 't', 'u', '`', '\'', '^', 's', 'k', 'l']:
                continue
            # skip if window goes out of bounds
            if r - half_win < 0 or r + half_win >= len(clean_sig):
                continue
            seg = clean_sig[r - half_win : r + half_win]
            # remove extreme artifacts
            if np.max(np.abs(seg)) > 5.0:
                continue
            segments.append(seg)
            labels.append(0 if lbl in norm_sym else 1)
            
        return segments, labels
    except Exception:
        return [], []

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    files = glob.glob(os.path.join(RAW_DATA_DIR, "*.dat"))
    ids = list(set([os.path.basename(f).split('.')[0] for f in files]))
    
    print(f"--- Track 2 ETL (High Score Mode) ---")
    # parallel extraction
    with Pool(processes=NUM_CORES) as pool:
        results = list(tqdm(pool.imap(worker, ids), total=len(ids)))
    
    all_segs = []
    all_lbls = []
    for segs, lbls in results:
        all_segs.extend(segs)
        all_lbls.extend(lbls)
        
    X = np.array(all_segs)
    y = np.array(all_lbls)
    
    # stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SPLIT_RATIO, random_state=RANDOM_SEED, stratify=y
    )
    
    np.save(os.path.join(OUTPUT_DIR, 'X_train.npy'), X_train)
    np.save(os.path.join(OUTPUT_DIR, 'y_train.npy'), y_train)
    np.save(os.path.join(OUTPUT_DIR, 'X_test.npy'), X_test)
    np.save(os.path.join(OUTPUT_DIR, 'y_test.npy'), y_test)
    print("Done.")

if __name__ == "__main__":
    main()
