import { useState } from 'react'
import RQAVisualization from './RQAVisualization'
import ChaosVisualization from './ChaosVisualization'

function App() {
  const [showRQA, setShowRQA] = useState(true)

  return (
    <div style={{ position: 'relative' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setShowRQA(!showRQA)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 16px',
          background: showRQA ? '#3498db' : '#ff6b35',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
        }}
      >
        {showRQA ? '→ Chaos Viz' : '← RQA Viz'}
      </button>

      {/* Render the selected visualization */}
      {showRQA ? <RQAVisualization /> : <ChaosVisualization />}
    </div>
  )
}

export default App
