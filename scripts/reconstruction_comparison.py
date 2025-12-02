import sys
import os
# project root path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from src.config import RAW_DATA_DIR
from src.data_loader import load_and_segment_record

def plot_phase_space():
    rec_id = '222'
    path = os.path.join(RAW_DATA_DIR, rec_id)
    
    print(f"Loading Record {rec_id} for visualization...")
    segments, labels = load_and_segment_record(path)
    
    # pick one normal and one anomaly beat
    normal_seg = next(seg for seg, lbl in zip(segments, labels) if lbl == 0)
    anom_seg   = next(seg for seg, lbl in zip(segments, labels) if lbl == 1)
    
    tau = 10
    
    fig = plt.figure(figsize=(14, 6), facecolor='white')
    
    # normal attractor
    ax1 = fig.add_subplot(121, projection='3d')
    xs_n = normal_seg[:-2*tau]
    ys_n = normal_seg[tau:-tau]
    zs_n = normal_seg[2*tau:]
    
    ax1.plot(xs_n, ys_n, zs_n, lw=0.8, color='#2E5EAA', alpha=0.8)
    ax1.set_title("Normal Sinus Rhythm\n(Stable Attractor)",
                  fontsize=13, fontweight='bold', pad=15)
    ax1.view_init(elev=15, azim=45)
    ax1.set_xlabel('x(t)', fontsize=9, labelpad=8)
    ax1.set_ylabel('x(t+τ)', fontsize=9, labelpad=8)
    ax1.set_zlabel('x(t+2τ)', fontsize=9, labelpad=8)
    ax1.tick_params(labelsize=7)
    
    max_range = np.array([
        xs_n.max()-xs_n.min(),
        ys_n.max()-ys_n.min(),
        zs_n.max()-zs_n.min()
    ]).max() / 2.0
    mid_x = (xs_n.max()+xs_n.min()) * 0.5
    mid_y = (ys_n.max()+ys_n.min()) * 0.5
    mid_z = (zs_n.max()+zs_n.min()) * 0.5
    ax1.set_xlim(mid_x - max_range, mid_x + max_range)
    ax1.set_ylim(mid_y - max_range, mid_y + max_range)
    ax1.set_zlim(mid_z - max_range, mid_z + max_range)
    
    # arrhythmia attractor
    ax2 = fig.add_subplot(122, projection='3d')
    xs_a = anom_seg[:-2*tau]
    ys_a = anom_seg[tau:-tau]
    zs_a = anom_seg[2*tau:]
    
    ax2.plot(xs_a, ys_a, zs_a, lw=0.8, color='#C41E3A', alpha=0.8)
    ax2.set_title("Ventricular Ectopic Beat\n(Chaotic Disruption)",
                  fontsize=13, fontweight='bold', pad=15)
    ax2.view_init(elev=15, azim=45)
    ax2.set_xlabel('x(t)', fontsize=9, labelpad=8)
    ax2.set_ylabel('x(t+τ)', fontsize=9, labelpad=8)
    ax2.set_zlabel('x(t+2τ)', fontsize=9, labelpad=8)
    ax2.tick_params(labelsize=7)
    
    max_range_a = np.array([
        xs_a.max()-xs_a.min(),
        ys_a.max()-ys_a.min(),
        zs_a.max()-zs_a.min()
    ]).max() / 2.0
    mid_x_a = (xs_a.max()+xs_a.min()) * 0.5
    mid_y_a = (ys_a.max()+ys_a.min()) * 0.5
    mid_z_a = (zs_a.max()+zs_a.min()) * 0.5
    ax2.set_xlim(mid_x_a - max_range_a, mid_x_a + max_range_a)
    ax2.set_ylim(mid_y_a - max_range_a, mid_y_a + max_range_a)
    ax2.set_zlim(mid_z_a - max_range_a, mid_z_a + max_range_a)
    
    plt.subplots_adjust(wspace=0.05, left=0.05, right=0.95)
    
    save_path = 'models/final_charts/reconstruction_comparison.png'
    plt.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')
    print(f"Saved {save_path}")
    plt.show()

if __name__ == "__main__":
    plot_phase_space()
