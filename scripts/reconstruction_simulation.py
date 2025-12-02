import sys
import os

# project root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, PROJECT_ROOT)

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.gridspec as gridspec
import matplotlib.animation as animation
from src.config import RAW_DATA_DIR
from src.data_loader import load_and_segment_record

# configuration
REC_ID = '100'
WINDOW_START = 0
WINDOW_END = 800
ANIMATION_SPEED = 5
TAU = 10

def run_simulation():
    path = os.path.join(RAW_DATA_DIR, REC_ID)
    print(f"Loading Record {REC_ID}...")
    segments, labels = load_and_segment_record(path)
    
    if not segments:
        print("Error: No data found.")
        return

    # prefer anomaly, fallback to normal
    try:
        seg = next(s for s, l in zip(segments, labels) if l == 1)
        print("Visualizing: Ventricular Ectopic Beat (Anomaly)")
    except StopIteration:
        seg = segments[0]
        print("Visualizing: Normal Sinus Rhythm")

    data = seg[WINDOW_START:WINDOW_END]
    
    valid_len = len(data) - 2 * TAU
    xs = data[:valid_len]
    ys = data[TAU : valid_len + TAU]
    zs = data[2*TAU : valid_len + 2*TAU]

    fig = plt.figure(figsize=(16, 8), facecolor='white')
    gs = gridspec.GridSpec(1, 2, width_ratios=[1, 1.2], wspace=0.1)

    # left: time-domain
    ax1 = fig.add_subplot(gs[0])
    ax1.set_title(f"Live ECG Signal (Patient {REC_ID})", fontsize=14, fontweight='bold')
    ax1.set_xlabel("Time (Samples)")
    ax1.set_ylabel("Voltage (mV)")
    ax1.set_xlim(0, len(data))
    ax1.set_ylim(np.min(data), np.max(data))
    ax1.grid(True, alpha=0.3, linestyle='--')
    
    ax1.plot(np.arange(len(data)), data, color='#2c3e50', alpha=0.3, lw=1)
    
    line1, = ax1.plot([], [], color='#2c3e50', lw=2)
    pt1, = ax1.plot([], [], 'o', color='#F1C338', markersize=10, label='x(t)', zorder=10)
    pt2, = ax1.plot([], [], 'o', color='#2ecc71', markersize=10, label='x(t+τ)', zorder=10)
    pt3, = ax1.plot([], [], 'o', color='#3498db', markersize=10, label='x(t+2τ)', zorder=10)
    ax1.legend(loc='upper right')

    # right: phase space
    ax2 = fig.add_subplot(gs[1], projection='3d')
    ax2.set_title("Phase Space Trajectory", fontsize=14, fontweight='bold')
    ax2.set_xlabel("x(t)", color='#F1C338', fontweight='bold')
    ax2.set_ylabel("x(t+τ)", color='#2ecc71', fontweight='bold')
    ax2.set_zlabel("x(t+2τ)", color='#3498db', fontweight='bold')
    
    ax2.set_xlim(np.min(xs), np.max(xs))
    ax2.set_ylim(np.min(ys), np.max(ys))
    ax2.set_zlim(np.min(zs), np.max(zs))
    
    ax2.plot(xs, ys, zs, color='lightgray', alpha=0.3, lw=0.5)
    
    trail, = ax2.plot([], [], [], color='red', lw=1.5, alpha=0.8)
    star, = ax2.plot([], [], [], marker='o', color='#9400d3',
                     markersize=15, linestyle='None', zorder=20)

    ax2.view_init(elev=25, azim=45)

    # animation
    def init():
        line1.set_data([], [])
        pt1.set_data([], [])
        pt2.set_data([], [])
        pt3.set_data([], [])
        trail.set_data([], [])
        trail.set_3d_properties([])
        star.set_data([], [])
        star.set_3d_properties([])
        return line1, pt1, pt2, pt3, trail, star

    def update(frame):
        if frame < 2 * TAU:
            return init()
        
        current_x = np.arange(frame)
        current_y = data[:frame]
        line1.set_data(current_x, current_y)
        
        idx3 = frame
        idx2 = frame - TAU
        idx1 = frame - 2 * TAU
        
        pt1.set_data([idx1], [data[idx1]])
        pt2.set_data([idx2], [data[idx2]])
        pt3.set_data([idx3], [data[idx3]])

        valid_idx = idx1
        if valid_idx >= len(xs):
            return line1,
        
        trail.set_data(xs[:valid_idx], ys[:valid_idx])
        trail.set_3d_properties(zs[:valid_idx])
        
        star.set_data([xs[valid_idx]], [ys[valid_idx]])
        star.set_3d_properties([zs[valid_idx]])
        
        return line1, pt1, pt2, pt3, trail, star

    ani = animation.FuncAnimation(
        fig, update, frames=range(0, valid_len),
        init_func=init, blit=False, interval=ANIMATION_SPEED
    )

    print("Starting Simulation... (Close window to stop)")
    plt.show()

if __name__ == "__main__":
    run_simulation()
