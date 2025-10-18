import React from 'react';
import { createRoot } from 'react-dom/client';
import GeographyCharts from './GeographyCharts.jsx';

// Auto-mount to any element with id="geography-charts-root"
const rootElement = document.getElementById('geography-charts-root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<GeographyCharts />);
}

// Also export for programmatic use
export default GeographyCharts;
