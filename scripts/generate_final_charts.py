import matplotlib.pyplot as plt
import numpy as np
import os

SAVE_DIR = 'models/final_charts/'
os.makedirs(SAVE_DIR, exist_ok=True)

# model names
MODELS = [
    'Traditional\n(Random Forest)', 
    'Modern\n(1D-CNN)', 
    'Proposed: LogReg\n(Linear)', 
    'Proposed: SVM\n(Geometric)', 
    'Proposed: XGBoost\n(Tree-Based)'
]

# metrics
ACCURACY   = [92.00, 94.88, 79.42, 95.25, 97.47]
F1_SCORES  = [80.0, 84.0, 56.0, 87.0, 93.0]
SPEED_MS   = [20, 1500, 5, 250, 10]

def plot_victory_chart():
    print("Generating Comparison Chart...")
    x = np.arange(len(MODELS))
    width = 0.35 

    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(14, 7))
    
    rects1 = ax.bar(x - width/2, ACCURACY, width, label='Accuracy',
                    color='#2c3e50', edgecolor='white', linewidth=1)
    
    rects2 = ax.bar(x + width/2, F1_SCORES, width, label='Anomaly F1-Score',
                    color='#e74c3c', edgecolor='white', linewidth=1)

    ax.set_ylabel('Score (%)', fontsize=12, fontweight='bold', labelpad=10)
    ax.set_title('COMPARISON CHART', fontsize=16, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(MODELS, fontsize=11, fontweight='bold')
    ax.set_ylim(50, 105)
    ax.legend(loc='lower right', frameon=True, framealpha=0.9, fontsize=11)
    
    # highlight best model
    winner_idx = 4
    ax.text(winner_idx, 102, "BEST", ha='center', va='bottom',
            fontweight='bold', color='#27ae60', fontsize=12)

    # value labels
    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.1f}%',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 5),
                        textcoords="offset points",
                        ha='center', va='bottom',
                        fontsize=9, fontweight='bold')

    autolabel(rects1)
    autolabel(rects2)

    plt.tight_layout()
    plt.savefig(os.path.join(SAVE_DIR, 'comparison_chart.png'), dpi=300)
    print("Saved comparison_chart.png")

def plot_efficiency_bubble():
    print("Generating Efficiency Plot...")
    fig, ax = plt.subplots(figsize=(10, 7))
    
    sizes  = [500, 3000, 100, 800, 200]
    colors = ['#34495e', '#c0392b', '#95a5a6', '#8e44ad', '#27ae60']
    
    ax.scatter(SPEED_MS, ACCURACY, s=sizes, c=colors, alpha=0.7,
               edgecolors='black', linewidth=1.5)
    
    for i, txt in enumerate(MODELS):
        clean_txt = txt.replace('\n', ' ')
        ax.annotate(clean_txt, (SPEED_MS[i], ACCURACY[i]),
                    xytext=(0, 15), textcoords='offset points',
                    ha='center', fontweight='bold', fontsize=9)

    ax.set_xscale('log')
    ax.set_xlabel('Inference Latency (ms / 1k beats) [Log Scale]',
                  fontweight='bold', fontsize=11)
    ax.set_ylabel('Accuracy (%)', fontweight='bold', fontsize=11)
    ax.set_title('PERFORMANCE VS EFFICIENCY', fontweight='bold', fontsize=14)
    ax.grid(True, which="both", ls="--", alpha=0.4)
    
    plt.axvline(x=50, color='red', linestyle=':', linewidth=2)
    plt.text(8, 80, "Real-Time Zone\n(Low Latency)", color='#27ae60',
             fontweight='bold')
    plt.text(200, 80, "High-Compute Zone\n(High Latency)", color='#c0392b',
             fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(SAVE_DIR, 'efficiency_plot.png'), dpi=300)
    print("Saved efficiency_plot.png")

if __name__ == "__main__":
    plot_victory_chart()
    plot_efficiency_bubble()
