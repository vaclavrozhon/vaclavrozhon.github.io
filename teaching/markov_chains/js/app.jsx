const { useState, useEffect, useRef } = React;

const ChainSelector = ({ chainModules, selectedIndex, onSelect }) => {
    return (
        <div className="sidebar">
            <h2>Select a Chain</h2>
            <ul className="chain-list">
                {chainModules.map((ChainClass, index) => {
                    const tempChain = new ChainClass();
                    return (
                        <li key={index}>
                            <button
                                className={`chain-button ${selectedIndex === index ? 'active' : ''}`}
                                onClick={() => onSelect(index)}
                            >
                                <span className="chain-name">{tempChain.name}</span>
                                <span className="chain-description">{tempChain.description}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const Toolbar = ({ chain, isRunning, numDots, speed, onDotsChange, onSpeedChange, onStep, onRunToggle, onReset, onControlChange, onEditorSave }) => {
    const controls = [];
    if (chain && chain.getCustomControls) {
        const c = chain.getCustomControls();
        controls.push({ ...c, id: 'custom' });
    }
    const editors = chain && chain.getEditors ? chain.getEditors() : [];

    return (
        <div className="controls">
            <button onClick={onStep} disabled={isRunning}>Step</button>
            <button onClick={onRunToggle} className={isRunning ? 'danger' : 'secondary'}>
                {isRunning ? 'Stop' : 'Run'}
            </button>
            <button onClick={onReset}>Reset</button>

            <div className="control-group">
                <label>Dots:</label>
                <select value={numDots} onChange={(e) => onDotsChange(parseInt(e.target.value))}>
                    <option value="1">1</option>
                    <option value="10">10</option>
                    <option value="100">100</option>
                    <option value="1000">1000</option>
                    <option value="10000">10000</option>
                </select>
            </div>

            <div className="control-group">
                <label>Speed:</label>
                <input
                    type="range"
                    min="50"
                    max="2000"
                    step="50"
                    value={2050 - speed}
                    onChange={(e) => onSpeedChange(2050 - parseInt(e.target.value))}
                />
                <span>{speed}ms</span>
            </div>

            {controls.map((ctrl) => (
                <div key={ctrl.id} className="control-group">
                    <label>{ctrl.label}:</label>
                    <input
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={ctrl.value}
                        onChange={(e) => onControlChange(ctrl, parseFloat(e.target.value))}
                    />
                    <span>{ctrl.value?.toFixed ? ctrl.value.toFixed(1) : ctrl.value}</span>
                </div>
            ))}

            {editors && editors.length > 0 && (
                <div className="control-group" style={{gap: '6px'}}>
                    {editors.map((ed, idx) => (
                        <MappingEditor key={idx} editor={ed} onSave={onEditorSave} />
                    ))}
                </div>
            )}
        </div>
    );
};

const StatsPanel = ({ chain }) => {
    if (!chain) return null;
    const cfg = chain.getRenderConfig ? chain.getRenderConfig() : { showStats: true };
    if (!cfg.showStats) return null;
    return (
        <div className="stats">
            <div className="stat-card">
                <div className="stat-label">Steps</div>
                <div className="stat-value">{chain.stepCount}</div>
            </div>
            {chain.stateNames && chain.stateNames.map((name, i) => (
                <div key={i} className="stat-card">
                    <div className="stat-label">{name}</div>
                    <div className="stat-value">
                        {(chain.getStateProbabilities()[i] * 100).toFixed(1)}%
                    </div>
                </div>
            ))}
        </div>
    );
};

const Histogram = ({ data }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    console.log('[Histogram] DEBUG: received data:', data);

    // Handle both old object format {times: [...]} and new array format [...]
    let times;
    if (Array.isArray(data)) {
        times = data;
    } else if (data && Array.isArray(data.times)) {
        times = data.times;
    } else {
        console.log('[Histogram] DEBUG: returning null - no valid data format');
        return null;
    }

    if (times.length === 0) {
        console.log('[Histogram] DEBUG: returning null - empty times array');
        return null;
    }

    console.log('[Histogram] DEBUG: using times array with length:', times.length);

    // Count occurrences of each unique time value
    const timeCounts = {};
    for (const t of times) {
        timeCounts[t] = (timeCounts[t] || 0) + 1;
    }

    // Get all unique times and sort them
    const uniqueTimes = Object.keys(timeCounts).map(Number).sort((a, b) => a - b);

    // Fill in gaps - create points for ALL times from min to max
    const minTime = Math.min(...uniqueTimes);
    const maxTime = Math.max(...uniqueTimes);
    const total = times.length;

    const points = [];
    for (let t = minTime; t <= maxTime; t++) {
        points.push({
            x: t,
            y: timeCounts[t] ? timeCounts[t] / total : 0
        });
    }

    // Calculate mean and std from raw data
    const mean = times.reduce((a, b) => a + b, 0) / total;
    const variance = times.reduce((a, b) => a + (b - mean) * (b - mean), 0) / total;
    const std = Math.sqrt(variance);

    // Find max Y for scaling
    const maxFreq = Math.max(...points.map(p => p.y));
    const maxY = maxFreq * 1.1;

    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (chartRef.current) {
            // Update data and options reactively
            chartRef.current.data.datasets[0].data = points;
            chartRef.current.options.scales.y.max = maxY;

            // Update annotation lines
            if (chartRef.current.options.plugins?.annotation?.annotations && mean > 0) {
                const ann = chartRef.current.options.plugins.annotation.annotations;
                ann.meanLine.xMin = ann.meanLine.xMax = mean;
                ann.meanLine.label.content = `μ=${mean.toFixed(1)}`;
                if (ann.sigmaLeft && std > 0) {
                    ann.sigmaLeft.xMin = ann.sigmaLeft.xMax = mean - std;
                }
                if (ann.sigmaRight && std > 0) {
                    ann.sigmaRight.xMin = ann.sigmaRight.xMax = mean + std;
                }
            }

            chartRef.current.update();
            return;
        }
        // Register annotation plugin if available
        if (window['chartjs-plugin-annotation']) {
            Chart.register(window['chartjs-plugin-annotation']);
        }
        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                datasets: [{
                    label: 'Absorption Time Distribution',
                    data: points,
                    parsing: { xAxisKey: 'x', yAxisKey: 'y' },
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Absorption Time (steps)' },
                        type: 'linear',
                        position: 'bottom',
                        ticks: {
                            stepSize: 1,
                            maxTicksLimit: Math.min(50, points.length),
                            autoSkip: true
                        },
                        grid: { display: false }
                    },
                    y: {
                        title: { display: true, text: 'Proportion' },
                        beginAtZero: true,
                        max: maxY,
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                    annotation: mean > 0 ? {
                        annotations: {
                            meanLine: {
                                type: 'line',
                                xMin: mean,
                                xMax: mean,
                                borderColor: '#f44336',
                                borderWidth: 2,
                                label: { enabled: true, content: `μ=${mean.toFixed(1)}`, position: 'start', backgroundColor: 'rgba(244,67,54,0.1)', color: '#f44336' }
                            },
                            sigmaLeft: std > 0 ? {
                                type: 'line', xMin: mean - std, xMax: mean - std,
                                borderColor: '#ff9800', borderWidth: 1, borderDash: [4,4],
                                label: { enabled: true, content: 'μ-σ', position: 'start', backgroundColor: 'rgba(255,152,0,0.1)', color: '#ff9800' }
                            } : null,
                            sigmaRight: std > 0 ? {
                                type: 'line', xMin: mean + std, xMax: mean + std,
                                borderColor: '#ff9800', borderWidth: 1, borderDash: [4,4],
                                label: { enabled: true, content: 'μ+σ', position: 'start', backgroundColor: 'rgba(255,152,0,0.1)', color: '#ff9800' }
                            } : null
                        }
                    } : { annotations: {} }
                }
            }
        });
        return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    }, [points.length, mean, std, maxY]); // React to all changes, not just length

    return (
        <div className="info-panel">
            <h4>Absorption Time Histogram</h4>
            <div style={{ height: '220px' }}>
                <canvas ref={canvasRef} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#37474f' }}>
                <span style={{ marginRight: '12px' }}>μ: {mean > 0 ? mean.toFixed(1) : 'N/A'}</span>
                <span style={{ marginRight: '12px' }}>σ: {std > 0 ? std.toFixed(1) : 'N/A'}</span>
                <span>n: {times.length}</span>
            </div>
        </div>
    );
};

const DistributionTable = ({ chain }) => {
    if (!chain || !chain.getDistributionEvolution) return null;

    const evolution = chain.getDistributionEvolution(10);
    const stateNames = chain.stateNames || chain.states.map((_, i) => `S${i}`);

    return (
        <div className="info-panel" style={{ marginTop: '10px' }}>
            <h4>Distribution Evolution (Steps 0-10)</h4>
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#f5f5f5', borderRight: '1px solid #e0e0e0' }}>State</th>
                            {[...Array(11)].map((_, i) => (
                                <th key={i} style={{ padding: '8px', textAlign: 'center', minWidth: '60px' }}>
                                    t={i}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {stateNames.map((name, stateIdx) => (
                            <tr key={stateIdx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                <td style={{
                                    padding: '8px',
                                    fontWeight: 'bold',
                                    position: 'sticky',
                                    left: 0,
                                    backgroundColor: 'white',
                                    borderRight: '1px solid #e0e0e0'
                                }}>
                                    {name}
                                </td>
                                {evolution.map((dist, step) => {
                                    const value = dist[stateIdx];
                                    const formattedValue = value < 0.0001 ? '0' : value.toFixed(4);
                                    const intensity = Math.min(value, 1) * 0.3;
                                    return (
                                        <td key={step} style={{
                                            padding: '8px',
                                            textAlign: 'center',
                                            backgroundColor: value > 0.01 ? `rgba(76, 175, 80, ${intensity})` : 'transparent'
                                        }}>
                                            {formattedValue}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MappingEditor = ({ editor, onSave }) => {
    const [rows, setRows] = useState(() => {
        const map = editor.value || {};
        return Object.keys(map).map(k => ({ from: parseInt(k), to: parseInt(map[k]) }));
    });
    const [open, setOpen] = useState(false);

    const addRow = () => setRows(r => [...r, { from: 1, to: 1 }]);
    const removeRow = (idx) => setRows(r => r.filter((_, i) => i !== idx));
    const updateRow = (idx, key, val) => setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: val } : row));
    const save = () => {
        const out = {};
        for (const { from, to } of rows) {
            if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
            if (from < 0 || from > 100 || to < 0 || to > 100) continue;
            out[from] = to;
        }
        onSave(out);
        setOpen(false);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="secondary" onClick={() => setOpen(v => !v)}>
                {open ? 'Close' : (editor.title || 'Edit Mapping')}
            </button>
            {open && (
                <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{editor.description}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 16px 80px auto', gap: '6px', alignItems: 'center' }}>
                        {rows.map((row, idx) => (
                            <React.Fragment key={idx}>
                                <input type="number" value={row.from} min="0" max="100" onChange={(e) => updateRow(idx, 'from', parseInt(e.target.value))} style={{ padding: '4px' }} />
                                <span style={{ textAlign: 'center' }}>→</span>
                                <input type="number" value={row.to} min="0" max="100" onChange={(e) => updateRow(idx, 'to', parseInt(e.target.value))} style={{ padding: '4px' }} />
                                <button onClick={() => removeRow(idx)} style={{ marginLeft: '6px' }}>Remove</button>
                            </React.Fragment>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={addRow}>Add</button>
                        <button onClick={save}>Save</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const MarkovChainVisualization = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [selectedChainIndex, setSelectedChainIndex] = useState(0);
    const [chain, setChain] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeed] = useState(500);
    const [numDots, setNumDots] = useState(100);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [zoom, setZoom] = useState(1.0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const [editingMatrix, setEditingMatrix] = useState(false);
    const [matrixError, setMatrixError] = useState('');
    const [showAbsorbPlot, setShowAbsorbPlot] = useState(false);
    const [showDistTable, setShowDistTable] = useState(false);
    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        if (chainModules.length > 0) {
            const ChainClass = chainModules[selectedChainIndex];
            const newChain = new ChainClass();
            newChain.setNumDots(numDots);
            newChain.setAnimationSpeed(speed);

            // Set up callback to trigger re-render when data loads
            newChain.onDataLoaded = () => {
                setUpdateTrigger(prev => prev + 1);
            };

            setChain(newChain);
            setIsRunning(false);

            // Set default zoom based on chain type
            if (newChain.name && newChain.name.includes('2-mer')) {
                setZoom(0.5); // 50% zoom for 2-mer chain - reasonable size
                setPan({ x: 0, y: 0 }); // Reset pan position
            } else {
                setZoom(1.0); // Normal zoom for other chains
                setPan({ x: 0, y: 0 }); // Reset pan position
            }
        }
    }, [selectedChainIndex, numDots]);

    useEffect(() => {
        if (chain) {
            chain.setAnimationSpeed(speed);
        }
    }, [chain, speed]);

    useEffect(() => {
        if (!chain || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let lastTime = 0;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            const desiredHeightCss = chain && chain.getRenderConfig ? chain.getRenderConfig().canvasHeight : 400;
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = desiredHeightCss * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            canvas.style.width = rect.width + 'px';
            canvas.style.height = desiredHeightCss + 'px';
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const draw = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            const dpr = window.devicePixelRatio || 1;
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            // Reset transform to handle DPR and clear
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            chain.animate(deltaTime);

            // Centered zoom + pan
            ctx.save();
            ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
            ctx.scale(zoom, zoom);
            ctx.translate(-width / 2, -height / 2);

            chain.draw(ctx, width, height, { hoveredIndex: hoverIndexRef.current });
            ctx.restore();
            animationRef.current = requestAnimationFrame(draw);
        };

        animationRef.current = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [chain, zoom, pan]);

    useEffect(() => {
        if (!isRunning || !chain) return;

        const interval = setInterval(() => {
            chain.step();
            setUpdateTrigger(prev => prev + 1);
        }, speed);

        return () => clearInterval(interval);
    }, [isRunning, chain, speed]);

    const handleStep = () => {
        if (!chain) return;
        chain.step();
        setUpdateTrigger(prev => prev + 1);
    };

    const handleReset = () => {
        if (!chain) return;
        chain.reset();
        setIsRunning(false);
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
        setShowAbsorbPlot(false);
        setUpdateTrigger(prev => prev + 1);
    };

    const handleRun = () => {
        setIsRunning(!isRunning);
    };

    const handleChainSelect = (index) => {
        setSelectedChainIndex(index);
        setIsRunning(false);
        setEditingMatrix(false);
        setMatrixError('');
    };

    const handleMatrixCellChange = (i, j, value) => {
        const newValue = parseFloat(value);
        if (isNaN(newValue) || newValue < 0 || newValue > 1) {
            setMatrixError('Values must be between 0 and 1');
            return;
        }

        // Clear error first to allow intermediate invalid states during editing
        setMatrixError('');

        const newMatrix = chain.transitionMatrix.map(row => [...row]);
        newMatrix[i][j] = newValue;

        // Just update the matrix without validation during editing
        chain.transitionMatrix = newMatrix;
        setUpdateTrigger(prev => prev + 1);
    };

    const normalizeMatrixRow = (rowIndex) => {
        const newMatrix = chain.transitionMatrix.map(row => [...row]);
        const row = newMatrix[rowIndex];
        const sum = row.reduce((s, val) => s + val, 0);

        if (sum > 0) {
            for (let j = 0; j < row.length; j++) {
                row[j] = row[j] / sum;
            }
        }

        try {
            chain.updateTransitionMatrix(newMatrix);
            setMatrixError('');
            setUpdateTrigger(prev => prev + 1);
        } catch (error) {
            setMatrixError(error.message);
        }
    };

    const hoverIndexRef = useRef(null);

    const getMouseWorldPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        // Inverse of transforms: translate to center+pan, then scale, then back
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = width / 2 + pan.x;
        const cy = height / 2 + pan.y;
        const wx = (x - cx) / zoom + width / 2;
        const wy = (y - cy) / zoom + height / 2;
        return { x: wx, y: wy, width, height };
    };

    const updateHover = (e) => {
        if (!chain) return;
        const { x, y, width, height } = getMouseWorldPos(e);
        const positions = chain._lastPositions || chain.getNodePositions?.(width / 2, height / 2, Math.min(width, height) * 0.3, width) || [];
        let found = null;
        for (let i = 0; i < positions.length; i++) {
            const p = positions[i];
            if (!p) continue;
            const dx = x - p.x;
            const dy = y - p.y;
            if (dx * dx + dy * dy <= 30 * 30) { found = i; break; }
        }
        hoverIndexRef.current = found;

        // Update tooltip
        if (found !== null && chain.stateCount) {
            const totalDots = chain.dots ? chain.dots.length : 0;
            const dotsAtState = chain.stateCount[found] || 0;
            const proportion = totalDots > 0 ? (dotsAtState / totalDots * 100).toFixed(1) : 0;
            const stateName = chain.stateNames?.[found] || `State ${found}`;

            const rect = canvasRef.current.getBoundingClientRect();
            setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                text: `${stateName}: ${dotsAtState}/${totalDots} dots (${proportion}%)`
            });
        } else {
            setTooltip(null);
        }
    };

    const onMouseDown = (e) => {
        if (!canvasRef.current) return;
        setIsPanning(true);
        lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
        if (!isPanning) return;
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
        updateHover(e);
    };

    const endPan = () => {
        setIsPanning(false);
        setTooltip(null);
        hoverIndexRef.current = null;
    };

    if (chainModules.length === 0) {
        return <div className="container">Loading...</div>;
    }

    return (
        <div className="container">
            <h1>Interactive Markov Chains Visualization (updated)</h1>

            <div className="main-content">
                <ChainSelector chainModules={chainModules} selectedIndex={selectedChainIndex} onSelect={handleChainSelect} />

                <div className="visualization-panel">
                    {chain && (
                        <>
                            <div className="chain-header">
                                <h2>{chain.name}</h2>
                                <p>{chain.description}</p>
                            </div>

                            <Toolbar
                                chain={chain}
                                isRunning={isRunning}
                                numDots={numDots}
                                speed={speed}
                                onDotsChange={(v) => {
                                    setNumDots(v);
                                    setIsRunning(false); // Stop simulation when dots change
                                    setShowAbsorbPlot(false); // Reset absorption plot when dots change
                                    if (chain) {
                                        chain.setNumDots(v); // This already resets internally
                                        setUpdateTrigger(prev => prev + 1);
                                    }
                                }}
                                onSpeedChange={(v) => setSpeed(v)}
                                onStep={handleStep}
                                onRunToggle={handleRun}
                                onReset={handleReset}
                                onControlChange={(ctrl, value) => { ctrl.onChange(value); setUpdateTrigger(p => p + 1); }}
                                onEditorSave={(map) => { /* editor handles save via its onSave; trigger redraw */ setUpdateTrigger(p => p + 1); }}
                            />

                            <div className="canvas-container">
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={onMouseDown}
                                    onMouseMove={(e) => { updateHover(e); onMouseMove(e); }}
                                    onMouseUp={endPan}
                                    onMouseLeave={endPan}
                                    className={isPanning ? 'is-panning' : ''}
                                />
                                {tooltip && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: tooltip.x + 10,
                                            top: tooltip.y - 30,
                                            background: 'rgba(0, 0, 0, 0.8)',
                                            color: 'white',
                                            padding: '5px 10px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            pointerEvents: 'none',
                                            whiteSpace: 'nowrap',
                                            zIndex: 10
                                        }}
                                    >
                                        {tooltip.text}
                                    </div>
                                )}
                                <div className="zoom-controls" style={{userSelect: 'none'}}>
                                    <button
                                        aria-label="Zoom out"
                                        className="zoom-btn"
                                        onClick={() => setZoom(z => Math.max(0.5, parseFloat((z / 1.1).toFixed(3))))}
                                        title="Zoom out"
                                    >
                                        -
                                    </button>
                                    <button
                                        aria-label="Reset zoom"
                                        className="zoom-btn"
                                        onClick={() => setZoom(1.0)}
                                        title="Reset zoom"
                                    >
                                        100%
                                    </button>
                                    <button
                                        aria-label="Zoom in"
                                        className="zoom-btn"
                                        onClick={() => setZoom(z => Math.min(3.0, parseFloat((z * 1.1).toFixed(3))))}
                                        title="Zoom in"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Absorption distribution toggle for chains with absorption */}
                            {(chain.name === 'Snakes & Ladders' ||
                              chain.name === 'Waiting for Six' ||
                              chain.name === 'Random Walk' ||
                              chain.name === 'Coupon Collector' ||
                              chain.name === 'English 1-mer (Full)' ||
                              chain.name === 'English 2-mer (Bigrams)') && (
                                (() => {
                                    const histData = chain.getHistogramData ? chain.getHistogramData() : null;
                                    return (
                                        <>
                                            <div style={{ margin: '10px 0' }}>
                                                <button onClick={() => setShowAbsorbPlot(v => !v)}>
                                                    {showAbsorbPlot ? 'Hide absorption distribution' : 'Show absorption distribution'}
                                                </button>
                                            </div>
                                            {showAbsorbPlot && histData && (
                                                <Histogram data={histData} />
                                            )}
                                        </>
                                    );
                                })()
                            )}

                            {/* Distribution Evolution Table for all chains */}
                            <div style={{ margin: '10px 0' }}>
                                <button onClick={() => setShowDistTable(v => !v)}>
                                    {showDistTable ? 'Hide Distribution Evolution' : 'Show Distribution Evolution'}
                                </button>
                            </div>
                            {showDistTable && chain && (
                                <DistributionTable chain={chain} />
                            )}

                            {/* Generated words display for English chains */}
                            {(chain.name.includes('English') && chain.getGeneratedWords) && (
                                (() => {
                                    const words = chain.getGeneratedWords();
                                    return (
                                        <div style={{ margin: '15px 0', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Generated Words ({words.length} total)</h4>
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '6px',
                                                minHeight: '32px',
                                                alignItems: 'flex-start',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                border: '1px solid #dee2e6',
                                                borderRadius: '4px',
                                                padding: '8px'
                                            }}>
                                                {words.length > 0 ? (
                                                    words.map((word, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{
                                                                background: '#007bff',
                                                                color: 'white',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '13px',
                                                                fontFamily: 'monospace'
                                                            }}
                                                        >
                                                            {word}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                                                        Run the simulation to generate words...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()
                            )}

                            {(chain.getRenderConfig && chain.getRenderConfig().showTransitionMatrix) && (
                            <div className="transition-matrix">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                                    <h3>Transition Matrix</h3>
                                    {chain.name === 'Weather Model' && (
                                        <button
                                            onClick={() => {
                                                if (editingMatrix) {
                                                    // Validate matrix when finishing editing
                                                    try {
                                                        chain.updateTransitionMatrix(chain.transitionMatrix);
                                                        setMatrixError('');
                                                        setEditingMatrix(false);
                                                    } catch (error) {
                                                        setMatrixError(error.message + ' - Please fix before finishing');
                                                        return;
                                                    }
                                                } else {
                                                    setEditingMatrix(true);
                                                }
                                            }}
                                            className={editingMatrix ? 'danger' : 'secondary'}
                                        >
                                            {editingMatrix ? 'Done Editing' : 'Edit Matrix'}
                                        </button>
                                    )}
                                </div>

                                {matrixError && (
                                    <div style={{color: '#f44336', marginBottom: '10px', fontSize: '14px'}}>
                                        {matrixError}
                                    </div>
                                )}

                                <table>
                                    <thead>
                                        <tr>
                                            <th>From \\ To</th>
                                            {chain.stateNames.map((name, i) => (
                                                <th key={i}>{name}</th>
                                            ))}
                                            {editingMatrix && chain.name === 'Weather Model' && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chain.transitionMatrix.map((row, i) => (
                                            <tr key={i}>
                                                <th>{chain.stateNames[i]}</th>
                                                {row.map((prob, j) => (
                                                    <td key={j}>
                                                        {editingMatrix && chain.name === 'Weather Model' ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="1"
                                                                step="0.01"
                                                                value={prob}
                                                                onChange={(e) => handleMatrixCellChange(i, j, e.target.value)}
                                                                style={{
                                                                    width: '60px',
                                                                    padding: '2px',
                                                                    border: '1px solid #ddd',
                                                                    borderRadius: '3px',
                                                                    textAlign: 'center'
                                                                }}
                                                            />
                                                        ) : (
                                                            prob.toFixed(3)
                                                        )}
                                                    </td>
                                                ))}
                                                {editingMatrix && chain.name === 'Weather Model' && (
                                                    <td>
                                                        <button
                                                            onClick={() => normalizeMatrixRow(i)}
                                                            style={{
                                                                fontSize: '11px',
                                                                padding: '2px 6px',
                                                                background: '#4CAF50',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '3px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Normalize
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {editingMatrix && chain.name === 'Weather Model' && (
                                    <div style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
                                        <p>• Each row must sum to 1.0</p>
                                        <p>• Click "Normalize" to automatically adjust a row to sum to 1.0</p>
                                        <p>• Values must be between 0 and 1</p>
                                    </div>
                                )}
                            </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

ReactDOM.render(<MarkovChainVisualization />, document.getElementById('root'));