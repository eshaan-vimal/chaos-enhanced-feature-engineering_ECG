import React, { useState, useEffect, useRef, useCallback } from 'react';

// LaTeX Math Component using KaTeX
const MathDisplay = ({ latex, display = true }) => {
  const containerRef = React.useRef(null);
  
  React.useEffect(() => {
    if (containerRef.current && window.katex) {
      try {
        window.katex.render(latex, containerRef.current, {
          displayMode: display,
          throwOnError: false,
          output: 'html',
          strict: false
        });
      } catch (e) {
        containerRef.current.textContent = latex;
      }
    }
  }, [latex, display]);
  
  return <span ref={containerRef} style={{ color: '#f0f0f0' }} />;
};

// KaTeX Loader Hook
const useKatex = () => {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    if (window.katex) {
      setLoaded(true);
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  
  return loaded;
};

// LLE Visualization Component
const LLEVisualization = () => {
  const [time, setTime] = useState(0);
  const [trajectoryType, setTrajectoryType] = useState('chaotic');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const initialSeparation = 0.01;
  const maxTime = 100;
  
  // Calculate trajectory divergence based on type
  const getTrajectories = useCallback(() => {
    const t = time / 10;
    let separation;
    let lle;
    
    if (trajectoryType === 'chaotic') {
      // Exponential divergence (positive LLE)
      lle = 0.9;
      separation = initialSeparation * Math.exp(lle * t);
    } else if (trajectoryType === 'periodic') {
      // Bounded separation (zero LLE) - separation oscillates but doesn't grow/shrink on average
      lle = 0;
      separation = initialSeparation * (1 + 0.5 * Math.sin(t));
    } else {
      // Convergent (negative LLE)
      lle = -0.5;
      separation = initialSeparation * Math.exp(lle * t);
    }
    
    return { separation: Math.min(separation, 2), lle, t };
  }, [time, trajectoryType]);
  
  const { separation, lle, t } = getTrajectories();
  
  useEffect(() => {
    let interval;
    if (isPlaying && time < maxTime) {
      interval = setInterval(() => {
        setTime(prev => Math.min(prev + 1, maxTime));
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, time]);
  
  const reset = () => {
    setTime(0);
    setIsPlaying(false);
  };
  
  // Generate trajectory paths
  const path1Points = [];
  const path2Points = [];
  for (let i = 0; i <= time; i++) {
    const ti = i / 10;
    let sep;
    if (trajectoryType === 'chaotic') {
      sep = initialSeparation * Math.exp(0.9 * ti);
    } else if (trajectoryType === 'periodic') {
      sep = initialSeparation * (1 + 0.5 * Math.sin(ti));
    } else {
      sep = initialSeparation * Math.exp(-0.5 * ti);
    }
    sep = Math.min(sep, 2);
    
    const x = 50 + i * 2;
    const baseY = 150 + Math.sin(ti * 0.5) * 30;
    path1Points.push(`${x},${baseY}`);
    path2Points.push(`${x},${baseY + sep * 50}`);
  }
  
  return (
    <div style={{ background: '#0a0a0f', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ color: '#f0f0f0', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
        Largest Lyapunov Exponent (LLE)
      </h3>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
        LLE measures how fast nearby trajectories diverge. Start two points infinitely close together, 
        then watch: do they stay close (stable) or fly apart (chaotic)?
      </p>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['chaotic', 'periodic', 'stable'].map(type => (
          <button
            key={type}
            onClick={() => { setTrajectoryType(type); reset(); }}
            style={{
              padding: '8px 16px',
              background: trajectoryType === type ? '#ff6b35' : '#1a1a24',
              color: trajectoryType === type ? '#fff' : '#888',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {type} {type === 'chaotic' ? '(λ > 0)' : type === 'periodic' ? '(λ = 0)' : '(λ < 0)'}
          </button>
        ))}
      </div>
      
      <svg viewBox="0 0 300 200" style={{ width: '100%', height: '200px', background: '#05050a', borderRadius: '12px' }}>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line key={i} x1="50" y1={50 + i * 30} x2="280" y2={50 + i * 30} stroke="#1a1a24" strokeWidth="1" />
        ))}
        
        {/* Trajectory 1 */}
        {path1Points.length > 1 && (
          <polyline
            points={path1Points.join(' ')}
            fill="none"
            stroke="#4ecdc4"
            strokeWidth="2"
          />
        )}
        
        {/* Trajectory 2 */}
        {path2Points.length > 1 && (
          <polyline
            points={path2Points.join(' ')}
            fill="none"
            stroke="#ff6b35"
            strokeWidth="2"
          />
        )}
        
        {/* Current points */}
        {time > 0 && (
          <>
            <circle cx={50 + time * 2} cy={parseFloat(path1Points[time]?.split(',')[1]) || 150} r="5" fill="#4ecdc4" />
            <circle cx={50 + time * 2} cy={parseFloat(path2Points[time]?.split(',')[1]) || 150} r="5" fill="#ff6b35" />
            
            {/* Distance indicator */}
            <line
              x1={50 + time * 2}
              y1={parseFloat(path1Points[time]?.split(',')[1]) || 150}
              x2={50 + time * 2}
              y2={parseFloat(path2Points[time]?.split(',')[1]) || 150}
              stroke="#fff"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          </>
        )}
        
        {/* Labels */}
        <text x="20" y="25" fill="#4ecdc4" fontSize="10" fontFamily="JetBrains Mono">Trajectory 1</text>
        <text x="150" y="25" fill="#ff6b35" fontSize="10" fontFamily="JetBrains Mono">Trajectory 2</text>
      </svg>
      
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: '10px 20px',
            background: isPlaying ? '#ff6b35' : '#4ecdc4',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold'
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={reset}
          style={{
            padding: '10px 20px',
            background: '#1a1a24',
            color: '#888',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          ↺ Reset
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={time}
          onChange={(e) => setTime(parseInt(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>
      
      {/* Formula and explanation */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        border: '1px solid #1a1a24'
      }}>
        <div style={{ 
          background: '#0a0a0f', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <MathDisplay latex="d(t) = d_0 \cdot e^{\lambda t}" display={true} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Initial separation</div>
            <div style={{ color: '#fff', fontSize: '18px' }}>
              <MathDisplay latex={`d_0 = ${initialSeparation}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Current separation</div>
            <div style={{ color: '#4ecdc4', fontSize: '18px' }}>
              <MathDisplay latex={`d(t) = ${separation.toFixed(3)}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Lyapunov exponent</div>
            <div style={{ color: '#ff6b35', fontSize: '18px' }}>
              <MathDisplay latex={`\\lambda = ${lle.toFixed(2)}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Time elapsed</div>
            <div style={{ color: '#fff', fontSize: '18px' }}>
              <MathDisplay latex={`t = ${t.toFixed(1)}`} display={false} />
            </div>
          </div>
        </div>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#05050a', 
          borderRadius: '8px',
          borderLeft: '3px solid #ff6b35'
        }}>
          <p style={{ color: '#888', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: '#ff6b35' }}>λ {'>'} 0</strong>: Chaos! Tiny differences explode exponentially. 
            <strong style={{ color: '#4ecdc4' }}> λ = 0</strong>: Periodic—differences stay bounded. 
            <strong style={{ color: '#666' }}> λ {'<'} 0</strong>: Stable—trajectories converge.
          </p>
        </div>
      </div>
    </div>
  );
};

// Sample Entropy Visualization - CORRECTED
const SampEnVisualization = () => {
  const [m, setM] = useState(2);
  const [r, setR] = useState(0.2);
  const [signalType, setSignalType] = useState('mixed');
  const [highlightIndex, setHighlightIndex] = useState(null);
  
  // Generate different signal types
  const generateSignal = useCallback(() => {
    if (signalType === 'regular') {
      return Array.from({ length: 30 }, (_, i) => Math.sin(i * 0.5) * 0.8);
    } else if (signalType === 'random') {
      // Use seeded random for consistency
      return [0.2, -0.5, 0.8, -0.3, 0.6, -0.7, 0.1, 0.9, -0.4, 0.3, 
              -0.8, 0.5, -0.1, 0.7, -0.6, 0.4, -0.9, 0.2, 0.6, -0.2,
              0.8, -0.5, 0.3, -0.7, 0.1, 0.9, -0.3, 0.5, -0.8, 0.4];
    } else {
      // Mixed: sine with some harmonic
      return Array.from({ length: 30 }, (_, i) => 
        Math.sin(i * 0.4) * 0.6 + (Math.sin(i * 1.7) * 0.2)
      );
    }
  }, [signalType]);
  
  const signal = generateSignal();
  
  // Find matching patterns - CORRECTED to use Chebyshev distance properly
  const findMatches = useCallback(() => {
    if (highlightIndex === null) return { matches: [], extended: [] };
    
    const pattern = signal.slice(highlightIndex, highlightIndex + m);
    const matches = [];
    const extended = [];
    
    for (let i = 0; i < signal.length - m; i++) {
      if (i === highlightIndex) continue;
      
      const candidate = signal.slice(i, i + m);
      // Chebyshev distance (max absolute difference) - this is standard for SampEn
      const maxDiff = Math.max(...pattern.map((v, j) => Math.abs(v - candidate[j])));
      
      if (maxDiff < r) {
        matches.push(i);
        // Check if the (m+1)th point also matches
        // This is the key insight: do patterns that match at length m still match at m+1?
        if (i + m < signal.length && highlightIndex + m < signal.length) {
          const nextPointDiff = Math.abs(signal[highlightIndex + m] - signal[i + m]);
          if (nextPointDiff < r) {
            extended.push(i);
          }
        }
      }
    }
    
    return { matches, extended };
  }, [highlightIndex, m, r, signal]);
  
  const { matches, extended } = findMatches();
  
  // Calculate SampEn correctly
  // B = count of template matches at length m
  // A = count of template matches at length m+1
  // SampEn = -ln(A/B)
  const calculateSampEn = useCallback(() => {
    let Bm = 0, Am = 0;
    const n = signal.length;
    
    // Compare all pairs (excluding self-matches)
    for (let i = 0; i < n - m; i++) {
      for (let j = i + 1; j < n - m; j++) {
        // Check m-length pattern match using Chebyshev distance
        let maxDiff = 0;
        for (let k = 0; k < m; k++) {
          const diff = Math.abs(signal[i + k] - signal[j + k]);
          if (diff > maxDiff) maxDiff = diff;
        }
        
        if (maxDiff < r) {
          Bm++;
          // Check m+1 length match
          if (i + m < n && j + m < n) {
            const extDiff = Math.abs(signal[i + m] - signal[j + m]);
            // For m+1 match, ALL m+1 points must be within r (Chebyshev)
            if (Math.max(maxDiff, extDiff) < r) {
              Am++;
            }
          }
        }
      }
    }
    
    if (Bm === 0 || Am === 0) return 2.5; // Return high value if undefined
    return -Math.log(Am / Bm);
  }, [signal, m, r]);
  
  const sampEn = calculateSampEn();
  
  // Get indices that are part of the selected pattern (for highlighting)
  const getPatternIndices = (startIdx) => {
    const indices = [];
    for (let k = 0; k < m; k++) {
      indices.push(startIdx + k);
    }
    return indices;
  };
  
  return (
    <div style={{ background: '#0a0a0f', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ color: '#f0f0f0', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
        Sample Entropy (SampEn)
      </h3>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
        SampEn measures unpredictability. If patterns repeat, you can predict what comes next. 
        Click on any point to select a template pattern of length m, then see which other patterns match.
      </p>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['regular', 'mixed', 'random'].map(type => (
          <button
            key={type}
            onClick={() => { setSignalType(type); setHighlightIndex(null); }}
            style={{
              padding: '8px 16px',
              background: signalType === type ? '#9b59b6' : '#1a1a24',
              color: signalType === type ? '#fff' : '#888',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              textTransform: 'capitalize'
            }}
          >
            {type} {type === 'regular' ? '(Low SampEn)' : type === 'random' ? '(High SampEn)' : '(Medium)'}
          </button>
        ))}
      </div>
      
      <svg viewBox="0 0 320 150" style={{ width: '100%', height: '180px', background: '#05050a', borderRadius: '12px' }}>
        {/* Signal line */}
        <polyline
          points={signal.map((v, i) => `${20 + i * 10},${75 - v * 40}`).join(' ')}
          fill="none"
          stroke="#444"
          strokeWidth="1"
        />
        
        {/* Data points - clickable */}
        {signal.map((v, i) => {
          let color = '#666';
          let size = 4;
          let strokeColor = 'none';
          let strokeWidth = 0;
          
          if (highlightIndex !== null) {
            const selectedPattern = getPatternIndices(highlightIndex);
            const isInSelectedPattern = selectedPattern.includes(i);
            const isNextAfterSelected = i === highlightIndex + m;
            
            // Check if this index is part of any matching pattern
            const isInMatchingPattern = matches.some(matchStart => {
              const matchPattern = getPatternIndices(matchStart);
              return matchPattern.includes(i);
            });
            
            // Check if this index is part of any extended matching pattern
            const isInExtendedPattern = extended.some(matchStart => {
              const matchPattern = getPatternIndices(matchStart);
              return matchPattern.includes(i);
            });
            
            // Check if this is the "next point" after a matching pattern
            const isNextAfterMatch = matches.some(matchStart => i === matchStart + m);
            const isNextAfterExtended = extended.some(matchStart => i === matchStart + m);
            
            if (isInSelectedPattern) {
              color = '#9b59b6'; // Selected pattern - purple
              size = 7;
              strokeColor = '#fff';
              strokeWidth = 2;
            } else if (isNextAfterSelected) {
              color = '#e74c3c'; // Next point after selected - red
              size = 6;
              strokeColor = '#fff';
              strokeWidth = 2;
            } else if (isInExtendedPattern) {
              color = '#2ecc71'; // Extended match (m+1) - green
              size = 6;
            } else if (isInMatchingPattern) {
              color = '#f39c12'; // Match at m - orange
              size = 5;
            } else if (isNextAfterExtended) {
              color = '#27ae60'; // Next point that matched - darker green
              size = 5;
            } else if (isNextAfterMatch) {
              color = '#c0392b'; // Next point that didn't match - darker red
              size = 5;
            }
          }
          
          return (
            <circle
              key={i}
              cx={20 + i * 10}
              cy={75 - v * 40}
              r={size}
              fill={color}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ cursor: i < signal.length - m ? 'pointer' : 'default' }}
              onClick={() => i < signal.length - m && setHighlightIndex(i)}
            />
          );
        })}
        
        {/* Tolerance band visualization for selected pattern */}
        {highlightIndex !== null && (
          <>
            {/* Show tolerance band around selected pattern */}
            {Array.from({ length: m }, (_, k) => (
              <rect
                key={k}
                x={17 + (highlightIndex + k) * 10}
                y={75 - signal[highlightIndex + k] * 40 - r * 40}
                width={6}
                height={r * 80}
                fill="#9b59b6"
                fillOpacity="0.2"
                stroke="#9b59b6"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            ))}
          </>
        )}
        
        {/* Legend */}
        <g transform="translate(5, 135)">
          <circle cx="8" cy="0" r="4" fill="#9b59b6" stroke="#fff" strokeWidth="1" />
          <text x="18" y="4" fill="#888" fontSize="8" fontFamily="JetBrains Mono">Template</text>
          <circle cx="75" cy="0" r="4" fill="#f39c12" />
          <text x="85" y="4" fill="#888" fontSize="8" fontFamily="JetBrains Mono">m-match</text>
          <circle cx="142" cy="0" r="4" fill="#2ecc71" />
          <text x="152" y="4" fill="#888" fontSize="8" fontFamily="JetBrains Mono">(m+1)-match</text>
          <circle cx="225" cy="0" r="4" fill="#e74c3c" stroke="#fff" strokeWidth="1" />
          <text x="235" y="4" fill="#888" fontSize="8" fontFamily="JetBrains Mono">Next point</text>
        </g>
      </svg>
      
      {/* Explanation box */}
      {highlightIndex !== null && (
        <div style={{ 
          marginTop: '12px', 
          padding: '12px', 
          background: '#0f0f18', 
          borderRadius: '8px',
          border: '1px solid #9b59b6',
          fontSize: '12px',
          color: '#888'
        }}>
          <strong style={{ color: '#9b59b6' }}>Selected template</strong> at index {highlightIndex}: 
          [{signal.slice(highlightIndex, highlightIndex + m).map(v => v.toFixed(2)).join(', ')}]
          <br />
          <strong style={{ color: '#f39c12' }}>{matches.length} patterns</strong> match at length m. 
          Of those, <strong style={{ color: '#2ecc71' }}>{extended.length}</strong> still match at length m+1.
          <br />
          <span style={{ color: '#666' }}>
            Ratio A/B = {matches.length > 0 ? (extended.length / matches.length).toFixed(3) : '—'} 
            → Higher ratio = more predictable
          </span>
        </div>
      )}
      
      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Pattern length (m): {m}
          </label>
          <input
            type="range"
            min="2"
            max="4"
            value={m}
            onChange={(e) => { setM(parseInt(e.target.value)); setHighlightIndex(null); }}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Tolerance (r): {r.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="0.5"
            step="0.05"
            value={r}
            onChange={(e) => setR(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      
      {/* Formula and stats */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        border: '1px solid #1a1a24'
      }}>
        <div style={{ 
          background: '#0a0a0f', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <MathDisplay latex="\text{SampEn}(m, r) = -\ln\left(\frac{A}{B}\right)" display={true} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Pattern length</div>
            <div style={{ color: '#9b59b6', fontSize: '18px' }}>
              <MathDisplay latex={`m = ${m}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Tolerance</div>
            <div style={{ color: '#fff', fontSize: '18px' }}>
              <MathDisplay latex={`r = ${r.toFixed(2)}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>B (m-matches)</div>
            <div style={{ color: '#f39c12', fontSize: '18px' }}>
              <MathDisplay latex={`B = ${highlightIndex !== null ? matches.length : '\\text{click point}'}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>A (m+1 matches)</div>
            <div style={{ color: '#2ecc71', fontSize: '18px' }}>
              <MathDisplay latex={`A = ${highlightIndex !== null ? extended.length : '\\text{—}'}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px', gridColumn: 'span 2' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Sample Entropy (full signal)</div>
            <div style={{ color: '#9b59b6', fontSize: '24px' }}>
              <MathDisplay latex={`\\text{SampEn} = ${sampEn.toFixed(3)}`} display={false} />
            </div>
          </div>
        </div>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#05050a', 
          borderRadius: '8px',
          borderLeft: '3px solid #9b59b6'
        }}>
          <p style={{ color: '#888', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: '#f39c12' }}>B</strong> counts pairs of m-point patterns within tolerance r.
            <strong style={{ color: '#2ecc71' }}> A</strong> counts how many of those pairs remain within tolerance at m+1 points.
            <br />
            <span style={{ color: '#666' }}>
              If A ≈ B, knowing m points predicts the next (low entropy). If A {'<<'} B, patterns don't extend (high entropy).
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Fractal Dimension Visualization - CORRECTED with actual box counting
const FDVisualization = () => {
  const [boxSize, setBoxSize] = useState(32);
  const [shape, setShape] = useState('koch');
  const [animating, setAnimating] = useState(false);
  
  // Generate Koch curve points at various depths
  const generateKochPoints = useCallback((depth = 4) => {
    let points = [[20, 180], [280, 180]];
    
    for (let d = 0; d < depth; d++) {
      const newPoints = [];
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        const p1 = [x1, y1];
        const p2 = [x1 + dx/3, y1 + dy/3];
        const p3 = [
          x1 + dx/2 - dy * Math.sqrt(3)/6,
          y1 + dy/2 + dx * Math.sqrt(3)/6
        ];
        const p4 = [x1 + 2*dx/3, y1 + 2*dy/3];
        
        newPoints.push(p1, p2, p3, p4);
      }
      newPoints.push(points[points.length - 1]);
      points = newPoints;
    }
    
    return points;
  }, []);
  
  const kochPoints = generateKochPoints(4);
  
  // Actually count boxes that intersect with the shape
  const countBoxes = useCallback((shapeType, size) => {
    const gridSize = 256;
    const numBoxes = Math.floor(gridSize / size);
    const occupiedBoxes = new Set();
    
    if (shapeType === 'line') {
      // Horizontal line from (20, 148) to (276, 148)
      const y = 148;
      for (let x = 20; x <= 276; x += 1) {
        const boxI = Math.floor((x - 20) / size);
        const boxJ = Math.floor((y - 20) / size);
        if (boxI >= 0 && boxI < numBoxes && boxJ >= 0 && boxJ < numBoxes) {
          occupiedBoxes.add(`${boxI},${boxJ}`);
        }
      }
    } else if (shapeType === 'square') {
      // Filled square from (84, 84) to (212, 212)
      for (let x = 84; x <= 212; x += 2) {
        for (let y = 84; y <= 212; y += 2) {
          const boxI = Math.floor((x - 20) / size);
          const boxJ = Math.floor((y - 20) / size);
          if (boxI >= 0 && boxI < numBoxes && boxJ >= 0 && boxJ < numBoxes) {
            occupiedBoxes.add(`${boxI},${boxJ}`);
          }
        }
      }
    } else if (shapeType === 'koch') {
      // Sample points along the Koch curve
      for (let i = 0; i < kochPoints.length - 1; i++) {
        const [x1, y1] = kochPoints[i];
        const [x2, y2] = kochPoints[i + 1];
        const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
        const steps = Math.max(Math.ceil(dist / 2), 1);
        
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = x1 + t * (x2 - x1);
          const y = y1 + t * (y2 - y1);
          const boxI = Math.floor((x - 20) / size);
          const boxJ = Math.floor((y - 20) / size);
          if (boxI >= 0 && boxI < numBoxes && boxJ >= 0 && boxJ < numBoxes) {
            occupiedBoxes.add(`${boxI},${boxJ}`);
          }
        }
      }
    }
    
    return occupiedBoxes.size;
  }, [kochPoints]);
  
  // Calculate box counts for all sizes
  const boxCounts = useCallback(() => {
    const sizes = [128, 64, 32, 16, 8, 4];
    const counts = {};
    sizes.forEach(size => {
      counts[size] = countBoxes(shape, size);
    });
    return counts;
  }, [shape, countBoxes]);
  
  const counts = boxCounts();
  const currentCount = counts[boxSize] || 1;
  
  // Calculate FD from box counts using linear regression
  const calculateFD = useCallback(() => {
    const sizes = [128, 64, 32, 16, 8, 4];
    const countsArray = sizes.map(s => counts[s]);
    
    // Linear regression on log-log plot
    // log(N) = D * log(1/ε) + c
    const logSizes = sizes.map(s => Math.log(1/s));
    const logCounts = countsArray.map(c => Math.log(Math.max(c, 1)));
    
    const n = logSizes.length;
    const sumX = logSizes.reduce((a, b) => a + b, 0);
    const sumY = logCounts.reduce((a, b) => a + b, 0);
    const sumXY = logSizes.reduce((sum, x, i) => sum + x * logCounts[i], 0);
    const sumX2 = logSizes.reduce((sum, x) => sum + x * x, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }, [counts]);
  
  const fd = calculateFD();
  
  // Theoretical FD values for reference
  const theoreticalFD = {
    line: 1.0,
    square: 2.0,
    koch: Math.log(4) / Math.log(3) // ≈ 1.2619
  };
  
  // Animate through box sizes
  const animateBoxes = () => {
    setAnimating(true);
    const sizes = [128, 64, 32, 16, 8, 4];
    let index = 0;
    
    const interval = setInterval(() => {
      setBoxSize(sizes[index]);
      index++;
      if (index >= sizes.length) {
        clearInterval(interval);
        setAnimating(false);
      }
    }, 800);
  };
  
  // Generate grid boxes for visualization
  const numBoxes = Math.floor(256 / boxSize);
  const boxes = [];
  for (let i = 0; i < numBoxes; i++) {
    for (let j = 0; j < numBoxes; j++) {
      boxes.push({ x: 20 + i * boxSize, y: 20 + j * boxSize, size: boxSize, i, j });
    }
  }
  
  // Determine which boxes are occupied
  const occupiedSet = new Set();
  if (shape === 'line') {
    const y = 148;
    for (let x = 20; x <= 276; x += 1) {
      const boxI = Math.floor((x - 20) / boxSize);
      const boxJ = Math.floor((y - 20) / boxSize);
      occupiedSet.add(`${boxI},${boxJ}`);
    }
  } else if (shape === 'square') {
    for (let x = 84; x <= 212; x += 2) {
      for (let y = 84; y <= 212; y += 2) {
        const boxI = Math.floor((x - 20) / boxSize);
        const boxJ = Math.floor((y - 20) / boxSize);
        occupiedSet.add(`${boxI},${boxJ}`);
      }
    }
  } else if (shape === 'koch') {
    for (let i = 0; i < kochPoints.length - 1; i++) {
      const [x1, y1] = kochPoints[i];
      const [x2, y2] = kochPoints[i + 1];
      const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
      const steps = Math.max(Math.ceil(dist / 2), 1);
      
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = x1 + t * (x2 - x1);
        const y = y1 + t * (y2 - y1);
        const boxI = Math.floor((x - 20) / boxSize);
        const boxJ = Math.floor((y - 20) / boxSize);
        occupiedSet.add(`${boxI},${boxJ}`);
      }
    }
  }
  
  return (
    <div style={{ background: '#0a0a0f', borderRadius: '16px', padding: '24px' }}>
      <h3 style={{ color: '#f0f0f0', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
        Fractal Dimension (Box-Counting)
      </h3>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
        How "complex" is a shape? Cover it with boxes of different sizes and count how many boxes touch the shape.
        The rate at which this count grows (on a log-log scale) gives the fractal dimension.
      </p>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['line', 'koch', 'square'].map(type => (
          <button
            key={type}
            onClick={() => setShape(type)}
            style={{
              padding: '8px 16px',
              background: shape === type ? '#e74c3c' : '#1a1a24',
              color: shape === type ? '#fff' : '#888',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              textTransform: 'capitalize'
            }}
          >
            {type === 'line' ? `Line (D=${theoreticalFD.line.toFixed(2)})` : 
             type === 'square' ? `Square (D=${theoreticalFD.square.toFixed(2)})` : 
             `Koch (D≈${theoreticalFD.koch.toFixed(2)})`}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Main visualization */}
        <svg viewBox="0 0 300 220" style={{ flex: '1 1 300px', height: '220px', background: '#05050a', borderRadius: '12px' }}>
          {/* Grid boxes - highlight occupied ones */}
          {boxes.map((box, idx) => {
            const isOccupied = occupiedSet.has(`${box.i},${box.j}`);
            return (
              <rect
                key={idx}
                x={box.x}
                y={box.y}
                width={box.size - 1}
                height={box.size - 1}
                fill={isOccupied ? 'rgba(231, 76, 60, 0.2)' : 'none'}
                stroke={isOccupied ? '#e74c3c' : '#1a1a24'}
                strokeWidth={isOccupied ? '1' : '0.5'}
              />
            );
          })}
          
          {/* Shape */}
          {shape === 'line' && (
            <line x1="20" y1="148" x2="276" y2="148" stroke="#e74c3c" strokeWidth="2" />
          )}
          {shape === 'square' && (
            <rect x="84" y="84" width="128" height="128" fill="#e74c3c" fillOpacity="0.8" stroke="#e74c3c" strokeWidth="2" />
          )}
          {shape === 'koch' && (
            <polyline
              points={kochPoints.map(p => p.join(',')).join(' ')}
              fill="none"
              stroke="#e74c3c"
              strokeWidth="2"
            />
          )}
          
          {/* Box size label */}
          <text x="150" y="215" fill="#888" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
            ε = {boxSize}px → N(ε) = {currentCount} boxes
          </text>
        </svg>
        
        {/* Log-log plot */}
        <svg viewBox="0 0 180 180" style={{ flex: '0 0 180px', height: '180px', background: '#05050a', borderRadius: '12px' }}>
          {/* Axes */}
          <line x1="45" y1="150" x2="170" y2="150" stroke="#333" strokeWidth="1" />
          <line x1="45" y1="150" x2="45" y2="20" stroke="#333" strokeWidth="1" />
          
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={`h${i}`} x1="45" y1={150 - i * 30} x2="170" y2={150 - i * 30} stroke="#1a1a24" strokeWidth="0.5" />
          ))}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={`v${i}`} x1={45 + i * 30} y1="20" x2={45 + i * 30} y2="150" stroke="#1a1a24" strokeWidth="0.5" />
          ))}
          
          {/* Data points */}
          {[128, 64, 32, 16, 8, 4].map((size, i) => {
            const count = counts[size] || 1;
            // Scale: log(1/ε) ranges from ~-5 to ~-1.4, log(N) from ~0 to ~6
            const x = 45 + ((Math.log(1/size) + 5) / 4) * 120;
            const y = 150 - (Math.log(count) / 6) * 120;
            return (
              <circle
                key={size}
                cx={x}
                cy={y}
                r={size === boxSize ? 6 : 4}
                fill={size === boxSize ? '#e74c3c' : '#666'}
                stroke={size === boxSize ? '#fff' : 'none'}
                strokeWidth="2"
              />
            );
          })}
          
          {/* Regression line */}
          {(() => {
            const sizes = [128, 64, 32, 16, 8, 4];
            const x1 = 45 + ((Math.log(1/128) + 5) / 4) * 120;
            const x2 = 45 + ((Math.log(1/4) + 5) / 4) * 120;
            const y1 = 150 - ((Math.log(counts[128] || 1) + fd * 0) / 6) * 120;
            const y2 = 150 - ((Math.log(counts[4] || 1) + fd * 0) / 6) * 120;
            // Better: use regression line
            const logN1 = Math.log(counts[128] || 1);
            const logN2 = Math.log(counts[4] || 1);
            const actualY1 = 150 - (logN1 / 6) * 120;
            const actualY2 = 150 - (logN2 / 6) * 120;
            return (
              <line
                x1={x1}
                y1={actualY1}
                x2={x2}
                y2={actualY2}
                stroke="#e74c3c"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            );
          })()}
          
          {/* Labels */}
          <text x="107" y="168" fill="#888" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">log(1/ε)</text>
          <text x="15" y="85" fill="#888" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono" transform="rotate(-90, 15, 85)">log N(ε)</text>
          <text x="107" y="15" fill="#e74c3c" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">slope = D ≈ {fd.toFixed(2)}</text>
        </svg>
      </div>
      
      {/* Controls */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={animateBoxes}
          disabled={animating}
          style={{
            padding: '10px 20px',
            background: animating ? '#333' : '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: animating ? 'not-allowed' : 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold'
          }}
        >
          {animating ? 'Counting...' : '▶ Animate Box Counting'}
        </button>
        <div style={{ flex: 1 }}>
          <label style={{ color: '#888', fontSize: '12px', marginRight: '8px' }}>Box size (ε):</label>
          <input
            type="range"
            min="0"
            max="5"
            value={[128, 64, 32, 16, 8, 4].indexOf(boxSize)}
            onChange={(e) => setBoxSize([128, 64, 32, 16, 8, 4][e.target.value])}
            style={{ width: '120px' }}
          />
          <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>{boxSize}px</span>
        </div>
      </div>
      
      {/* Formula */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        border: '1px solid #1a1a24'
      }}>
        <div style={{ 
          background: '#0a0a0f', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <MathDisplay latex="D = \lim_{\varepsilon \to 0} \frac{\log N(\varepsilon)}{\log(1/\varepsilon)}" display={true} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Box size (ε)</div>
            <div style={{ color: '#4ecdc4', fontSize: '18px' }}>
              <MathDisplay latex={`\\varepsilon = ${boxSize}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Boxes needed N(ε)</div>
            <div style={{ color: '#e74c3c', fontSize: '18px' }}>
              <MathDisplay latex={`N = ${currentCount}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Computed D</div>
            <div style={{ color: '#fff', fontSize: '18px' }}>
              <MathDisplay latex={`D \\approx ${fd.toFixed(2)}`} display={false} />
            </div>
          </div>
          <div style={{ padding: '12px', background: '#05050a', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Theoretical D</div>
            <div style={{ color: '#666', fontSize: '18px' }}>
              <MathDisplay latex={`D = ${theoreticalFD[shape].toFixed(2)}`} display={false} />
            </div>
          </div>
        </div>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#05050a', 
          borderRadius: '8px',
          borderLeft: '3px solid #e74c3c'
        }}>
          <p style={{ color: '#888', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: '#e74c3c' }}>Box-counting dimension:</strong> As boxes shrink, count how many touch the shape.
            Lines scale as ε⁻¹ (D=1), filled areas as ε⁻² (D=2), and fractals like the Koch curve fall between.
            <br />
            <span style={{ color: '#666' }}>
              The slope of the log-log plot gives D. Highlighted boxes show which ones intersect the shape.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Main App
export default function ChaosVisualization() {
  const [activeTab, setActiveTab] = useState('lle');
  const katexLoaded = useKatex();
  
  if (!katexLoaded) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666'
      }}>
        Loading mathematical notation...
      </div>
    );
  }
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        
        input[type="range"] {
          -webkit-appearance: none;
          height: 6px;
          background: #1a1a24;
          border-radius: 3px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #4ecdc4;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            color: '#f0f0f0', 
            fontSize: '28px', 
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: '8px'
          }}>
            <span style={{ color: '#ff6b35' }}>Chaos</span> Measures Visualized
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Interactive explorations of complexity metrics — see the math in motion
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '24px',
          background: '#0a0a0f',
          padding: '4px',
          borderRadius: '12px'
        }}>
          {[
            { id: 'lle', label: 'Lyapunov Exponent', color: '#4ecdc4' },
            { id: 'sampen', label: 'Sample Entropy', color: '#9b59b6' },
            { id: 'fd', label: 'Fractal Dimension', color: '#e74c3c' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: activeTab === tab.id ? tab.color : 'transparent',
                color: activeTab === tab.id ? '#000' : '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        {activeTab === 'lle' && <LLEVisualization />}
        {activeTab === 'sampen' && <SampEnVisualization />}
        {activeTab === 'fd' && <FDVisualization />}
        
        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px', 
          padding: '16px',
          borderTop: '1px solid #1a1a24'
        }}>
          <p style={{ color: '#444', fontSize: '12px' }}>
            Click, drag, and explore — understanding chaos through interaction
          </p>
        </div>
      </div>
    </div>
  );
}
