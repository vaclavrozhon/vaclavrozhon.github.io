const { useState, useEffect, useRef, useMemo } = React;

const ChainSelector = ({ chainModules, selectedIndex, onSelect }) => {
    return (
        <div className="sidebar">
            <h2>Select a Chain</h2>
            <ul className="chain-list">
                {chainModules.map((ChainClass, index) => {
                    const metadata = ChainClass.meta;
                    return (
                        <li key={index}>
                            <button
                                className={`chain-button ${selectedIndex === index ? 'active' : ''}`}
                                onClick={() => onSelect(index)}
                            >
                                <span className="chain-name">{metadata.name}</span>
                                <span className="chain-description">{metadata.description}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const Toolbar = ({ chain, isRunning, numDots, speed, runSteps, onRunStepsChange, onDotsChange, onSpeedChange, onStep, onRunToggle, onReset, onControlChange, onEditorSave }) => {
    const controls = [];
    if (chain && chain.getCustomControls) {
        const c = chain.getCustomControls();
        if (Array.isArray(c)) {
            c.forEach((ctrl, idx) => controls.push({ ...ctrl, id: `custom-${idx}` }));
        } else if (c) {
            controls.push({ ...c, id: 'custom' });
        }
    }
    const editors = chain && chain.getEditors ? chain.getEditors() : [];

    return (
        <div className="controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={onStep} disabled={isRunning || chain.stepInProgress || !chain.states.length || numDots === 0}>Step</button>
                <button onClick={onRunToggle} className={isRunning ? 'danger' : 'secondary'} disabled={!isRunning && (numDots === 0 || !chain.states.length || chain.stepInProgress)}>
                    {isRunning ? 'Stop' : 'Run'}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                    Run steps:
                    <input
                        type="number"
                        aria-label="Run steps"
                        min="1"
                        value={runSteps}
                        onChange={(e) => onRunStepsChange(e.target.value)}
                        style={{ width: '70px' }}
                    />
                </label>
                <button onClick={onReset}>Reset</button>
            </div>

            <div className="control-group">
                <label>Dots:</label>
                <select aria-label="Dots" value={numDots} onChange={(e) => onDotsChange(parseInt(e.target.value))}>
                    <option value="0">0 (no dots)</option>
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
                    aria-label="Speed"
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
                        aria-label={ctrl.label}
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={ctrl.value}
                        onChange={(e) => onControlChange(ctrl, ctrl.step >= 1 ? parseInt(e.target.value) : parseFloat(e.target.value))}
                    />
                    <span>{Number.isFinite(ctrl.value) ? (ctrl.step >= 1 ? Math.round(ctrl.value) : ctrl.value.toFixed((String(ctrl.step).split('.')[1] || '').length)) : ctrl.value}</span>
                </div>
            ))}

            {editors && editors.length > 0 && (
                <div className="control-group" style={{gap: '6px'}}>
                    {editors.map((ed, idx) => (
                        <MappingEditor key={`${chain.name}-${ed.id || idx}`} editor={ed} onSave={onEditorSave} />
                    ))}
                </div>
            )}
        </div>
    );
};

const Histogram = ({ data, total, step }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const times = data || [];
    const mean = times.length ? times.reduce((sum, t) => sum + t, 0) / times.length : null;
    const std = times.length ? Math.sqrt(times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length) : null;
    const points = useMemo(() => {
        const counts = new Map();
        for (const t of times) counts.set(t, (counts.get(t) || 0) + 1);
        return [...counts].sort(([a], [b]) => a - b).map(([x, count]) => ({ x, y: count / total }));
    }, [data, total]);

    useEffect(() => {
        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: { datasets: [{ data: [], backgroundColor: '#667eea', barThickness: 12 }] },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                scales: {
                    x: { type: 'linear', min: 0, title: { display: true, text: 'Absorption time T (steps)' }, ticks: { precision: 0 } },
                    y: { beginAtZero: true, title: { display: true, text: 'Fraction of all dots' } }
                },
                plugins: { legend: { display: false }, annotation: { annotations: {} } }
            }
        });
        return () => { chartRef.current.destroy(); chartRef.current = null; };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        chart.data.datasets[0].data = points;
        chart.options.plugins.annotation.annotations = mean === null ? {} : {
            mean: { type: 'line', xMin: mean, xMax: mean, borderColor: '#d32f2f', borderWidth: 2 },
            ...(std > 0 ? {
                left: { type: 'line', xMin: Math.max(0, mean - std), xMax: Math.max(0, mean - std), borderColor: '#ad6500', borderWidth: 1, borderDash: [4, 4], display: mean >= std },
                right: { type: 'line', xMin: mean + std, xMax: mean + std, borderColor: '#ad6500', borderWidth: 1, borderDash: [4, 4] }
            } : {})
        };
        chart.update('none');
    }, [points, mean, std]);

    return (
        <div className="info-panel histogram">
            <h4>Absorption Time Histogram</h4>
            <p>Completed: <strong>{times.length} / {total}</strong>. Still running (T &gt; {step}): <strong>{total ? ((total - times.length) / total * 100).toFixed(1) : '0.0'}%</strong>.</p>
            <div style={{ height: '240px' }}><canvas ref={canvasRef} /></div>
            <p className="histogram-stats">
                Mean: {mean === null ? '—' : mean.toFixed(1)} · Standard deviation: {std === null ? '—' : std.toFixed(1)}
                {times.length < total ? ' (completed dots only)' : ' (all dots)'}
            </p>
        </div>
    );
};

const DistributionTable = React.memo(({ chain, matrix, initial, names }) => {
    if (!chain || !chain.getDistributionEvolution) return null;

    const evolution = chain.getDistributionEvolution(10);
    const stateNames = chain.stateNames || chain.states.map((_, i) => `S${i}`);

    return (
        <div className="info-panel" style={{ marginTop: '10px' }}>
            <h4>Exact Distribution (Steps 0–10)</h4>
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={{ color: '#fff', padding: '8px', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#f5f5f5', borderRight: '1px solid #e0e0e0' }}>State</th>
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
});

const MappingEditor = ({ editor, onSave }) => {
    const [rows, setRows] = useState(() => {
        const map = editor.value || {};
        return Object.keys(map).map(k => ({ from: parseInt(k), to: parseInt(map[k]) }));
    });
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');

    const addRow = () => setRows(r => [...r, { from: 1, to: 1 }]);
    const removeRow = (idx) => setRows(r => r.filter((_, i) => i !== idx));
    const updateRow = (idx, key, val) => setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: val } : row));
    const save = () => {
        const out = {};
        for (const { from, to } of rows) {
            if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || from > 99 || to < 1 || to > 99) {
                setError('Use whole square numbers from 1 to 99.');
                return;
            }
            if (Object.hasOwn(out, from)) {
                setError(`Square ${from} occurs more than once.`);
                return;
            }
            out[from] = to;
        }
        onSave(editor, out);
        setError('');
        setOpen(false);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="secondary" onClick={() => setOpen(v => !v)}>
                {open ? 'Close' : (editor.title || 'Edit Mapping')}
            </button>
            {open && (
                <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}>{editor.description}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 16px 80px auto', gap: '6px', alignItems: 'center' }}>
                        {rows.map((row, idx) => (
                            <React.Fragment key={idx}>
                                <input type="number" aria-label={`Start square ${idx + 1}`} value={Number.isNaN(row.from) ? '' : row.from} min="1" max="99" onChange={(e) => updateRow(idx, 'from', parseInt(e.target.value))} style={{ padding: '4px' }} />
                                <span style={{ textAlign: 'center' }}>→</span>
                                <input type="number" aria-label={`End square ${idx + 1}`} value={Number.isNaN(row.to) ? '' : row.to} min="1" max="99" onChange={(e) => updateRow(idx, 'to', parseInt(e.target.value))} style={{ padding: '4px' }} />
                                <button onClick={() => removeRow(idx)} style={{ marginLeft: '6px' }}>Remove</button>
                            </React.Fragment>
                        ))}
                    </div>
                    {error && <p role="alert" className="error-message">{error}</p>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={addRow}>Add</button>
                        <button onClick={save}>Save</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Bound the DOM size for the 730-state model while keeping every matrix entry accessible.
const MatrixTable = React.memo(({ matrix, names }) => {
    const pageSize = 30;
    const [rowStart, setRowStart] = useState(0);
    const [colStart, setColStart] = useState(0);
    const n = names.length;
    const rows = matrix.slice(rowStart, rowStart + pageSize);
    const columns = names.slice(colStart, colStart + pageSize);
    return <div className="transition-matrix">
        <h3>Transition Matrix</h3>
        {n > pageSize && <div className="matrix-navigation">
            <div>
                <button aria-label="Previous matrix rows" disabled={rowStart === 0} onClick={() => setRowStart(v => v - pageSize)}>←</button>
                <span>Rows {rowStart + 1}–{Math.min(rowStart + pageSize, n)} of {n}</span>
                <button aria-label="Next matrix rows" disabled={rowStart + pageSize >= n} onClick={() => setRowStart(v => v + pageSize)}>→</button>
            </div>
            <div>
                <button aria-label="Previous matrix columns" disabled={colStart === 0} onClick={() => setColStart(v => v - pageSize)}>←</button>
                <span>Columns {colStart + 1}–{Math.min(colStart + pageSize, n)} of {n}</span>
                <button aria-label="Next matrix columns" disabled={colStart + pageSize >= n} onClick={() => setColStart(v => v + pageSize)}>→</button>
            </div>
        </div>}
        <div style={{ overflow: 'auto', maxHeight: '400px', border: '1px solid #eee' }}>
            <table>
                <thead><tr><th>From / To</th>{columns.map((name, i) => <th key={i}>{name}</th>)}</tr></thead>
                <tbody>{rows.map((row, i) => <tr key={i}>
                    <th>{names[rowStart + i]}</th>
                    {row.slice(colStart, colStart + pageSize).map((prob, j) => <td key={j}>{prob > 0 && prob < 0.001 ? prob.toExponential(1) : prob.toFixed(3)}</td>)}
                </tr>)}</tbody>
            </table>
        </div>
    </div>;
});

const MarkovChainVisualization = () => {
    const canvasRef = useRef(null);
    const runningRef = useRef(false);
    const stepsRemainingRef = useRef(0);
    const hoverIndexRef = useRef(null);
    const dragRef = useRef(null);
    const fitRef = useRef(() => {});
    const revisionRef = useRef(0);
    const [selectedChainIndex, setSelectedChainIndex] = useState(0);
    const [chain, setChain] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeed] = useState(500);
    const [numDots, setNumDots] = useState(100);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
    const viewRef = useRef(view);
    viewRef.current = view;
    const { zoom, pan } = view;
    const [isPanning, setIsPanning] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    const [showMatrix, setShowMatrix] = useState(false);
    const [runSteps, setRunSteps] = useState(100);
    const refresh = () => { revisionRef.current++; setUpdateTrigger(v => v + 1); };
    const stop = () => {
        runningRef.current = false;
        stepsRemainingRef.current = 0;
        setIsRunning(false);
    };

    useEffect(() => {
        const newChain = new chainModules[selectedChainIndex]();
        newChain.setNumDots(numDots);
        newChain.setAnimationSpeed(speed);
        newChain.onDataLoaded = refresh;
        setChain(newChain);
        stop();
        setShowMatrix(false);
        setTooltip(null);
        hoverIndexRef.current = null;
        return () => { newChain.onDataLoaded = null; };
    }, [selectedChainIndex]);

    useEffect(() => { chain?.setAnimationSpeed(speed); }, [chain, speed]);

    const canvasHeight = chain?.getRenderConfig().canvasHeight || 400;
    useEffect(() => {
        if (!chain || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let lastTime = null;
        let frame;
        let lastView, lastHover, lastRevision = -1;
        let width = 0, height = canvasHeight;
        let dpr = window.devicePixelRatio || 1;
        const fit = () => setView(chain.getFitTransform(width, height));
        fitRef.current = fit;
        const resize = () => {
            const nextWidth = canvas.parentElement.clientWidth;
            const nextDpr = window.devicePixelRatio || 1;
            if (width === nextWidth && canvas.height === Math.round(height * nextDpr) && dpr === nextDpr) return;
            width = nextWidth;
            dpr = nextDpr;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.height = height + 'px';
            lastRevision = -1;
            fit();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas.parentElement);
        window.addEventListener('resize', resize);

        chain.onStepComplete = () => {
            if (runningRef.current && stepsRemainingRef.current > 0) {
                stepsRemainingRef.current--;
                chain.step();
            } else {
                stop();
            }
            refresh();
        };
        const draw = (now) => {
            // Starting/resuming RAF must never create a giant first delta.
            const delta = lastTime === null ? 0 : Math.min(now - lastTime, 100);
            lastTime = now;
            const wasAnimating = chain.stepInProgress;
            chain.animate(delta);
            const camera = viewRef.current;
            if (wasAnimating || camera !== lastView || hoverIndexRef.current !== lastHover || revisionRef.current !== lastRevision) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, width, height);
                ctx.save();
                ctx.translate(width / 2 + camera.pan.x, height / 2 + camera.pan.y);
                ctx.scale(camera.zoom, camera.zoom);
                ctx.translate(-width / 2, -height / 2);
                chain.draw(ctx, width, height, { hoveredIndex: hoverIndexRef.current });
                ctx.restore();
                lastView = camera;
                lastHover = hoverIndexRef.current;
                lastRevision = revisionRef.current;
            }
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => {
            chain.onStepComplete = null;
            observer.disconnect();
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frame);
        };
    }, [chain, canvasHeight]);

    // CSV loading and changes to the number of states can change graph bounds.
    useEffect(() => { fitRef.current(); }, [chain, chain?.states.length, canvasHeight]);

    const handleStep = () => { if (chain?.step()) refresh(); };
    const handleReset = () => { stop(); chain.reset(); refresh(); };
    const changeModel = (change) => {
        stop();
        change();
        chain.reset();
        setTooltip(null);
        hoverIndexRef.current = null;
        refresh();
    };
    const handleRun = () => {
        if (runningRef.current) { stop(); return; }
        if (!chain || chain.stepInProgress || !chain.dots.length) return;
        stepsRemainingRef.current = Math.max(1, parseInt(runSteps, 10) || 1) - 1;
        runningRef.current = true;
        setIsRunning(true);
        chain.step();
        refresh();
    };
    const handleChainSelect = (index) => {
        stop();
        if (index === selectedChainIndex && chain?.loadError) {
            chain.loadError = null;
            chain.ready = chain.loadFromCSV();
            refresh();
        } else setSelectedChainIndex(index);
    };
    const handleRunStepsChange = (value) => setRunSteps(value);
    const setZoom = (updater) => setView(v => ({ ...v, zoom: typeof updater === 'function' ? updater(v.zoom) : updater }));

    const updateHover = (e) => {
        if (!chain) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom + rect.width / 2;
        const y = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom + rect.height / 2;
        const positions = chain._lastPositions || [];
        const r = chain._getUniformNodeRadius();
        const found = positions.findIndex(p => (x - p.x) ** 2 + (y - p.y) ** 2 <= r * r);
        hoverIndexRef.current = found < 0 ? null : found;
        setTooltip(found < 0 ? null : { x: e.clientX - rect.left, y: e.clientY - rect.top, index: found });
    };
    const onPointerDown = (e) => {
        if (e.button !== 0) return;
        canvasRef.current.setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
    };
    const onPointerMove = (e) => {
        if (dragRef.current) {
            const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
            setView(v => ({ ...v, pan: { x: v.pan.x + dx, y: v.pan.y + dy } }));
            dragRef.current = { x: e.clientX, y: e.clientY };
            setTooltip(null);
        } else updateHover(e);
    };
    const endPan = () => {
        dragRef.current = null;
        setIsPanning(false);
        setTooltip(null);
        hoverIndexRef.current = null;
    };
    const histData = useMemo(() => chain?.getHistogramData?.(), [chain, updateTrigger]);

    if (chainModules.length === 0) {
        return <div className="container">Loading...</div>;
    }

    return (
        <div className="container">
            <h1>Markov Chain Demo</h1>

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
                                runSteps={runSteps}
                                onRunStepsChange={handleRunStepsChange}
                                onDotsChange={(v) => {
                                    stop();
                                    setNumDots(v);
                                    chain.setNumDots(v);
                                    refresh();
                                }}
                                onSpeedChange={(v) => setSpeed(v)}
                                onStep={handleStep}
                                onRunToggle={handleRun}
                                onReset={handleReset}
                                onControlChange={(ctrl, value) => changeModel(() => ctrl.onChange(value))}
                                onEditorSave={(editor, map) => changeModel(() => editor.onSave(map))}
                            />
                            <p className="control-note">Changing dots or model parameters restarts at step 0.</p>
                            {chain.loadError && <p role="alert" className="error-message">{chain.loadError} Select the model again to retry.</p>}
                            {!chain.states.length && !chain.loadError && <p role="status">Loading language model…</p>}
                            <div className="step-count" aria-live="polite">
                                Step: {chain.stepCount}
                            </div>

                            <div className="canvas-container">
                                <canvas
                                    ref={canvasRef}
                                    aria-label="Markov chain graph"
                                    onPointerDown={onPointerDown}
                                    onPointerMove={onPointerMove}
                                    onPointerUp={endPan}
                                    onPointerCancel={endPan}
                                    onPointerLeave={() => { if (!dragRef.current) endPan(); }}
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
                                            fontSize: '14px',
                                            pointerEvents: 'none',
                                            whiteSpace: 'nowrap',
                                            zIndex: 10
                                        }}
                                    >
                                        {chain.stateNames[tooltip.index]}: {chain.stateCount[tooltip.index] || 0}/{numDots} dots ({numDots ? ((chain.stateCount[tooltip.index] || 0) / numDots * 100).toFixed(1) : '0.0'}%)
                                    </div>
                                )}
                                <div className="zoom-controls" style={{userSelect: 'none'}}>
                                    <button
                                        aria-label="Zoom out"
                                        className="zoom-btn"
                                        onClick={() => setZoom(z => Math.max(0.05, parseFloat((z / 1.1).toFixed(3))))}
                                        title="Zoom out"
                                    >
                                        -
                                    </button>
                                    <button
                                        aria-label="Fit graph"
                                        className="zoom-btn"
                                        onClick={() => fitRef.current()}
                                        title="Fit the whole graph"
                                    >
                                        Fit
                                    </button>
                                    <button
                                        aria-label="Zoom in"
                                        className="zoom-btn"
                                        onClick={() => setZoom(z => Math.min(5.0, parseFloat((z * 1.1).toFixed(3))))}
                                        title="Zoom in"
                                    >
                                        +
                                    </button>
                                    <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                                </div>
                            </div>

                            {/* Absorption distribution: always show when data is available (all chains) */}
                            {histData && <Histogram key={selectedChainIndex} data={histData} total={numDots} step={chain.stepCount} />}

                            <DistributionTable chain={chain} matrix={chain.transitionMatrix} initial={chain.initialDistribution} names={chain.stateNames} />

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
                                                maxHeight: '600px',
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
                                                                fontSize: '17px',
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

                            {/* Full Transition Matrix: hidden behind a global toggle for all chains */}
                            <div style={{ margin: '10px 0' }}>
                                <button onClick={() => setShowMatrix(v => !v)}>
                                    {showMatrix ? 'Hide full transition matrix' : 'Show full transition matrix'}
                                </button>
                            </div>
                            {showMatrix && <MatrixTable key={`${selectedChainIndex}-${chain.states.length}`} matrix={chain.transitionMatrix} names={chain.stateNames} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

ReactDOM.render(<MarkovChainVisualization />, document.getElementById('root'));