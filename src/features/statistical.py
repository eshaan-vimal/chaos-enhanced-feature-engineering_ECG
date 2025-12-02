import numpy as np

def get_rr_interval_features(r_peaks, signal):
    features = []
    valid_indices = []
    
    rr_diffs = np.diff(r_peaks)
    
    if len(r_peaks) < 15:
        return [], []

    for i in range(5, len(r_peaks) - 5):
        try:
            current_idx = r_peaks[i]
            
            pre_rr = r_peaks[i] - r_peaks[i-1]
            post_rr = r_peaks[i+1] - r_peaks[i]
            local_rr = np.mean(rr_diffs[i-10:i]) if i >= 10 else np.mean(rr_diffs[:i])
            
            amp = signal[current_idx] if current_idx < len(signal) else 0
            
            features.append([pre_rr, post_rr, local_rr, amp])
            valid_indices.append(i)
            
        except IndexError:
            continue
            
    return features, valid_indices