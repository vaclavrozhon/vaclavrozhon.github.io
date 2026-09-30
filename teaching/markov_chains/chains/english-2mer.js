class English2Mer extends WordMarkovChain {
    static meta = {"name": "English 2-mer (Bigrams)", "description": "Character-level English model with two-letter contexts (730 states)."};

    constructor() {
        // Initialize with empty data for simplified visualization
        super({
            name: "English 2-mer (Bigrams)",
            description: "Character-level English model with two-letter contexts (730 states)",
            states: [],
            stateNames: [],
            transitionMatrix: [],
            initialDistribution: [],
            colorScheme: 'gradient'
        });

        this.ready = this.loadFromCSV();
    }

    getNodeFontSize() {
        return 20;
    }

    async loadFromCSV() {
        try {
            const csvText = await WordMarkovChain.loadText('markov_k2.csv');

            // Parse CSV
            const lines = csvText.trim().split('\n');

            // Build full transition map from CSV data
            const transitions = {};
            const statesSet = new Set();

            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',');
                if (parts.length >= 4) {
                    const context = parts[1];
                    const next = parts[2];
                    const prob = parseFloat(parts[3]);

                    statesSet.add(context);
                    statesSet.add(next);

                    if (!transitions[context]) {
                        transitions[context] = {};
                    }
                    transitions[context][next] = prob;
                }
            }

            // Build complete bigram structure: <s><s>, <s>X, XY, X</s>, </s></s>
            const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
            const states = [];
            const stateNames = [];

            // 1. Start state: <s><s>
            states.push(0);
            stateNames.push('<s><s>');

            // 2. <s>X states (26 states)
            for (const letter of letters) {
                states.push(states.length);
                stateNames.push(`<s>${letter}`);
            }

            // 3. XY states (26x26 = 676 states)
            for (const first of letters) {
                for (const second of letters) {
                    states.push(states.length);
                    stateNames.push(`${first}${second}`);
                }
            }

            // 4. X</s> states (26 states)
            for (const letter of letters) {
                states.push(states.length);
                stateNames.push(`${letter}</s>`);
            }

            // 5. End state: </s></s>
            states.push(states.length);
            stateNames.push('</s></s>');

            // Total: 1 + 26 + 676 + 26 + 1 = 730 states

            // Build transition matrix
            const n = states.length;
            const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                const fromState = stateNames[i];

                if (fromState === '</s></s>') {
                    // Absorbing end state
                    matrix[i][i] = 1.0;
                } else if (fromState.endsWith('</s>') && fromState.length === 5) {
                    // X</s> states should transition to </s></s> with probability 1
                    // (since no such transitions exist in the training data)
                    const endStateIndex = stateNames.indexOf('</s></s>');
                    if (endStateIndex >= 0) {
                        matrix[i][endStateIndex] = 1.0;
                    }
                } else {
                    // Map internal state names to CSV format and build transitions
                    let csvFromState = fromState;

                    // Handle special mappings for CSV format
                    if (fromState.endsWith('</s>')) {
                        // X</s> states: map to single letter in CSV
                        csvFromState = fromState.substring(0, fromState.length - 4); // Remove '</s>'
                    }

                    if (transitions[csvFromState]) {
                        for (const [csvToState, prob] of Object.entries(transitions[csvFromState])) {
                            // Find the internal state that corresponds to this CSV transition
                            let targetStateIndex = -1;

                            if (fromState === '<s><s>' && csvToState !== '</s>') {
                                // <s><s> -> X should go to <s>X
                                const targetState = '<s>' + csvToState;
                                targetStateIndex = stateNames.indexOf(targetState);
                            } else if (fromState.startsWith('<s>') && fromState.length === 4) {
                                // <s>X -> Y should go to XY
                                const X = fromState[3]; // Get the X from <s>X
                                if (csvToState === '</s>') {
                                    // <s>X -> </s> should go to X</s>
                                    const targetState = X + '</s>';
                                    targetStateIndex = stateNames.indexOf(targetState);
                                } else {
                                    // <s>X -> Y should go to XY
                                    const targetState = X + csvToState;
                                    targetStateIndex = stateNames.indexOf(targetState);
                                }
                            } else if (fromState.length === 2 && !fromState.includes('<') && !fromState.includes('>')) {
                                // XY -> Z should go to YZ
                                const Y = fromState[1]; // Get the Y from XY
                                if (csvToState === '</s>') {
                                    // XY -> </s> should go to Y</s>
                                    targetStateIndex = stateNames.indexOf(Y + '</s>');
                                } else {
                                    const targetState = Y + csvToState;
                                    targetStateIndex = stateNames.indexOf(targetState);
                                }
                            } else if (fromState.endsWith('</s>') && csvToState === '</s>') {
                                // X</s> -> </s> should go to </s></s>
                                targetStateIndex = stateNames.indexOf('</s></s>');
                            }

                            if (targetStateIndex >= 0) {
                                matrix[i][targetStateIndex] = prob;
                            }
                        }
                    }
                }
            }


            // Update the chain properties
            this.states = states;
            this.stateNames = stateNames;
            this.transitionMatrix = matrix;
            this.stateCount = new Array(n).fill(0);
            this.initialDistribution = Array(n).fill(0);

            // Start at <s><s>
            this.initialDistribution[0] = 1.0;

            this._dataLoaded = true;
            this.trackAbsorption([stateNames.indexOf('</s></s>')]);
            this.reset();

        } catch (error) {
            this.loadError = `Could not load English 2-mer data: ${error.message}`;
        } finally {
            this.onDataLoaded?.();
        }
    }

    getEmittedText(stateName) {
        if (/^<s>[a-z]$/.test(stateName)) return stateName.slice(-1);
        return /^[a-z]{2}$/.test(stateName) ? stateName[1] : '';
    }

    getNodePositions(centerX, centerY, radius, canvasWidth) {
        // Custom layout: <s><s> left, <s>X column, XY matrix, X</s> column, </s></s> right
        const positions = [];
        // Calculate required dimensions to accommodate 26x26 matrix with 60px spacing for better readability
        const minMatrixWidth = 26 * 60; // 1560px minimum for matrix
        const minMatrixHeight = 26 * 60; // 1560px minimum for matrix
        const minTotalWidth = minMatrixWidth + 600; // Add space for columns and margins
        const minTotalHeight = Math.max(minMatrixHeight + 200, 1500); // Add space for margins

        const width = Math.max((canvasWidth || 800) * 2.5, minTotalWidth);
        const height = minTotalHeight;

        if (this.stateNames.length === 0) {
            return positions;
        }

        // Use uniform radius from base renderer for consistent spacing
        const nodeRadius = this._getUniformNodeRadius ? this._getUniformNodeRadius() : 30;
        const minNodeSpacing = Math.max(this.getNodeSpacing ? this.getNodeSpacing() : 120, nodeRadius * 4);

        // console.log(`DEBUG POSITIONING: width=${width}, height=${height}, nodeRadius=${nodeRadius}, minNodeSpacing=${minNodeSpacing}`);

        // 1. <s><s> on far left edge (aligned with canvas edge)
        const startNodeX = nodeRadius + 10;
        positions.push({
            x: startNodeX,
            y: height / 2
        });

        // 2. <s>X column (26 states) - vertical column with proper spacing
        const colX = startNodeX + 80; // Fixed distance from <s><s>
        const verticalMargin = nodeRadius + 40; // Dynamic margin based on radius
        const colHeight = height - 2 * verticalMargin;
        const letterSpacing = Math.max(colHeight / 25, minNodeSpacing);
        const colStartY = (height - letterSpacing * 25) / 2;

        // console.log(`DEBUG COLUMN: colX=${colX}, colHeight=${colHeight}, letterSpacing=${letterSpacing}, colStartY=${colStartY}`);

        for (let i = 0; i < 26; i++) {
            positions.push({
                x: colX,
                y: colStartY + i * letterSpacing
            });
        }

        // 3. XY matrix (26x26 = 676 states) - arranged in grid with proper spacing
        const matrixStartX = colX + 1000; // Start after <s>X column with gap
        const endNodeX = width - nodeRadius - 10;
        const rightColX = endNodeX + 800; // Fixed distance from </s></s>
        const matrixEndX = rightColX - 120; // End before X</s> column with gap
        const matrixWidth = matrixEndX - matrixStartX;
        const matrixStartY = verticalMargin; // Use same dynamic margin
        const matrixHeight = height - 2 * verticalMargin;

        // CRITICAL: Enforce minimum cell size to prevent node overlap
        // For neighboring nodes not to overlap: cellWidth >= 2*nodeRadius + gap
        // We use minNodeSpacing = 2*nodeRadius + gap = 80px
        const minCellSize = minNodeSpacing; // enforce non-overlap
        const cellWidth = Math.max(matrixWidth / 26, minCellSize);
        const cellHeight = Math.max(matrixHeight / 26, minCellSize);

        // If the matrix needs more space than allocated, it will expand beyond the allocated area
        // This is correct behavior - we prioritize non-overlapping nodes over fitting in arbitrary bounds

        // Center the matrix if it's smaller than available space
        const actualMatrixWidth = cellWidth * 26;
        const actualMatrixHeight = cellHeight * 26;
        const adjustedMatrixStartX = matrixStartX + (matrixWidth - actualMatrixWidth) / 2;
        const adjustedMatrixStartY = matrixStartY + (matrixHeight - actualMatrixHeight) / 2;

        for (let row = 0; row < 26; row++) {
            for (let col = 0; col < 26; col++) {
                positions.push({
                    x: adjustedMatrixStartX + col * cellWidth + cellWidth / 2,
                    y: adjustedMatrixStartY + row * cellHeight + cellHeight / 2
                });
            }
        }

        // 4. X</s> column (26 states) - vertical column on right with same spacing as left column
        for (let i = 0; i < 26; i++) {
            positions.push({
                x: rightColX,
                y: colStartY + i * letterSpacing
            });
        }

        // 5. </s></s> on far right
        positions.push({
            x: endNodeX,
            y: height / 2
        });

        // Shift X</s> column and end state to the right by 1000px
        const shiftAmount = 1000;
        for (let i = positions.length - 27; i < positions.length; i++) {
            if (positions[i]) {
                positions[i].x += shiftAmount;
            }
        }
        positions[positions.length-1].x += 1100;

        return positions;
    }

    getStateColor(stateIndex) {
        // Color coding for different types of states
        if (stateIndex === 0) {
            return '#FF6B6B'; // <s><s> - red
        }

        if (stateIndex < 27) {
            // <s>X states - blue gradient
            const intensity = 0.7 + 0.3 * (stateIndex - 1) / 25;
            return `hsl(220, 70%, ${50 + intensity * 20}%)`;
        }

        if (stateIndex < 27 + 676) {
            // XY states - green gradient based on position
            const pos = stateIndex - 27;
            const row = Math.floor(pos / 26);
            const col = pos % 26;
            const hue = 120 + (row + col) * 2; // Green with slight variation
            return `hsl(${hue % 360}, 60%, 55%)`;
        }

        if (stateIndex < 27 + 676 + 26) {
            // X</s> states - orange gradient
            const pos = stateIndex - 27 - 676;
            const intensity = 0.7 + 0.3 * pos / 25;
            return `hsl(30, 70%, ${50 + intensity * 20}%)`;
        }

        // </s></s> - gray
        return '#808080';
    }

    getTheoreticalSteadyState() {
        // With absorbing end state
        const n = this.states.length;
        const steadyState = Array(n).fill(0);

        // Find the end state
        const endIndex = this.stateNames.indexOf('</s></s>');

        if (endIndex >= 0) {
            steadyState[endIndex] = 1.0;
        }

        return steadyState;
    }

    getRenderConfig() {
        return {
            showTransitionMatrix: false,
            canvasHeight: 1000,
            showEdgeLabels: false
        };
    }
}

chainModules.push(English2Mer);
