import numpy as np
import nolds
import antropy as ant
from scipy.spatial.distance import pdist, squareform
import warnings

# suppress noisy warnings
warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)

def calculate_rqa_metrics(signal, dim=3, tau=2, threshold_factor=0.1):
    N = len(signal)
    if N < dim * tau:
        return [0., 0., 0.]
    
    # phase space
    phase_space = np.array([signal[i: i + dim*tau : tau] 
                            for i in range(N - (dim - 1) * tau)])
    
    # distance matrix
    dists = pdist(phase_space, metric='euclidean')
    
    # recurrence plot
    threshold = threshold_factor * np.std(signal)
    rec_plot = (squareform(dists) <= threshold).astype(int)
    if rec_plot.shape[0] == 0:
        return [0., 0., 0.]
    
    # RR
    rr = np.sum(rec_plot) / (rec_plot.shape[0] ** 2)
    
    # DET
    diagonals = [np.trace(rec_plot, offset=k) for k in range(1, rec_plot.shape[0])]
    det = np.mean([d for d in diagonals if d > 2]) if any(d > 2 for d in diagonals) else 0
    
    # LAM
    verticals = np.sum(rec_plot, axis=0)
    lam = np.mean(verticals[verticals > 2]) if any(verticals > 2) else 0
    
    return [rr, det, lam]

def extract_chaos_features(segment):
    try:
        segment = np.ascontiguousarray(segment, dtype=np.float64)
        
        lle = nolds.lyap_r(segment, emb_dim=3, lag=1, min_tsep=None)
        fd = ant.higuchi_fd(segment, kmax=10)
        sampen = ant.sample_entropy(segment)
        
        rqa = calculate_rqa_metrics(segment)
        
        feats = [lle, fd, sampen] + rqa
        
        return [0.0 if np.isnan(x) or np.isinf(x) else x for x in feats]
        
    except Exception:
        return [0.0] * 6
