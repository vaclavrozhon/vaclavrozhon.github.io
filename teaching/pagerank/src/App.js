import React, { useState, useEffect } from 'react';

const App = () => {
  const [iterationData, setIterationData] = useState({});
  const [selectedIteration, setSelectedIteration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableIterations, setAvailableIterations] = useState([]);
  const [showBottom, setShowBottom] = useState(false);
  const [degreeData, setDegreeData] = useState(null);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    loadAllIterations();
    loadDegreeDistribution();
    loadMetadata();
  }, []);

  const loadDegreeDistribution = async () => {
    try {
      const response = await fetch('/degree_distributions.json');
      if (response.ok) {
        const data = await response.json();
        setDegreeData(data);
        console.log('✓ Degree distribution data loaded:', data);
      } else {
        console.log('✗ Degree distribution file not found');
      }
    } catch (err) {
      console.error('Error loading degree distribution:', err);
    }
  };

  const loadMetadata = async () => {
    try {
      const response = await fetch('/metadata.json');
      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
        console.log('✓ Metadata loaded:', data);
      } else {
        console.log('✗ Metadata file not found');
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
    }
  };

  const loadAllIterations = async () => {
    setLoading(true);
    setError(null);

    console.log('Starting to load PageRank iterations...');

    try {
      const iterations = {};
      const available = [];

      // Try to load iterations 0-20 (adjust as needed)
      for (let i = 0; i <= 20; i++) {
        try {
          const filename = `/pagerank_iter_${i.toString().padStart(2, '0')}.json`;
          console.log(`Attempting to fetch: ${filename}`);
          const response = await fetch(filename);
          console.log(`Response for ${filename}: status=${response.status}, ok=${response.ok}`);

          if (response.ok) {
            // First check if it's actually JSON (not HTML)
            const contentType = response.headers.get('content-type');
            console.log(`Content-Type for ${filename}: ${contentType}`);

            const text = await response.text();
            console.log(`First 100 chars of ${filename}: ${text.substring(0, 100)}`);

            // Check if response is HTML (error page) instead of JSON
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
              console.log(`✗ Got HTML instead of JSON for iteration ${i}, stopping search`);
              break; // Stop looking for more files
            }

            try {
              const data = JSON.parse(text);
              console.log(`Parsed data for iteration ${i}:`, data);
              // Handle both old format (results) and new format (top_results/bottom_results)
              if (data.top_results || data.results) {
                console.log(`✓ Valid data found for iteration ${i}`);
                iterations[i] = data;
                available.push(i);
              } else {
                console.log(`✗ No valid results in iteration ${i} data`);
              }
            } catch (parseErr) {
              console.error(`Failed to parse JSON for iteration ${i}:`, parseErr);
            }
          } else if (response.status === 404) {
            console.log(`✗ File not found for iteration ${i}, stopping search`);
            break; // Stop looking for more files
          }
        } catch (err) {
          console.error(`Error loading iteration ${i}:`, err);
          // Network error, continue to next iteration
          continue;
        }
      }

      console.log(`Total iterations loaded: ${available.length}`);
      console.log('Available iterations:', available);
      console.log('Iterations data:', iterations);

      if (available.length === 0) {
        console.error('No valid PageRank files found!');
        throw new Error('No PageRank result files found. Please run the C++ program first.');
      }

      setIterationData(iterations);
      setAvailableIterations(available);
      setSelectedIteration(available[0]);
      console.log('Successfully set state with iterations');
    } catch (err) {
      console.error('Error in loadAllIterations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score) => {
    return parseFloat(score).toExponential(3);
  };

  const getRankClass = (rank) => {
    if (rank <= 3) return 'rank-row top-3';
    if (rank <= 10) return 'rank-row top-10';
    if (rank <= 25) return 'rank-row top-25';
    return 'rank-row';
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          🔍 Loading PageRank results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="header">
          <h1>PageRank Viewer</h1>
          <p>English Wikipedia (2010) PageRank Visualization</p>
        </div>
        <div className="error">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <p><strong>Instructions:</strong></p>
          <ol style={{textAlign: 'left', marginTop: '1rem'}}>
            <li>Compile: <code>make</code></li>
            <li>Run: <code>./pagerank</code></li>
            <li>Start server: <code>npm start</code></li>
          </ol>
        </div>
      </div>
    );
  }

  const currentData = iterationData[selectedIteration];
  if (!currentData) {
    return (
      <div className="app">
        <div className="no-data">No data available for iteration {selectedIteration}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🔍 PageRank Viewer</h1>
        <p>English Wikipedia ({metadata?.year || '2003'}) PageRank Visualization</p>
        {metadata && (
          <p style={{fontSize: '0.9em', opacity: 0.8}}>
            Dataset: {metadata.dataset} • {metadata.total_nodes.toLocaleString()} nodes • {metadata.total_edges.toLocaleString()} edges
          </p>
        )}
      </div>


      <div className="results-container">
        {/* Global Data Section - Always Shown First */}
        {degreeData && (
          <div className="degree-distribution">
            <h3>📊 Degree Distribution Analysis</h3>
            <div className="degree-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Nodes:</span>
                  <span className="stat-value">{degreeData?.stats?.total_nodes?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Edges:</span>
                  <span className="stat-value">{degreeData?.stats?.total_edges?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg In-Degree:</span>
                  <span className="stat-value">{degreeData?.stats?.avg_in_degree?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Max In-Degree:</span>
                  <span className="stat-value">{degreeData?.stats?.max_in_degree?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Out-Degree:</span>
                  <span className="stat-value">{degreeData?.stats?.avg_out_degree?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Max Out-Degree:</span>
                  <span className="stat-value">{degreeData?.stats?.max_out_degree?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="degree-charts">
              <div className="degree-chart">
                <h4>📈 In-Degree Distribution</h4>
                <svg width="500" height="300" className="chart">
                  <g>
                    {/* Plot bars for degrees up to 50 */}
                    {(() => {
                      const data = degreeData?.in_degree_distribution || [];
                      const maxDegree = Math.min(50, Math.max(...data.map(d => d.degree), 0));
                      const maxCount = Math.max(...data.map(d => d.count), 1);

                      return data.filter(item => item.degree <= maxDegree).map((item) => {
                        const x = 60 + (item.degree * 380) / maxDegree;
                        const barHeight = Math.max(1, (item.count / maxCount) * 200);
                        const y = 240 - barHeight;

                        return (
                          <g key={`in-${item.degree}`}>
                            <rect
                              x={x}
                              y={y}
                              width={Math.max(2, 380 / maxDegree * 0.8)}
                              height={barHeight}
                              fill="#667eea"
                              opacity="0.8"
                            />
                          </g>
                        );
                      });
                    })()}

                    {/* X-axis */}
                    <line x1="50" y1="240" x2="450" y2="240" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                    {/* Y-axis */}
                    <line x1="50" y1="40" x2="50" y2="240" stroke="#ffffff" strokeWidth="1" opacity="0.5" />

                    {/* X-axis labels */}
                    {(() => {
                      const data = degreeData?.in_degree_distribution || [];
                      const maxDegree = Math.min(50, Math.max(...data.map(d => d.degree), 0));
                      const stepSize = Math.max(1, Math.ceil(maxDegree / 10));
                      const labels = [];
                      for (let i = 0; i <= maxDegree; i += stepSize) {
                        labels.push(i);
                      }
                      if (labels[labels.length - 1] !== maxDegree) {
                        labels.push(maxDegree);
                      }

                      return labels.map(degree => {
                        const x = 60 + (degree * 380) / maxDegree;
                        return (
                          <g key={`x-label-in-${degree}`}>
                            <line x1={x} y1="240" x2={x} y2="245" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                            <text x={x} y="260" textAnchor="middle" fill="white" fontSize="10">
                              {degree}
                            </text>
                          </g>
                        );
                      });
                    })()}

                    {/* Y-axis labels */}
                    {(() => {
                      const data = degreeData?.in_degree_distribution || [];
                      const maxCount = Math.max(...data.map(d => d.count), 1);
                      const steps = [0, Math.floor(maxCount * 0.25), Math.floor(maxCount * 0.5), Math.floor(maxCount * 0.75), maxCount];
                      return steps.map(count => {
                        const y = 240 - (count / maxCount) * 200;
                        return (
                          <g key={`y-label-in-${count}`}>
                            <line x1="45" y1={y} x2="50" y2={y} stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                            <text x="40" y={y + 3} textAnchor="end" fill="white" fontSize="9">
                              {count.toLocaleString()}
                            </text>
                          </g>
                        );
                      });
                    })()}

                    {/* Axis titles */}
                    <text x="250" y="285" textAnchor="middle" fill="white" fontSize="12">In-Degree</text>
                    <text x="20" y="140" textAnchor="middle" fill="white" fontSize="12" transform="rotate(-90, 20, 140)">Count</text>
                  </g>
                </svg>
              </div>

              <div className="degree-chart">
                <h4>📉 Out-Degree Distribution</h4>
                <svg width="500" height="300" className="chart">
                  <g>
                    {/* Plot bars for degrees up to 50 */}
                    {(() => {
                      const data = degreeData?.out_degree_distribution || [];
                      const maxDegree = Math.min(50, Math.max(...data.map(d => d.degree), 0));
                      const maxCount = Math.max(...data.map(d => d.count), 1);

                      return data.filter(item => item.degree <= maxDegree).map((item) => {
                        const x = 60 + (item.degree * 380) / maxDegree;
                        const barHeight = Math.max(1, (item.count / maxCount) * 200);
                        const y = 240 - barHeight;

                        return (
                          <g key={`out-${item.degree}`}>
                            <rect
                              x={x}
                              y={y}
                              width={Math.max(2, 380 / maxDegree * 0.8)}
                              height={barHeight}
                              fill="#764ba2"
                              opacity="0.8"
                            />
                          </g>
                        );
                      });
                    })()}

                    {/* X-axis */}
                    <line x1="50" y1="240" x2="450" y2="240" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                    {/* Y-axis */}
                    <line x1="50" y1="40" x2="50" y2="240" stroke="#ffffff" strokeWidth="1" opacity="0.5" />

                    {/* X-axis labels */}
                    {(() => {
                      const data = degreeData?.out_degree_distribution || [];
                      const maxDegree = Math.min(50, Math.max(...data.map(d => d.degree), 0));
                      const stepSize = Math.max(1, Math.ceil(maxDegree / 10));
                      const labels = [];
                      for (let i = 0; i <= maxDegree; i += stepSize) {
                        labels.push(i);
                      }
                      if (labels[labels.length - 1] !== maxDegree) {
                        labels.push(maxDegree);
                      }

                      return labels.map(degree => {
                        const x = 60 + (degree * 380) / maxDegree;
                        return (
                          <g key={`x-label-out-${degree}`}>
                            <line x1={x} y1="240" x2={x} y2="245" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                            <text x={x} y="260" textAnchor="middle" fill="white" fontSize="10">
                              {degree}
                            </text>
                          </g>
                        );
                      });
                    })()}

                    {/* Y-axis labels */}
                    {(() => {
                      const data = degreeData?.out_degree_distribution || [];
                      const maxCount = Math.max(...data.map(d => d.count), 1);
                      const steps = [0, Math.floor(maxCount * 0.25), Math.floor(maxCount * 0.5), Math.floor(maxCount * 0.75), maxCount];
                      return steps.map(count => {
                        const y = 240 - (count / maxCount) * 200;
                        return (
                          <g key={`y-label-out-${count}`}>
                            <line x1="45" y1={y} x2="50" y2={y} stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                            <text x="40" y={y + 3} textAnchor="end" fill="white" fontSize="9">
                              {count.toLocaleString()}
                            </text>
                          </g>
                        );
                      });
                    })()}

                    {/* Axis titles */}
                    <text x="250" y="285" textAnchor="middle" fill="white" fontSize="12">Out-Degree</text>
                    <text x="20" y="140" textAnchor="middle" fill="white" fontSize="12" transform="rotate(-90, 20, 140)">Count</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* L1 Convergence Graph - Always Shown */}
        <div className="convergence-graph">
          <h3>📊 Convergence Graph</h3>
          <p>L1 distance between consecutive iterations (lower = more converged)</p>
          <svg width="600" height="200" className="chart">
            <g>
              {(availableIterations || []).slice(1).map((iter, index) => {
                const data = iterationData[iter];
                if (!data || data.l1_distance === undefined) return null;

                const x = 50 + (index * 500) / Math.max(1, availableIterations.length - 2);
                const maxL1 = Math.max(...(availableIterations || []).slice(1).map(i => iterationData[i]?.l1_distance || 0));
                const y = 180 - (data.l1_distance / maxL1) * 140;

                return (
                  <g key={iter}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={selectedIteration === iter ? "#ffd700" : "#ffffff"}
                      stroke="#667eea"
                      strokeWidth="2"
                      className="chart-point"
                      onClick={() => setSelectedIteration(iter)}
                    />
                    <text
                      x={x}
                      y={195}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                    >
                      {iter}
                    </text>
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      fill="#b8c5ff"
                      fontSize="10"
                    >
                      {data.l1_distance.toExponential(1)}
                    </text>
                  </g>
                );
              })}

              {(availableIterations || []).slice(1).length > 1 && (availableIterations || []).slice(1).map((iter, index) => {
                if (index === 0) return null;
                const prevIter = availableIterations[index];
                const currData = iterationData[iter];
                const prevData = iterationData[prevIter];

                if (!currData || !prevData || currData.l1_distance === undefined || prevData.l1_distance === undefined) return null;

                const maxL1 = Math.max(...(availableIterations || []).slice(1).map(i => iterationData[i]?.l1_distance || 0));
                const x1 = 50 + ((index - 1) * 500) / Math.max(1, availableIterations.length - 2);
                const y1 = 180 - (prevData.l1_distance / maxL1) * 140;
                const x2 = 50 + (index * 500) / Math.max(1, availableIterations.length - 2);
                const y2 = 180 - (currData.l1_distance / maxL1) * 140;

                return (
                  <line
                    key={`line-${iter}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#667eea"
                    strokeWidth="2"
                    opacity="0.7"
                  />
                );
              })}

              <line x1="40" y1="40" x2="40" y2="180" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
              <line x1="40" y1="180" x2="560" y2="180" stroke="#ffffff" strokeWidth="1" opacity="0.3" />

              <text x="25" y="45" fill="white" fontSize="10" textAnchor="middle">High</text>
              <text x="25" y="180" fill="white" fontSize="10" textAnchor="middle">Low</text>
              <text x="300" y="215" fill="white" fontSize="12" textAnchor="middle">Iteration</text>
            </g>
          </svg>
        </div>

        {/* Top/Bottom 100 Section - Shown Below Global Data */}
        <div className="view-controls">
          <div className="iteration-controls">
            {availableIterations.map(iter => (
              <button
                key={iter}
                className={`iteration-btn ${selectedIteration === iter ? 'active' : ''}`}
                onClick={() => setSelectedIteration(iter)}
              >
                {iter === 0 ? 'Initial' : `Iter ${iter}`}
              </button>
            ))}
          </div>
          <div className="ranking-controls">
            <button
              className={`view-btn ${!showBottom ? 'active' : ''}`}
              onClick={() => setShowBottom(false)}
            >
              🏆 Top 100
            </button>
            <button
              className={`view-btn ${showBottom ? 'active' : ''}`}
              onClick={() => setShowBottom(true)}
            >
              📉 Bottom 100
            </button>
          </div>
        </div>

        <div className="iteration-info">
          <h2>
            {selectedIteration === 0 ? '🎯 Initial State' : `📈 Iteration ${selectedIteration}`}
            {selectedIteration > 0 && iterationData[selectedIteration]?.l1_distance && (
              <span className="l1-badge">
                L1Δ: {iterationData[selectedIteration].l1_distance.toExponential(2)}
              </span>
            )}
          </h2>
          <p>
            {showBottom ? 'Bottom 100' : 'Top 100'} articles by PageRank score
            {showBottom && ' (lowest probability)'}
            {!showBottom && ' (highest probability)'}
          </p>

          {currentData.dataset_stats && (
            <div className="dataset-stats">
              <h4>📊 Dataset Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Articles:</span>
                  <span className="stat-value">{currentData?.dataset_stats?.total_articles?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Links:</span>
                  <span className="stat-value">{currentData?.dataset_stats?.total_edges?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Article Title</th>
                  <th>PageRank Score</th>
                </tr>
              </thead>
              <tbody>
                {(showBottom ? currentData.bottom_results || [] : currentData.top_results || currentData.results || []).map((item, index) => (
                  <tr key={index} className={getRankClass(item.rank)}>
                    <td className="rank-cell">
                      #{item.rank}
                      {!showBottom && item.rank === 1 && ' 🥇'}
                      {!showBottom && item.rank === 2 && ' 🥈'}
                      {!showBottom && item.rank === 3 && ' 🥉'}
                    </td>
                    <td className="title-cell">{item.title}</td>
                    <td className="score-cell">{formatScore(item.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{textAlign: 'center', marginTop: '2rem', opacity: 0.7}}>
          <p>
            📊 Showing results from English Wikipedia (2010) PageRank algorithm
            {availableIterations.length > 1 && ` (${availableIterations.length} iterations available)`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;