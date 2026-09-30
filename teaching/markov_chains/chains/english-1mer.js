class English1Mer extends WordMarkovChain {
    static meta = {"name": "English 1-mer (Full)", "description": "Character-level transitions from English words (28 states)."};

    constructor() {
        // Initialize with empty data, will be loaded asynchronously
        super({
            name: "English 1-mer (Full)",
            description: "Character-level transitions from English words (all 28 states)",
            states: [],
            stateNames: [],
            transitionMatrix: [],
            initialDistribution: [],
            colorScheme: 'custom'
        });

        this.ready = this.loadFromCSV();
    }

    async loadFromCSV() {
        try {
            const csvText = await WordMarkovChain.loadText('markov_k1.csv');

            // Parse CSV
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',');

            // Build transition map from CSV data
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

            // Order states: <s>, alphabetically, then </s>
            const states = [];
            const stateNames = [];

            if (statesSet.has('<s>')) {
                states.push(states.length);
                stateNames.push('<s>');
                statesSet.delete('<s>');
            }

            // Add letters alphabetically
            const letters = Array.from(statesSet).filter(s => !s.startsWith('<') && !s.startsWith('</'));
            letters.sort();
            for (const letter of letters) {
                states.push(states.length);
                stateNames.push(letter);
            }

            // Add end state
            if (statesSet.has('</s>') || Array.from(statesSet).some(s => s === '</s>')) {
                states.push(states.length);
                stateNames.push('</s>');
            }

            // Build transition matrix
            const n = states.length;
            const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                const fromState = stateNames[i];
                if (transitions[fromState]) {
                    for (let j = 0; j < n; j++) {
                        const toState = stateNames[j];
                        if (transitions[fromState][toState]) {
                            matrix[i][j] = transitions[fromState][toState];
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
            this.initialDistribution[0] = 1.0; // Start at <s>

            this._dataLoaded = true;
            this.trackAbsorption([stateNames.indexOf('</s>')]);
            this.reset();

        } catch (error) {
            this.loadError = `Could not load English 1-mer data: ${error.message}`;
        } finally {
            this.onDataLoaded?.();
        }
    }

    getEmittedText(stateName) {
        return /^[a-z]$/.test(stateName) ? stateName : '';
    }

    getNodePositions(centerX, centerY, radius, canvasWidth) {
        // Custom layout: <s> on left, </s> on right, letters in 5x6 grid in between
        const positions = [];
        const width = canvasWidth || 800;
        const height = 400; // Default height for layout

        if (this.stateNames.length === 0) {
            return positions;
        }

        // <s> on the left
        positions.push({
            x: width * 0.08,
            y: height / 2
        });

        // Letters in a roughly 5x6 grid in the center with more spacing
        const gridStartX = width * 0.2;
        const gridEndX = width * 0.8;
        const gridWidth = gridEndX - gridStartX;
        const gridHeight = height * 0.85;
        const gridStartY = (height - gridHeight) / 2;

        const numLetters = this.stateNames.length - 2; // Exclude <s> and </s>
        const cols = 5;
        const rows = Math.ceil(numLetters / cols);

        // Add minimum spacing between nodes
        const minSpacing = 60; // Minimum pixels between node centers
        const cellWidth = Math.max(gridWidth / cols, minSpacing);
        const cellHeight = Math.max(gridHeight / rows, minSpacing);

        // Center the grid if it's smaller than available space
        const actualGridWidth = cellWidth * cols;
        const actualGridHeight = cellHeight * rows;
        const adjustedStartX = gridStartX + (gridWidth - actualGridWidth) / 2;
        const adjustedStartY = gridStartY + (gridHeight - actualGridHeight) / 2;

        // Arrange letters in the grid
        for (let i = 0; i < numLetters; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            positions.push({
                x: adjustedStartX + col * cellWidth + cellWidth / 2,
                y: adjustedStartY + row * cellHeight + cellHeight / 2
            });
        }

        // </s> on the right
        positions.push({
            x: width * 0.92,
            y: height / 2
        });

        return positions;
    }

    getStateColor(stateIndex) {
        if (stateIndex === 0) return '#FF6B6B';  // <s> - red
        if (stateIndex === this.states.length - 1) return '#808080';  // </s> - gray

        // Color gradient for letters based on position
        const numLetters = this.states.length - 2;
        const hue = ((stateIndex - 1) * 360) / numLetters;
        return `hsl(${hue}, 70%, 55%)`;
    }

    getTheoreticalSteadyState() {
        // With absorbing end state, steady state is all probability at </s>
        const n = this.states.length;
        const steadyState = Array(n).fill(0);
        if (n > 0) {
            steadyState[n - 1] = 1.0; // All probability at </s>
        }
        return steadyState;
    }

    getRenderConfig() {
        return {
            canvasHeight: 450,  // Slightly taller canvas for 1-mer grid layout
            showTransitionMatrix: true  // Show transition matrix for 1-mer
        };
    }
}

chainModules.push(English1Mer);
