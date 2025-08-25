const { useState, useMemo } = React;

const GridExplorer = () => {
    const GRID_SIZE = 40;
    const [points, setPoints] = useState(new Set());
    const [hoveredCell, setHoveredCell] = useState(null);
    const [namingMode, setNamingMode] = useState(false);
    const [cellNames, setCellNames] = useState(new Map());

    const handleCellClick = (x, y) => {
        const key = `${x},${y}`;
        
        if (namingMode) {
            const name = prompt(`Name for cell (${x},${y}):`);
            if (name !== null) {
                setCellNames(prev => {
                    const newNames = new Map(prev);
                    if (name.trim() === '') {
                        newNames.delete(key);
                    } else {
                        newNames.set(key, name.trim());
                    }
                    return newNames;
                });
            }
        } else {
            setPoints(prev => {
                const newPoints = new Set(prev);
                if (newPoints.has(key)) {
                    newPoints.delete(key);
                } else {
                    newPoints.add(key);
                }
                return newPoints;
            });
        }
    };

    const parsePoint = (key) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
    };

    const analysis = useMemo(() => {
        const pointArray = Array.from(points).map(parsePoint);
        const key = (x, y) => `${x},${y}`;

        // Index by rows/columns and sort once for O(log n) queries
        const rows = new Map(); // y -> sorted [x]
        const cols = new Map(); // x -> sorted [y]
        for (const {x, y} of pointArray) {
            if (!rows.has(y)) rows.set(y, []);
            rows.get(y).push(x);
            if (!cols.has(x)) cols.set(x, []);
            cols.get(x).push(y);
        }
        for (const xs of rows.values()) xs.sort((a, b) => a - b);
        for (const ys of cols.values()) ys.sort((a, b) => a - b);

        const upperBound = (arr, val) => {
            // first index with arr[i] > val
            let lo = 0, hi = arr.length;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (arr[mid] <= val) lo = mid + 1; else hi = mid;
            }
            return lo;
        };

        // ---- Type 1: SW endpoint has exactly one NE neighbor ----
        const type1SW = new Set();
        for (const p of pointArray) {
            const ne = pointArray.filter(q => q.x > p.x && q.y > p.y);
            if (ne.length === 1) type1SW.add(key(p.x, p.y));
        }

        // ---- Type 2: r_U(α,β)=s_U(α,β)=1 ----
        const type2Bases = new Set(); // cells (α,β) with exactly one up & one right
        for (let alpha = 0; alpha < GRID_SIZE; alpha++) {
            const colYs = cols.get(alpha) || [];
            for (let beta = 0; beta < GRID_SIZE; beta++) {
                const up = colYs.length - upperBound(colYs, beta);
                const rowXs = rows.get(beta) || [];
                const right = rowXs.length - upperBound(rowXs, alpha);
                if (up === 1 && right === 1) type2Bases.add(key(alpha, beta));
            }
        }

        // ---- Type 3: sum over columns of above_U(x,β) equals 1 ----
        // Build multiplicity per β exactly, and remember the unique edge endpoints when it happens
        const type3Count = new Map();            // β -> multiplicity
        const type3Candidates = [];              // pairs [lowerKey, upperKey] for cases with exactly one "above" in that column
        for (const [x, ys] of cols.entries()) {
            for (let i = 0; i < ys.length - 1; i++) {
                const y0 = ys[i];
                const above = ys.length - i - 1;
                type3Count.set(y0, (type3Count.get(y0) || 0) + above);
                if (above === 1) {
                    const y1 = ys[i + 1]; // the only point above
                    type3Candidates.push([key(x, y0), key(x, y1)]);
                }
            }
        }
        const type3Lower = new Set(), type3Upper = new Set();
        const uniqueBeta = new Set([...type3Count.entries()].filter(([, c]) => c === 1).map(([b]) => b));
        for (const [lowK, upK] of type3Candidates) {
            const { y: beta } = parsePoint(lowK);
            if (uniqueBeta.has(beta)) {
                type3Lower.add(lowK);
                type3Upper.add(upK);
            }
        }

        // ---- Type 4: sum over rows of right_U(α,y) equals 1 ----
        const type4Count = new Map();            // α -> multiplicity
        const type4Candidates = [];              // pairs [leftKey, rightKey] for cases with exactly one "right" in that row
        for (const [y, xs] of rows.entries()) {
            for (let j = 0; j < xs.length - 1; j++) {
                const x0 = xs[j];
                const right = xs.length - j - 1;
                type4Count.set(x0, (type4Count.get(x0) || 0) + right);
                if (right === 1) {
                    const x1 = xs[j + 1]; // the only point to the right
                    type4Candidates.push([key(x0, y), key(x1, y)]);
                }
            }
        }
        const type4Left = new Set(), type4Right = new Set();
        const uniqueAlpha = new Set([...type4Count.entries()].filter(([, c]) => c === 1).map(([a]) => a));
        for (const [leftK, rightK] of type4Candidates) {
            const { x: alpha } = parsePoint(leftK);
            if (uniqueAlpha.has(alpha)) {
                type4Left.add(leftK);
                type4Right.add(rightK);
            }
        }

        const hasUnique =
            type1SW.size > 0 ||
            type2Bases.size > 0 ||
            type3Lower.size > 0 ||
            type4Left.size > 0;

        return {
            type1SW,
            type2Bases,
            type3Lower, type3Upper,
            type4Left,  type4Right,
            hasUnique,
            pointCount: pointArray.length
        };
    }, [points]);

    const getCellClass = (x, y) => {
        const k = `${x},${y}`;
        const classes = ['cell'];

        // Base point
        if (points.has(k)) {
            classes.push('point');
            if (analysis.type1SW.has(k)) classes.push('w1');           // Type 1 SW endpoint
            if (analysis.type3Lower.has(k)) classes.push('w3-lower');   // Type 3 lower endpoint
            if (analysis.type3Upper.has(k)) classes.push('w3-upper');   // Type 3 upper endpoint
            if (analysis.type4Left.has(k))  classes.push('w4-left');    // Type 4 left endpoint
            if (analysis.type4Right.has(k)) classes.push('w4-right');   // Type 4 right endpoint
        }

        // Type 2 base may be an empty cell
        if (analysis.type2Bases.has(k)) classes.push('w2-base');

        if (hoveredCell && hoveredCell.x === x && hoveredCell.y === y) {
            classes.push('hovered');
        }
        
        return classes.join(' ');
    };

    const clearGrid = () => {
        setPoints(new Set());
        setCellNames(new Map());
    };

    return (
        <div className="container">
            <h1>Unique Color Conjecture Explorer</h1>
            
            <div className="controls">
                <button onClick={clearGrid}>Clear Grid</button>
                <button 
                    onClick={() => setNamingMode(!namingMode)} 
                    className={namingMode ? 'active' : ''}
                >
                    {namingMode ? 'Exit Naming' : 'Name Cells'}
                </button>
                <div className="stats">
                    Points: {analysis.pointCount} | 
                    Type 1: {analysis.type1SW.size} | 
                    Type 2: {analysis.type2Bases.size} | 
                    Type 3: {analysis.type3Lower.size} | 
                    Type 4: {analysis.type4Left.size}
                </div>
                <div className={`status ${analysis.hasUnique ? 'has-unique' : 'no-unique'}`}>
                    {analysis.pointCount >= 2 ? 
                        (analysis.hasUnique ? '✓ Has unique color' : '✗ No unique color (counterexample!)') : 
                        'Add at least 2 points'}
                </div>
            </div>

            <div className="grid-container">
                <div className="grid">
                    {Array.from({ length: GRID_SIZE }, (_, y) => (
                        <div key={y} className="row">
                            {Array.from({ length: GRID_SIZE }, (_, x) => (
                                <div
                                    key={`${x},${y}`}
                                    className={getCellClass(x, GRID_SIZE - 1 - y)}
                                    onClick={() => handleCellClick(x, GRID_SIZE - 1 - y)}
                                    onMouseEnter={() => setHoveredCell({ x, y: GRID_SIZE - 1 - y })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                >
                                    {cellNames.get(`${x},${GRID_SIZE - 1 - y}`) && (
                                        <span className="cell-name">
                                            {cellNames.get(`${x},${GRID_SIZE - 1 - y}`)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                
                <div className="legend">
                    <h3>Legend</h3>
                    <div className="legend-item">
                        <div className="legend-color point"></div>
                        <span>Point</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color w1"></div>
                        <span>Type 1: SW with 1 NE neighbor</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color w2"></div>
                        <span>Type 2: Base with 1 up & 1 right</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color w3"></div>
                        <span>Type 3: Unique vertical edge</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color w4"></div>
                        <span>Type 4: Unique horizontal edge</span>
                    </div>
                </div>
            </div>

            <style>{`
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                h1 {
                    margin: 0 0 20px 0;
                    color: #333;
                }

                .controls {
                    margin-bottom: 20px;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                button {
                    padding: 8px 16px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                }

                button:hover {
                    background: #0056b3;
                }

                button.active {
                    background: #28a745;
                }

                button.active:hover {
                    background: #218838;
                }

                .stats {
                    padding: 8px 16px;
                    background: #f8f9fa;
                    border-radius: 5px;
                    font-size: 14px;
                    color: #666;
                }

                .status {
                    padding: 8px 16px;
                    border-radius: 5px;
                    font-weight: bold;
                    font-size: 14px;
                }

                .status.has-unique {
                    background: #d4edda;
                    color: #155724;
                }

                .status.no-unique {
                    background: #f8d7da;
                    color: #721c24;
                }

                .grid-container {
                    display: flex;
                    gap: 30px;
                }

                .grid {
                    display: inline-block;
                    border: 2px solid #333;
                    background: white;
                }

                .row {
                    display: flex;
                }

                .cell {
                    width: 20px;
                    height: 20px;
                    border: 1px solid #ddd;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .cell-name {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 22px;
                    font-weight: bold;
                    color: #28a745;
                    text-shadow: 0 0 2px white, 0 0 3px white;
                    pointer-events: none;
                    z-index: 10;
                    max-width: 18px;
                    overflow: hidden;
                    text-align: center;
                }

                .cell.hovered {
                    border-color: #666;
                    z-index: 10;
                }

                .cell.point {
                    background: #333;
                }

                /* Type 1: SW endpoint with exactly one NE neighbor */
                .cell.point.w1 {
                    box-shadow: inset 0 0 0 3px #ff6b6b;
                }

                /* Type 2: base cell (can be empty) with exactly one up & one right */
                .cell.w2-base {
                    box-shadow: inset 0 0 0 2px #4ecdc4;
                }
                .cell.point.w2-base {
                    box-shadow: inset 0 0 0 3px #4ecdc4;
                }

                /* Type 3: vertical edge endpoints */
                .cell.point.w3-lower {
                    box-shadow: inset 0 0 0 3px #8e44ad;
                }
                .cell.point.w3-upper {
                    box-shadow: inset 0 0 0 6px rgba(142, 68, 173, 0.4);
                }

                /* Type 4: horizontal edge endpoints */
                .cell.point.w4-left {
                    box-shadow: inset 0 0 0 3px #f39c12;
                }
                .cell.point.w4-right {
                    box-shadow: inset 0 0 0 6px rgba(243, 156, 18, 0.4);
                }

                /* Combined witnesses */
                .cell.point.w1.w2-base {
                    box-shadow: inset 0 0 0 3px #ff6b6b, inset 0 0 0 6px #4ecdc4;
                }
                .cell.point.w1.w3-lower {
                    box-shadow: inset 0 0 0 3px #ff6b6b, inset 0 0 0 6px #8e44ad;
                }
                .cell.point.w1.w4-left {
                    box-shadow: inset 0 0 0 3px #ff6b6b, inset 0 0 0 6px #f39c12;
                }

                .legend {
                    flex-shrink: 0;
                }

                .legend h3 {
                    margin: 0 0 15px 0;
                    color: #333;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                    font-size: 14px;
                }

                .legend-color {
                    width: 25px;
                    height: 25px;
                    border: 1px solid #ddd;
                }

                .legend-color.point {
                    background: #333;
                }

                .legend-color.w1 {
                    background: #333;
                    box-shadow: inset 0 0 0 3px #ff6b6b;
                }

                .legend-color.w2 {
                    box-shadow: inset 0 0 0 3px #4ecdc4;
                }

                .legend-color.w3 {
                    background: #333;
                    box-shadow: inset 0 0 0 3px #8e44ad;
                }

                .legend-color.w4 {
                    background: #333;
                    box-shadow: inset 0 0 0 3px #f39c12;
                }
            `}</style>
        </div>
    );
};

ReactDOM.render(<GridExplorer />, document.getElementById('root'));