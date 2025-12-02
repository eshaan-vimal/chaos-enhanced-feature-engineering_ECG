import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import glob
import pandas as pd
from multiprocessing import Pool
from tqdm import tqdm
from sklearn.model_selection import train_test_split
from src.config import RAW_DATA_DIR, PROCESSED_BASE_DIR, NUM_CORES, TEST_SPLIT_RATIO, RANDOM_SEED
from src.data_loader import denoise_signal
from src.features.statistical import get_rr_interval_features
import wfdb

OUTPUT_DIR = os.path.join(PROCESSED_BASE_DIR, '1_traditional')

def worker(record_id):
    path = os.path.join(RAW_DATA_DIR, record_id)
    try:
        record = wfdb.rdrecord(path)
        signal = record.p_signal[:, 0]
        annot = wfdb.rdann(path, 'atr')
        
        # extract clean ECG + RR interval features
        clean_sig = denoise_signal(signal)
        feats, indices = get_rr_interval_features(annot.sample, clean_sig)
        
        data = []
        norm_sym = ['N', 'L', 'R', 'e', 'j']
        
        # map symbols → labels and collect feature rows
        for i, idx in enumerate(indices):
            lbl = annot.symbol[idx]
            if lbl in ['[', ']', '!', 'x', '|', '~', '+', '"', 'p', 't', 'u', '`', '\'', '^', 's', 'k', 'l']:
                continue
            label = 0 if lbl in norm_sym else 1
            data.append(feats[i] + [label, record_id])
            
        return data
    except Exception:
        return []

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    files = glob.glob(os.path.join(RAW_DATA_DIR, "*.dat"))
    ids = list(set([os.path.basename(f).split('.')[0] for f in files]))
    
    print(f"--- Track 1 ETL (High Score Mode) ---")
    # parallel processing of all records
    with Pool(processes=NUM_CORES) as pool:
        results = list(tqdm(pool.imap(worker, ids), total=len(ids)))
    
    flat_data = [item for sublist in results for item in sublist]
    cols = ['Pre_RR', 'Post_RR', 'Local_RR', 'Amplitude', 'Label', 'PatientID']
    df = pd.DataFrame(flat_data, columns=cols)
    
    # stratified split
    X_train, X_test = train_test_split(
        df, test_size=TEST_SPLIT_RATIO, random_state=RANDOM_SEED, stratify=df['Label']
    )
    
    X_train.to_csv(os.path.join(OUTPUT_DIR, 'train.csv'), index=False)
    X_test.to_csv(os.path.join(OUTPUT_DIR, 'test.csv'), index=False)
    print("Done.")

if __name__ == "__main__":
    main()
