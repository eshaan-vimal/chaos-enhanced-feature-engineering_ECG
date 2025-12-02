import wfdb
import numpy as np
from scipy.signal import butter, filtfilt
from src.config import FS, WINDOW_SIZE

def denoise_signal(data):
    low, high = 0.5, 50.0
    nyq = 0.5 * FS
    b, a = butter(1, [low/nyq, high/nyq], btype='band')
    return filtfilt(b, a, data)

def load_and_segment_record(record_path):
    try:
        record = wfdb.rdrecord(record_path)
        signal = record.p_signal[:, 0]
        annotation = wfdb.rdann(record_path, 'atr')
        
        clean_sig = denoise_signal(signal)
        
        segments = []
        labels = []
        
        norm_sym = ['N', 'L', 'R', 'e', 'j']
        half_win = WINDOW_SIZE // 2
        
        for r, lbl in zip(annotation.sample, annotation.symbol):
            if lbl in ['[', ']', '!', 'x', '|', '~', '+', '"', 'p', 't', 'u',
                       '`', '\'', '^', 's', 'k', 'l']:
                continue
            
            if r - half_win < 0 or r + half_win >= len(clean_sig):
                continue
            
            seg = clean_sig[r - half_win : r + half_win]
            
            if np.max(np.abs(seg)) > 5.0:
                continue
            
            segments.append(seg)
            labels.append(0 if lbl in norm_sym else 1)
            
        return segments, labels
        
    except Exception as e:
        print(f"Error processing {record_path}: {e}")
        return [], []
