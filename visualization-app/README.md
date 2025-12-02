# Visualization App

A React application with two interactive visualizations: RQA (Recurrence Quantification Analysis) and Chaos Measures.

## Features

- **RQA Visualization**: Interactive recurrence plot with quantification measures
- **Chaos Visualization**: Lyapunov Exponent, Sample Entropy, and Fractal Dimension
- **Simple Toggle**: A button in the top-right corner to switch between visualizations

## Getting Started

### Prerequisites

- Node.js (version 16 or higher recommended)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd visualization-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is busy).

### Building for Production

Create a production build:
```bash
npm run build
```

The built files will be in the `dist` folder.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Usage

- Click the toggle button in the top-right corner to switch between the two visualizations
- Each visualization maintains its own UI and interactive features
- The button changes color based on which visualization is active

## Project Structure

```
visualization-app/
├── src/
│   ├── App.jsx                    # Main app with toggle logic
│   ├── RQAVisualization.jsx       # RQA visualization component
│   ├── ChaosVisualization.jsx     # Chaos measures visualization component
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Basic styles
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── vite.config.js                 # Vite configuration
└── README.md                      # This file
```

## Technologies Used

- React 18
- Vite 6
- KaTeX (loaded dynamically for math rendering)
