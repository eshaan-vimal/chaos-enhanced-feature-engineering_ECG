import React, { useState, useEffect, useCallback, useMemo } from 'react';

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

// Generate different signal types
const generateSignal = (type, length = 100) => {
  switch (type) {
    case 'periodic':
      return Array.from({ length }, (_, i) => Math.sin(i * 0.3) * 0.8);
    case 'chaotic': {
      // Logistic map in chaotic regime
      let x = 0.1;
      const r = 3.9;
      const data = [];
      for (let i = 0; i < length; i++) {
        x = r * x * (1 - x);
        data.push(x * 2 - 1);
      }
      return data;
    }
    case 'drift': {
      // Sine with slow drift
      return Array.from({ length }, (_, i) => 
        Math.sin(i * 0.25) * 0.6 + Math.sin(i * 0.02) * 0.3
      );
    }
    case 'laminar': {
      // Signal with laminar phases (stays constant then jumps)
      const data = [];
      let value = 0.5;
      // Use seeded pseudo-random for consistency
      let seed = 12345;
      const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      for (let i = 0; i < length; i++) {
        if (random() < 0.05) {
          value = random() * 2 - 1;
        }
        data.push(value + (random() - 0.5) * 0.1);
      }
      return data;
    }
    case 'random': {
      // Seeded random for consistency
      let seed = 54321;
      const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      return Array.from({ length }, () => random() * 2 - 1);
    }
    default:
      return Array.from({ length }, (_, i) => Math.sin(i * 0.3));
  }
};

// Compute recurrence matrix
const computeRecurrenceMatrix = (signal, threshold, embeddingDim = 1, delay = 1) => {
  const n = signal.length - (embeddingDim - 1) * delay;
  const matrix = [];
  
  // Create embedded vectors
  const vectors = [];
  for (let i = 0; i < n; i++) {
    const vec = [];
    for (let d = 0; d < embeddingDim; d++) {
      vec.push(signal[i + d * delay]);
    }
    vectors.push(vec);
  }
  
  // Compute distance matrix and threshold
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      // Euclidean distance
      let dist = 0;
      for (let d = 0; d < embeddingDim; d++) {
        dist += Math.pow(vectors[i][d] - vectors[j][d], 2);
      }
      dist = Math.sqrt(dist);
      row.push(dist <= threshold ? 1 : 0);
    }
    matrix.push(row);
  }
  
  return matrix;
};

// Find diagonal lines in recurrence matrix (excluding the main diagonal / Line of Identity)
const findDiagonalLines = (matrix, minLength = 2) => {
  const n = matrix.length;
  const lines = [];
  
  // Check all diagonals above the main diagonal (k > 0)
  for (let k = 1; k < n; k++) {
    let lineLength = 0;
    let lineStart = null;
    
    for (let i = 0; i < n - k; i++) {
      const j = i + k;
      if (matrix[i][j] === 1) {
        if (lineLength === 0) lineStart = { i, j };
        lineLength++;
      } else {
        if (lineLength >= minLength) {
          lines.push({ start: lineStart, length: lineLength, type: 'diagonal', k });
        }
        lineLength = 0;
      }
    }
    if (lineLength >= minLength) {
      lines.push({ start: lineStart, length: lineLength, type: 'diagonal', k });
    }
  }
  
  // Also check diagonals below the main diagonal (k < 0)
  // Due to symmetry, these are mirrors, but we include them for completeness
  for (let k = 1; k < n; k++) {
    let lineLength = 0;
    let lineStart = null;
    
    for (let j = 0; j < n - k; j++) {
      const i = j + k;
      if (matrix[i][j] === 1) {
        if (lineLength === 0) lineStart = { i, j };
        lineLength++;
      } else {
        if (lineLength >= minLength) {
          lines.push({ start: lineStart, length: lineLength, type: 'diagonal', k: -k });
        }
        lineLength = 0;
      }
    }
    if (lineLength >= minLength) {
      lines.push({ start: lineStart, length: lineLength, type: 'diagonal', k: -k });
    }
  }
  
  return lines;
};

// Find vertical lines in recurrence matrix
const findVerticalLines = (matrix, minLength = 2) => {
  const n = matrix.length;
  const lines = [];
  
  for (let j = 0; j < n; j++) {
    let lineLength = 0;
    let lineStart = null;
    
    for (let i = 0; i < n; i++) {
      if (matrix[i][j] === 1) {
        if (lineLength === 0) lineStart = { i, j };
        lineLength++;
      } else {
        if (lineLength >= minLength) {
          lines.push({ start: lineStart, length: lineLength, type: 'vertical' });
        }
        lineLength = 0;
      }
    }
    if (lineLength >= minLength) {
      lines.push({ start: lineStart, length: lineLength, type: 'vertical' });
    }
  }
  
  return lines;
};

// Find horizontal lines in recurrence matrix
const findHorizontalLines = (matrix, minLength = 2) => {
  const n = matrix.length;
  const lines = [];
  
  for (let i = 0; i < n; i++) {
    let lineLength = 0;
    let lineStart = null;
    
    for (let j = 0; j < n; j++) {
      if (matrix[i][j] === 1) {
        if (lineLength === 0) lineStart = { i, j };
        lineLength++;
      } else {
        if (lineLength >= minLength) {
          lines.push({ start: lineStart, length: lineLength, type: 'horizontal' });
        }
        lineLength = 0;
      }
    }
    if (lineLength >= minLength) {
      lines.push({ start: lineStart, length: lineLength, type: 'horizontal' });
    }
  }
  
  return lines;
};

// Main Recurrence Plot Component
const RecurrencePlotVisualization = () => {
  const [signalType, setSignalType] = useState('periodic');
  const [threshold, setThreshold] = useState(0.3);
  const [embeddingDim, setEmbeddingDim] = useState(1);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [highlightMode, setHighlightMode] = useState('none');
  const [showExplanation, setShowExplanation] = useState('rr');
  const [minLineLength, setMinLineLength] = useState(2);
  
  // Ref to track last hover update time for throttling
  const lastHoverUpdate = React.useRef(0);
  const hoverThrottleMs = 16; // ~60fps max
  
  const signal = useMemo(() => generateSignal(signalType, 60), [signalType]);
  const matrix = useMemo(() => computeRecurrenceMatrix(signal, threshold, embeddingDim), [signal, threshold, embeddingDim]);
  
  const diagonalLines = useMemo(() => findDiagonalLines(matrix, minLineLength), [matrix, minLineLength]);
  const verticalLines = useMemo(() => findVerticalLines(matrix, minLineLength), [matrix, minLineLength]);
  const horizontalLines = useMemo(() => findHorizontalLines(matrix, minLineLength), [matrix, minLineLength]);
  
  // Calculate RQA measures - CORRECTED
  const rqaMeasures = useMemo(() => {
    const n = matrix.length;
    const totalPoints = n * n;
    
    // Count all recurrence points
    let allRecurrentPoints = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] === 1) allRecurrentPoints++;
      }
    }
    
    // Recurrence Rate: fraction of all points that are recurrent
    // RR = (1/N²) * Σ R(i,j)
    const RR = allRecurrentPoints / totalPoints;
    
    // For DET and LAM, we need to consider points excluding the Line of Identity (LOI)
    // The LOI is the main diagonal where i = j (always 1 since every state recurs to itself)
    
    // Count recurrent points excluding the main diagonal
    let recurrentPointsExcludingLOI = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && matrix[i][j] === 1) {
          recurrentPointsExcludingLOI++;
        }
      }
    }
    
    // DETERMINISM (DET): fraction of recurrence points that form diagonal lines
    // DET = Σ(l=l_min to N) l·P(l) / Σ(l=l_min to N) l·P(l) + isolated_points
    // Simpler: DET = points_in_diagonal_lines / all_recurrent_points_excluding_LOI
    
    // Count points in diagonal lines (only from upper triangle to avoid double counting in symmetric matrix)
    // Actually, since our diagonal finder includes both triangles, we need to be careful
    // For a symmetric matrix, we could just use upper triangle. Here we'll use all lines but note this.
    const diagPointsInLines = diagonalLines.reduce((sum, line) => sum + line.length, 0);
    
    // Since we found lines in both upper and lower triangles of a symmetric matrix,
    // and the matrix is symmetric, we should use only upper triangle lines
    const upperDiagLines = diagonalLines.filter(line => line.k > 0);
    const upperDiagPointsInLines = upperDiagLines.reduce((sum, line) => sum + line.length, 0);
    
    // For proper DET, use only upper triangle (or multiply by 2 for full matrix)
    // The denominator should be recurrent points in upper triangle excluding LOI
    let upperTriangleRecurrentPoints = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) { // j > i for upper triangle
        if (matrix[i][j] === 1) {
          upperTriangleRecurrentPoints++;
        }
      }
    }
    
    const DET = upperTriangleRecurrentPoints > 0 ? upperDiagPointsInLines / upperTriangleRecurrentPoints : 0;
    
    // LAMINARITY (LAM): fraction of recurrence points that form vertical lines
    // LAM = Σ(v=v_min to N) v·P(v) / Σ R(i,j)
    // Here the denominator is typically all recurrence points (or those in vertical structures)
    
    const vertPointsInLines = verticalLines.reduce((sum, line) => sum + line.length, 0);
    
    // Standard LAM uses all recurrence points in denominator
    const LAM = allRecurrentPoints > 0 ? vertPointsInLines / allRecurrentPoints : 0;
    
    // Average diagonal line length (L)
    const avgDiagLength = upperDiagLines.length > 0 
      ? upperDiagLines.reduce((sum, line) => sum + line.length, 0) / upperDiagLines.length 
      : 0;
    
    // Average vertical line length (Trapping Time, TT)
    const avgVertLength = verticalLines.length > 0 
      ? verticalLines.reduce((sum, line) => sum + line.length, 0) / verticalLines.length 
      : 0;
    
    // Maximum diagonal line length (L_max) - related to divergence
    const maxDiagLength = upperDiagLines.length > 0
      ? Math.max(...upperDiagLines.map(line => line.length))
      : 0;
    
    // Entropy of diagonal line length distribution (ENTR)
    const diagLengthHistogram = {};
    upperDiagLines.forEach(line => {
      diagLengthHistogram[line.length] = (diagLengthHistogram[line.length] || 0) + 1;
    });
    const totalDiagLines = upperDiagLines.length;
    let entropy = 0;
    if (totalDiagLines > 0) {
      Object.values(diagLengthHistogram).forEach(count => {
        const p = count / totalDiagLines;
        if (p > 0) entropy -= p * Math.log(p);
      });
    }
    
    return { 
      RR, 
      DET, 
      LAM, 
      avgDiagLength, 
      avgVertLength, 
      maxDiagLength,
      entropy,
      recurrentPoints: allRecurrentPoints, 
      recurrentPointsExcludingLOI,
      upperTriangleRecurrentPoints,
      diagPointsInLines: upperDiagPointsInLines,
      vertPointsInLines,
      totalPoints,
      numDiagLines: upperDiagLines.length,
      numVertLines: verticalLines.length
    };
  }, [matrix, diagonalLines, verticalLines, minLineLength]);
  
  const n = matrix.length;
  const cellSize = Math.min(4, 240 / n);
  
  // Check if a point is part of highlighted structure
  const isHighlighted = useCallback((i, j) => {
    if (highlightMode === 'diagonal') {
      return diagonalLines.some(line => {
        const k = line.k;
        if (k > 0) {
          // Upper triangle: j - i = k
          return (j - i) === k && i >= line.start.i && i < line.start.i + line.length;
        } else {
          // Lower triangle: i - j = -k
          return (i - j) === (-k) && j >= line.start.j && j < line.start.j + line.length;
        }
      });
    } else if (highlightMode === 'vertical') {
      return verticalLines.some(line => 
        j === line.start.j && i >= line.start.i && i < line.start.i + line.length
      );
    } else if (highlightMode === 'horizontal') {
      return horizontalLines.some(line => 
        i === line.start.i && j >= line.start.j && j < line.start.j + line.length
      );
    }
    return false;
  }, [highlightMode, diagonalLines, verticalLines, horizontalLines]);
  
  // Memoize the matrix cell rendering to prevent re-renders on hover
  const matrixCells = useMemo(() => {
    return matrix.map((row, i) =>
      row.map((cell, j) => {
        const highlighted = isHighlighted(i, j);
        const isLOI = i === j; // Line of Identity
        let color = '#0a0a0f';
        
        if (cell === 1) {
          if (isLOI) {
            color = '#1a1a24'; // Dim the main diagonal
          } else if (highlighted) {
            color = highlightMode === 'diagonal' ? '#f39c12' : 
                    highlightMode === 'vertical' ? '#9b59b6' : '#2ecc71';
          } else {
            color = '#3498db';
          }
        }
        
        return (
          <rect
            key={`${i}-${j}`}
            x={20 + j * cellSize}
            y={20 + i * cellSize}
            width={cellSize - 0.5}
            height={cellSize - 0.5}
            fill={color}
          />
        );
      })
    );
  }, [matrix, highlightMode, isHighlighted, cellSize]);
  
  return (
    <div style={{ background: '#0a0a0f', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ color: '#f0f0f0', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
        Recurrence Plot & RQA Measures
      </h3>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
        A recurrence plot shows when a system revisits similar states. Each dot at (i, j) means 
        "the state at time i is similar to the state at time j". Line structures reveal dynamics.
      </p>
      
      {/* Signal type selection */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { id: 'periodic', label: 'Periodic', desc: 'Regular diagonals' },
          { id: 'chaotic', label: 'Chaotic', desc: 'Short diagonals' },
          { id: 'drift', label: 'Drift', desc: 'Fading patterns' },
          { id: 'laminar', label: 'Laminar', desc: 'Vertical lines' },
          { id: 'random', label: 'Random', desc: 'No structure' }
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setSignalType(type.id)}
            title={type.desc}
            style={{
              padding: '8px 12px',
              background: signalType === type.id ? '#3498db' : '#1a1a24',
              color: signalType === type.id ? '#fff' : '#888',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              transition: 'all 0.2s'
            }}
          >
            {type.label}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Left panel: Signal and Matrix */}
        <div style={{ flex: '1 1 300px' }}>
          {/* Time series signal */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
              Time Series Signal
            </div>
            <svg viewBox="0 0 260 60" style={{ width: '100%', height: '60px', background: '#05050a', borderRadius: '8px' }}>
              <polyline
                points={signal.map((v, i) => `${10 + i * 4},${30 - v * 20}`).join(' ')}
                fill="none"
                stroke="#3498db"
                strokeWidth="1.5"
              />
              {hoveredPoint && (
                <>
                  <circle cx={10 + hoveredPoint.i * 4} cy={30 - signal[hoveredPoint.i] * 20} r="4" fill="#e74c3c" />
                  <circle cx={10 + hoveredPoint.j * 4} cy={30 - signal[hoveredPoint.j] * 20} r="4" fill="#2ecc71" />
                  <line
                    x1={10 + hoveredPoint.i * 4}
                    y1={30 - signal[hoveredPoint.i] * 20}
                    x2={10 + hoveredPoint.j * 4}
                    y2={30 - signal[hoveredPoint.j] * 20}
                    stroke="#ffffff44"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                </>
              )}
            </svg>
            {hoveredPoint && (
              <div style={{ color: '#666', fontSize: '10px', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
                Comparing <span style={{ color: '#e74c3c' }}>t={hoveredPoint.i}</span> with <span style={{ color: '#2ecc71' }}>t={hoveredPoint.j}</span>
                {matrix[hoveredPoint.i] && matrix[hoveredPoint.i][hoveredPoint.j] === 1 && 
                  <span style={{ color: '#3498db' }}> — RECURRENT</span>
                }
              </div>
            )}
          </div>
          
          {/* Recurrence matrix */}
          <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
            Recurrence Matrix (hover to explore)
          </div>
          <svg 
            viewBox={`0 0 ${n * cellSize + 40} ${n * cellSize + 40}`} 
            style={{ width: '100%', maxWidth: '280px', height: 'auto', aspectRatio: '1', background: '#05050a', borderRadius: '8px', cursor: 'crosshair' }}
            onMouseMove={(e) => {
              const now = Date.now();
              if (now - lastHoverUpdate.current < hoverThrottleMs) return;
              lastHoverUpdate.current = now;
              
              const svg = e.currentTarget;
              const rect = svg.getBoundingClientRect();
              const viewBoxWidth = n * cellSize + 40;
              const scale = viewBoxWidth / rect.width;
              const x = (e.clientX - rect.left) * scale;
              const y = (e.clientY - rect.top) * scale;
              const j = Math.floor((x - 20) / cellSize);
              const i = Math.floor((y - 20) / cellSize);
              if (i >= 0 && i < n && j >= 0 && j < n) {
                if (!hoveredPoint || hoveredPoint.i !== i || hoveredPoint.j !== j) {
                  setHoveredPoint({ i, j });
                }
              } else {
                if (hoveredPoint) setHoveredPoint(null);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {/* Axis labels */}
            <text x={n * cellSize / 2 + 20} y={n * cellSize + 35} fill="#666" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">time j →</text>
            <text x="8" y={n * cellSize / 2 + 20} fill="#666" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono" transform={`rotate(-90, 8, ${n * cellSize / 2 + 20})`}>time i →</text>
            
            {/* Matrix cells - memoized to prevent re-renders on hover */}
            {matrixCells}
            
            {/* Hover highlight overlay - separate from matrix cells */}
            {hoveredPoint && (
              <rect
                x={20 + hoveredPoint.j * cellSize}
                y={20 + hoveredPoint.i * cellSize}
                width={cellSize - 0.5}
                height={cellSize - 0.5}
                fill="none"
                stroke="#fff"
                strokeWidth="1.5"
                style={{ pointerEvents: 'none' }}
              />
            )}
            
            {/* Main diagonal indicator */}
            <line 
              x1="20" y1="20" 
              x2={20 + n * cellSize} y2={20 + n * cellSize} 
              stroke="#ffffff22" 
              strokeWidth="0.5" 
              strokeDasharray="2,2"
              style={{ pointerEvents: 'none' }}
            />
          </svg>
        </div>
        
        {/* Right panel: Controls and Measures */}
        <div style={{ flex: '1 1 250px' }}>
          {/* Highlight mode */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '6px', fontFamily: 'JetBrains Mono' }}>
              Highlight Line Structures
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { id: 'none', label: 'None', color: '#666' },
                { id: 'diagonal', label: 'Diagonals', color: '#f39c12' },
                { id: 'vertical', label: 'Verticals', color: '#9b59b6' },
                { id: 'horizontal', label: 'Horizontals', color: '#2ecc71' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setHighlightMode(mode.id)}
                  style={{
                    padding: '6px 10px',
                    background: highlightMode === mode.id ? mode.color : '#1a1a24',
                    color: highlightMode === mode.id ? '#000' : '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px'
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Parameters */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
              Threshold (ε): {threshold.toFixed(2)}
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="0.8" 
              step="0.05" 
              value={threshold} 
              onChange={(e) => setThreshold(parseFloat(e.target.value))} 
              style={{ width: '100%' }} 
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
              Embedding Dimension: {embeddingDim}
            </div>
            <input 
              type="range" 
              min="1" 
              max="3" 
              step="1" 
              value={embeddingDim} 
              onChange={(e) => setEmbeddingDim(parseInt(e.target.value))} 
              style={{ width: '100%' }} 
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
              Min Line Length (l_min): {minLineLength}
            </div>
            <input 
              type="range" 
              min="2" 
              max="5" 
              step="1" 
              value={minLineLength} 
              onChange={(e) => setMinLineLength(parseInt(e.target.value))} 
              style={{ width: '100%' }} 
            />
          </div>
          
          {/* RQA Measures */}
          <div style={{ background: '#0f0f18', borderRadius: '12px', padding: '12px', border: '1px solid #1a1a24' }}>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px', fontFamily: 'JetBrains Mono' }}>
              RQA MEASURES (click for details)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div 
                style={{ 
                  padding: '10px', 
                  background: showExplanation === 'rr' ? '#3498db22' : '#05050a', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  border: showExplanation === 'rr' ? '1px solid #3498db' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                onClick={() => setShowExplanation('rr')}
              >
                <div style={{ color: '#888', fontSize: '10px' }}>Recurrence Rate</div>
                <div style={{ color: '#3498db', fontSize: '20px', fontFamily: 'JetBrains Mono' }}>
                  {(rqaMeasures.RR * 100).toFixed(1)}%
                </div>
              </div>
              <div 
                style={{ 
                  padding: '10px', 
                  background: showExplanation === 'det' ? '#f39c1222' : '#05050a', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  border: showExplanation === 'det' ? '1px solid #f39c12' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                onClick={() => setShowExplanation('det')}
              >
                <div style={{ color: '#888', fontSize: '10px' }}>Determinism</div>
                <div style={{ color: '#f39c12', fontSize: '20px', fontFamily: 'JetBrains Mono' }}>
                  {(rqaMeasures.DET * 100).toFixed(1)}%
                </div>
              </div>
              <div 
                style={{ 
                  padding: '10px', 
                  background: showExplanation === 'lam' ? '#9b59b622' : '#05050a', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  border: showExplanation === 'lam' ? '1px solid #9b59b6' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                onClick={() => setShowExplanation('lam')}
              >
                <div style={{ color: '#888', fontSize: '10px' }}>Laminarity</div>
                <div style={{ color: '#9b59b6', fontSize: '20px', fontFamily: 'JetBrains Mono' }}>
                  {(rqaMeasures.LAM * 100).toFixed(1)}%
                </div>
              </div>
              <div 
                style={{ 
                  padding: '10px', 
                  background: showExplanation === 'L' ? '#2ecc7122' : '#05050a', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  border: showExplanation === 'L' ? '1px solid #2ecc71' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                onClick={() => setShowExplanation('L')}
              >
                <div style={{ color: '#888', fontSize: '10px' }}>Avg Diag Length</div>
                <div style={{ color: '#2ecc71', fontSize: '20px', fontFamily: 'JetBrains Mono' }}>
                  {rqaMeasures.avgDiagLength.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Explanation panel */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        border: '1px solid #1a1a24'
      }}>
        {showExplanation === 'rr' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ color: '#3498db', fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 'bold' }}>
                Recurrence Rate (RR)
              </div>
              <div style={{ color: '#666', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>
                {rqaMeasures.recurrentPoints} / {rqaMeasures.totalPoints} points
              </div>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
              <MathDisplay latex="RR = \frac{1}{N^2} \sum_{i,j=1}^{N} R_{i,j}" display={true} />
            </div>
            <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#3498db' }}>What it measures:</strong> The density of recurrence points — 
              what fraction of all state pairs are "similar enough" (within threshold ε)?
              <br /><br />
              <strong>Interpretation:</strong> Higher RR means the system frequently revisits similar states. 
              Very high RR might indicate the threshold is too large.
            </p>
          </>
        )}
        {showExplanation === 'det' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ color: '#f39c12', fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 'bold' }}>
                Determinism (DET)
              </div>
              <div style={{ color: '#666', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>
                {rqaMeasures.diagPointsInLines} / {rqaMeasures.upperTriangleRecurrentPoints} pts in diagonals
              </div>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
              <MathDisplay latex="DET = \frac{\sum_{l=l_{min}}^{N} l \cdot P(l)}{\sum_{l=1}^{N} l \cdot P(l)}" display={true} />
            </div>
            <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#f39c12' }}>What it measures:</strong> The fraction of recurrence points 
              that form diagonal lines of length ≥ l_min.
              <br /><br />
              <strong>Interpretation:</strong> Diagonal lines mean the system evolved similarly from two similar 
              starting points — that's determinism! High DET suggests predictable dynamics; low DET suggests 
              randomness or high sensitivity to initial conditions.
              <br /><br />
              <span style={{ color: '#666' }}>Note: Main diagonal (i=j) is excluded since every state trivially recurs to itself.</span>
            </p>
          </>
        )}
        {showExplanation === 'lam' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ color: '#9b59b6', fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 'bold' }}>
                Laminarity (LAM)
              </div>
              <div style={{ color: '#666', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>
                {rqaMeasures.vertPointsInLines} / {rqaMeasures.recurrentPoints} pts in verticals
              </div>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
              <MathDisplay latex="LAM = \frac{\sum_{v=v_{min}}^{N} v \cdot P(v)}{\sum_{i,j=1}^{N} R_{i,j}}" display={true} />
            </div>
            <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#9b59b6' }}>What it measures:</strong> The fraction of recurrence points 
              that form vertical (or horizontal) lines of length ≥ v_min.
              <br /><br />
              <strong>Interpretation:</strong> Vertical lines mean the system got "stuck" — it stayed in the 
              same state (or very similar states) for multiple consecutive time steps. High LAM indicates 
              laminar phases or intermittency in the dynamics.
            </p>
          </>
        )}
        {showExplanation === 'L' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ color: '#2ecc71', fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 'bold' }}>
                Average Diagonal Line Length (L)
              </div>
              <div style={{ color: '#666', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>
                {rqaMeasures.numDiagLines} lines found
              </div>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
              <MathDisplay latex="L = \frac{\sum_{l=l_{min}}^{N} l \cdot P(l)}{\sum_{l=l_{min}}^{N} P(l)}" display={true} />
            </div>
            <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#2ecc71' }}>What it measures:</strong> The average length of diagonal 
              line structures in the recurrence plot.
              <br /><br />
              <strong>Interpretation:</strong> Longer diagonal lines mean the system follows similar trajectories 
              for longer periods. This is inversely related to the largest Lyapunov exponent — highly chaotic 
              systems have short diagonals (L is small), while periodic systems have long diagonals.
              <br /><br />
              <span style={{ color: '#666' }}>Max diagonal length: {rqaMeasures.maxDiagLength} | Entropy: {rqaMeasures.entropy.toFixed(2)}</span>
            </p>
          </>
        )}
      </div>
      
      {/* Line structure interpretation guide */}
      <div style={{ 
        marginTop: '16px', 
        padding: '16px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        borderLeft: '3px solid #f39c12'
      }}>
        <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: 1.8 }}>
          <strong style={{ color: '#f0f0f0' }}>Reading the Recurrence Plot:</strong>
          <br />
          <span style={{ color: '#f39c12' }}>● Diagonal lines</span> — System follows similar trajectories (deterministic behavior)
          <br />
          <span style={{ color: '#9b59b6' }}>● Vertical/horizontal lines</span> — System gets stuck in a state (laminar phases)
          <br />
          <span style={{ color: '#3498db' }}>● Isolated points</span> — Random or highly complex dynamics
          <br />
          <span style={{ color: '#666' }}>● White bands</span> — Non-stationarity or abrupt changes in dynamics
        </p>
      </div>
    </div>
  );
};

// Step-by-Step Builder Component
const StepByStepBuilder = () => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  
  const signal = [0.2, 0.8, 0.3, 0.9, 0.25, 0.85, 0.35, 0.5];
  const threshold = 0.3;
  
  const steps = [
    {
      title: "1. Start with a Time Series",
      description: "We have a signal measured at discrete time points. Each point represents the system's state at that moment.",
      highlight: 'signal'
    },
    {
      title: "2. Pick Two Time Points",
      description: "To check for recurrence, we compare the state at time i with the state at time j. Are they similar?",
      highlight: 'compare',
      i: 1,
      j: 5
    },
    {
      title: "3. Check Distance",
      description: `If the distance between states is less than threshold ε = ${threshold}, we mark them as recurrent (similar).`,
      highlight: 'distance',
      i: 1,
      j: 5
    },
    {
      title: "4. Build the Matrix",
      description: "Repeat for all pairs (i, j). If states are similar, plot a dot. The result is the recurrence matrix.",
      highlight: 'matrix'
    },
    {
      title: "5. Find Patterns",
      description: "Diagonal lines show deterministic behavior. Vertical lines show laminar (stuck) states. Isolated dots suggest randomness.",
      highlight: 'patterns'
    }
  ];
  
  useEffect(() => {
    if (autoPlay && step < steps.length - 1) {
      const timer = setTimeout(() => setStep(s => s + 1), 3000);
      return () => clearTimeout(timer);
    } else if (autoPlay && step >= steps.length - 1) {
      setAutoPlay(false);
    }
  }, [autoPlay, step, steps.length]);
  
  // Build recurrence matrix for this signal
  const matrix = signal.map((vi, i) => 
    signal.map((vj, j) => Math.abs(vi - vj) <= threshold ? 1 : 0)
  );
  
  const currentStep = steps[step];
  
  return (
    <div style={{ background: '#0a0a0f', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ color: '#f0f0f0', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
        Building a Recurrence Plot: Step by Step
      </h3>
      
      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {steps.map((_, idx) => (
          <div
            key={idx}
            onClick={() => setStep(idx)}
            style={{
              flex: 1,
              height: '4px',
              background: idx <= step ? '#3498db' : '#1a1a24',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          />
        ))}
      </div>
      
      {/* Current step info */}
      <div style={{ 
        background: '#0f0f18', 
        borderRadius: '12px', 
        padding: '16px', 
        marginBottom: '20px',
        borderLeft: '3px solid #3498db'
      }}>
        <div style={{ color: '#3498db', fontFamily: 'JetBrains Mono', fontSize: '14px', marginBottom: '8px' }}>
          {currentStep.title}
        </div>
        <p style={{ color: '#888', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
          {currentStep.description}
        </p>
      </div>
      
      {/* Visualization area */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Signal */}
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
            Time Series
          </div>
          <svg viewBox="0 0 180 80" style={{ width: '100%', height: '80px', background: '#05050a', borderRadius: '8px' }}>
            {/* Signal line */}
            <polyline
              points={signal.map((v, i) => `${20 + i * 20},${60 - v * 50}`).join(' ')}
              fill="none"
              stroke={currentStep.highlight === 'signal' ? '#3498db' : '#444'}
              strokeWidth="2"
            />
            
            {/* Points */}
            {signal.map((v, i) => {
              let color = '#666';
              let size = 4;
              
              if (currentStep.highlight === 'compare' || currentStep.highlight === 'distance') {
                if (i === currentStep.i) { color = '#e74c3c'; size = 6; }
                if (i === currentStep.j) { color = '#2ecc71'; size = 6; }
              }
              
              return (
                <g key={i}>
                  <circle cx={20 + i * 20} cy={60 - v * 50} r={size} fill={color} />
                  <text x={20 + i * 20} y={75} fill="#666" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">
                    {i}
                  </text>
                </g>
              );
            })}
            
            {/* Distance line for step 3 */}
            {currentStep.highlight === 'distance' && (
              <>
                <line
                  x1={20 + currentStep.i * 20}
                  y1={60 - signal[currentStep.i] * 50}
                  x2={20 + currentStep.j * 20}
                  y2={60 - signal[currentStep.j] * 50}
                  stroke="#fff"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={(20 + currentStep.i * 20 + 20 + currentStep.j * 20) / 2}
                  y={(60 - signal[currentStep.i] * 50 + 60 - signal[currentStep.j] * 50) / 2 - 5}
                  fill="#fff"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                >
                  d = {Math.abs(signal[currentStep.i] - signal[currentStep.j]).toFixed(2)}
                </text>
              </>
            )}
          </svg>
        </div>
        
        {/* Matrix */}
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
            Recurrence Matrix
          </div>
          <svg viewBox="0 0 180 180" style={{ width: '100%', height: '180px', background: '#05050a', borderRadius: '8px' }}>
            {/* Matrix grid */}
            {matrix.map((row, i) =>
              row.map((cell, j) => {
                let showCell = currentStep.highlight === 'matrix' || currentStep.highlight === 'patterns';
                let color = '#1a1a24';
                
                if (showCell && cell === 1) {
                  color = '#3498db';
                  
                  // Highlight patterns in step 5
                  if (currentStep.highlight === 'patterns') {
                    // Diagonal pattern (excluding main diagonal)
                    if (Math.abs(i - j) === 4 || Math.abs(i - j) === 2) {
                      color = '#f39c12';
                    }
                  }
                }
                
                // Highlight specific comparison
                if ((currentStep.highlight === 'compare' || currentStep.highlight === 'distance') &&
                    ((i === currentStep.i && j === currentStep.j) || (i === currentStep.j && j === currentStep.i))) {
                  color = cell === 1 ? '#2ecc71' : '#e74c3c';
                }
                
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={20 + j * 18}
                    y={20 + i * 18}
                    width={16}
                    height={16}
                    fill={color}
                    rx="2"
                  />
                );
              })
            )}
            
            {/* Row/column labels */}
            {signal.map((_, i) => (
              <g key={i}>
                <text x={28 + i * 18} y={15} fill="#666" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">{i}</text>
                <text x={12} y={32 + i * 18} fill="#666" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">{i}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      
      {/* Navigation */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{
            padding: '10px 20px',
            background: step === 0 ? '#1a1a24' : '#3498db',
            color: step === 0 ? '#444' : '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: step === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => { setStep(0); setAutoPlay(true); }}
          style={{
            padding: '10px 20px',
            background: autoPlay ? '#e74c3c' : '#1a1a24',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          {autoPlay ? '⏹ Stop' : '▶ Auto Play'}
        </button>
        <button
          onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
          style={{
            padding: '10px 20px',
            background: step === steps.length - 1 ? '#1a1a24' : '#3498db',
            color: step === steps.length - 1 ? '#444' : '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: step === steps.length - 1 ? 'not-allowed' : 'pointer',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// Formula Reference Component
const FormulaReference = () => {
  const [katexLoaded, setKatexLoaded] = React.useState(false);
  
  // Load KaTeX dynamically
  React.useEffect(() => {
    if (window.katex) {
      setKatexLoaded(true);
      return;
    }
    
    // Load KaTeX CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
    
    // Load KaTeX JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    script.onload = () => setKatexLoaded(true);
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);
  
  const formulas = [
    {
      name: 'Recurrence Rate',
      abbrev: 'RR',
      color: '#3498db',
      latex: 'RR = \\frac{1}{N^2} \\sum_{i,j=1}^{N} R_{i,j}',
      description: 'Fraction of recurrence points in the whole matrix. Measures how often states recur.',
      where: 'R_{i,j} = \\Theta(\\varepsilon - \\|\\vec{x}_i - \\vec{x}_j\\|)',
      whereDesc: 'where Θ is the Heaviside function (1 if distance < ε, else 0)'
    },
    {
      name: 'Determinism',
      abbrev: 'DET',
      color: '#f39c12',
      latex: 'DET = \\frac{\\sum_{l=l_{\\min}}^{N} l \\cdot P(l)}{\\sum_{l=1}^{N} l \\cdot P(l)}',
      description: 'Fraction of recurrence points forming diagonal lines of at least length l_min. Excludes the main diagonal (LOI).',
      where: 'P(l) = \\text{histogram of diagonal line lengths}',
      whereDesc: 'P(l) counts how many diagonal lines have exactly length l'
    },
    {
      name: 'Laminarity',
      abbrev: 'LAM',
      color: '#9b59b6',
      latex: 'LAM = \\frac{\\sum_{v=v_{\\min}}^{N} v \\cdot P(v)}{\\sum_{i,j=1}^{N} R_{i,j}}',
      description: 'Fraction of recurrence points forming vertical lines. Indicates laminar (stuck) states.',
      where: 'P(v) = \\text{histogram of vertical line lengths}',
      whereDesc: 'P(v) counts how many vertical lines have exactly length v'
    }
  ];
  
  return (
    <div style={{ background: '#0a0a0f', borderRadius: '16px', padding: '24px' }}>
      <h3 style={{ color: '#f0f0f0', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
        RQA Formulas Reference
      </h3>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px', lineHeight: 1.6 }}>
        Mathematical definitions of the key recurrence quantification measures.
      </p>
      
      {!katexLoaded ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
          Loading mathematical notation...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {formulas.map((formula) => (
            <div 
              key={formula.abbrev}
              style={{ 
                background: '#05050a', 
                borderRadius: '12px', 
                padding: '20px', 
                border: `1px solid ${formula.color}33`,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ color: formula.color, fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 'bold' }}>
                  {formula.name}
                </div>
                <div style={{ 
                  background: `${formula.color}22`, 
                  color: formula.color, 
                  padding: '4px 10px', 
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px'
                }}>
                  {formula.abbrev}
                </div>
              </div>
              
              {/* Main Formula */}
              <div style={{ 
                background: '#0a0a0f', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '12px',
                textAlign: 'center',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MathDisplay latex={formula.latex} display={true} />
              </div>
              
              {/* Description */}
              <p style={{ color: '#888', fontSize: '12px', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                {formula.description}
              </p>
              
              {/* Where clause */}
              <div style={{ 
                background: '#0f0f18', 
                borderRadius: '6px', 
                padding: '10px',
                borderLeft: `2px solid ${formula.color}44`
              }}>
                <div style={{ marginBottom: '4px', textAlign: 'center' }}>
                  <MathDisplay latex={formula.where} display={false} />
                </div>
                <div style={{ color: '#555', fontSize: '10px', textAlign: 'center' }}>
                  {formula.whereDesc}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Recurrence Matrix Definition */}
      <div style={{ 
        marginTop: '24px', 
        padding: '20px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        border: '1px solid #3498db33'
      }}>
        <div style={{ color: '#3498db', fontFamily: 'JetBrains Mono', fontSize: '14px', marginBottom: '12px' }}>
          Foundation: The Recurrence Matrix
        </div>
        {katexLoaded && (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <MathDisplay 
              latex="R_{i,j}(\varepsilon) = \Theta\Big(\varepsilon - \lVert \mathbf{x}_i - \mathbf{x}_j \rVert \Big), \quad i,j = 1, \ldots, N" 
              display={true} 
            />
          </div>
        )}
        <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: 1.6, textAlign: 'center' }}>
          The recurrence matrix R is binary: <span style={{ color: '#fff' }}>1</span> if states at times i and j are within threshold ε, <span style={{ color: '#666' }}>0</span> otherwise.
          <br />
          The main diagonal (i = j) is the <strong>Line of Identity (LOI)</strong> — always 1 since every state recurs to itself.
        </p>
      </div>
      
      {/* Additional measures */}
      <div style={{ 
        marginTop: '16px', 
        padding: '16px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        border: '1px solid #2ecc7133'
      }}>
        <div style={{ color: '#2ecc71', fontFamily: 'JetBrains Mono', fontSize: '14px', marginBottom: '12px' }}>
          Additional Measures
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#05050a', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Average Diagonal Length (L)</div>
            {katexLoaded && <MathDisplay latex="L = \frac{\sum l \cdot P(l)}{\sum P(l)}" display={false} />}
            <div style={{ color: '#555', fontSize: '10px', marginTop: '4px' }}>Inversely related to largest Lyapunov exponent</div>
          </div>
          <div style={{ background: '#05050a', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Trapping Time (TT)</div>
            {katexLoaded && <MathDisplay latex="TT = \frac{\sum v \cdot P(v)}{\sum P(v)}" display={false} />}
            <div style={{ color: '#555', fontSize: '10px', marginTop: '4px' }}>Average vertical line length</div>
          </div>
          <div style={{ background: '#05050a', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>Entropy (ENTR)</div>
            {katexLoaded && <MathDisplay latex="ENTR = -\sum p(l) \ln p(l)" display={false} />}
            <div style={{ color: '#555', fontSize: '10px', marginTop: '4px' }}>Shannon entropy of line length distribution</div>
          </div>
        </div>
      </div>
      
      {/* Key insight */}
      <div style={{ 
        marginTop: '16px', 
        padding: '16px', 
        background: '#0f0f18', 
        borderRadius: '12px',
        borderLeft: '3px solid #f39c12'
      }}>
        <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: '#f0f0f0' }}>The key insight:</strong> Different line orientations reveal different dynamics.
          <span style={{ color: '#f39c12' }}> Diagonal lines</span> show the system following similar trajectories (deterministic).
          <span style={{ color: '#9b59b6' }}> Vertical/horizontal lines</span> show the system getting stuck (laminar phases).
          <span style={{ color: '#3498db' }}> Isolated points</span> suggest randomness or high complexity.
        </p>
      </div>
    </div>
  );
};

// Main App
export default function RQAVisualization() {
  const [activeSection, setActiveSection] = useState('interactive');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1419 50%, #0a0a0f 100%)',
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
          background: #3498db;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
      
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            color: '#f0f0f0', 
            fontSize: '28px', 
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: '8px'
          }}>
            <span style={{ color: '#3498db' }}>Recurrence</span> Quantification Analysis
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Visualize how systems revisit their past — and what that reveals about their dynamics
          </p>
        </div>
        
        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '24px',
          background: '#0a0a0f',
          padding: '4px',
          borderRadius: '12px'
        }}>
          {[
            { id: 'builder', label: 'Step-by-Step', desc: 'Learn how it works' },
            { id: 'interactive', label: 'Interactive Plot', desc: 'Explore freely' },
            { id: 'formulas', label: 'Formulas', desc: 'Quick reference' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                flex: 1,
                padding: '12px 8px',
                background: activeSection === section.id ? '#3498db' : 'transparent',
                color: activeSection === section.id ? '#000' : '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
                fontWeight: activeSection === section.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {section.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        {activeSection === 'builder' && <StepByStepBuilder />}
        {activeSection === 'interactive' && <RecurrencePlotVisualization />}
        {activeSection === 'formulas' && <FormulaReference />}
        
        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px', 
          padding: '16px',
          borderTop: '1px solid #1a1a24'
        }}>
          <p style={{ color: '#444', fontSize: '12px' }}>
            Hover over the recurrence plot to see which time points are being compared
          </p>
        </div>
      </div>
    </div>
  );
}
