import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * PopulationChart - Log-log scatter plot comparing population to unique visits
 * This component is designed to be embedded in blog posts
 */
export default function PopulationChart() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    Promise.all([
      fetch('/widgets/country_uniques.json').then(r => r.json()),
      fetch('/widgets/country_population.json').then(r => r.json())
    ])
      .then(([uniquesMap, popMap]) => {
        const entries = Object.entries(uniquesMap);
        const rows = entries
          .map(([country, uniques]) => {
            const population = popMap[country];
            return {
              country,
              uniques: Number(uniques),
              population: Number(population)
            };
          })
          .filter(d =>
            Number.isFinite(d.uniques) &&
            Number.isFinite(d.population) &&
            d.uniques > 0 &&
            d.population > 0
          );
        setData(rows);
      })
      .catch(err => {
        console.error('Failed to load analytics data', err);
        setError('Failed to load analytics data.');
      });
  }, []);

  // Render chart when data changes
  useEffect(() => {
    if (!data.length || !svgRef.current || !containerRef.current) return;

    // Chart rendering logic will go here
    // (D3 code from the original charts.js)

  }, [data]);

  if (error) {
    return <div style={{ padding: '1rem', color: '#666' }}>{error}</div>;
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '500px', position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      {/* Tooltip will be added here */}
    </div>
  );
}
