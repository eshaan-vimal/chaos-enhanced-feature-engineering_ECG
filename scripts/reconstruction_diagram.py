import sys
import os

# project root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, PROJECT_ROOT)

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.gridspec as gridspec
from src.config import RAW_DATA_DIR
from src.data_loader import load_and_segment_record

def plot_transformation():
    rec_id = '100'
    path = os.path.join(RAW_DATA_DIR, rec_id)
    
    print(f"Loading Record {rec_id}...")
    segments, labels = load_and_segment_record(path)
    
    # pick a normal beat
    normal_seg = next(seg for seg, lbl in zip(segments, labels) if lbl == 0)
    
    tau = 10
    
    xs = normal_seg[:-2*tau]
    ys = normal_seg[tau:-tau]
    zs = normal_seg[2*tau:]
    
    fig = plt.figure(figsize=(16, 7), facecolor='white')
    
    # custom layout
    gs = gridspec.GridSpec(1, 2, width_ratios=[1, 1.5], wspace=0.1)

    # time-domain plot
    ax1 = fig.add_subplot(gs[0])
    time_axis = np.arange(len(normal_seg))
    ax1.plot(time_axis, normal_seg, color='#2c3e50', lw=1.2)
    
    peak_idx = np.argmax(normal_seg) - 20
    p1_idx = peak_idx
    p2_idx = peak_idx + tau
    p3_idx = peak_idx + 2*tau
    
    ax1.scatter([p1_idx], [normal_seg[p1_idx]], color='#F1C338', s=80)
    ax1.scatter([p2_idx], [normal_seg[p2_idx]], color='#2ecc71', s=80)
    ax1.scatter([p3_idx], [normal_seg[p3_idx]], color='#3498db', s=80)
    
    ax1.set_title("Time Domain Representation\n(Raw Signal)",
                  fontsize=12, fontweight='bold', pad=15)
    ax1.set_xlabel("Time (Samples)", fontsize=10)
    ax1.set_ylabel("Voltage (mV)", fontsize=10)
    ax1.grid(True, alpha=0.2, linestyle='--')
    ax1.legend(['ECG Signal', 'x(t)', 'x(t+τ)', 'x(t+2τ)'], fontsize=9)
    ax1.set_xlim(0, 600)

    # phase-space reconstruction
    ax2 = fig.add_subplot(gs[1], projection='3d')
    ax2.plot(xs, ys, zs, lw=0.6, color='red', alpha=0.5)
    
    vec_x = normal_seg[p1_idx]
    vec_y = normal_seg[p2_idx]
    vec_z = normal_seg[p3_idx]
    
    ax2.scatter([vec_x], [vec_y], [vec_z], color='magenta', s=100, marker='o')
    
    ax2.set_title("Phase Space Reconstruction\n(Unfolded Manifold)",
                  fontsize=12, fontweight='bold', pad=15)
    ax2.set_xlabel('x(t)', fontsize=9, labelpad=5, color='#F1C338')
    ax2.set_ylabel('x(t+τ)', fontsize=9, labelpad=5, color='#2ecc71')
    ax2.set_zlabel('x(t+2τ)', fontsize=9, labelpad=5, color='#3498db')
    
    ax2.view_init(elev=25, azim=45)

    save_dir = os.path.join(PROJECT_ROOT, 'models', 'final_charts')
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, 'reconstruction_diagram.png')
    
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"Saved explanation chart to {save_path}")
    plt.show()

if __name__ == "__main__":
    plot_transformation()
