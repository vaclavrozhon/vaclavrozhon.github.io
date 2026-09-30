class SnakesAndLadders extends MarkovChain {
    static meta = {
        name: "Snakes & Ladders",
        description: "Classic board on 10x10 grid. Toggle snakes/ladders and edit mapping."
    };

    constructor() {
        const size = 100;
        const states = Array.from({ length: size + 1 }, (_, i) => i); // 0..100
        const stateNames = states.map(i => i.toString());

        const transitionMatrix = SnakesAndLadders.buildTransitionMatrix(size, {});

        super({
            name: "Snakes & Ladders",
            description: "Classic board on 10x10 grid. Toggle snakes/ladders and edit mapping.",
            states,
            stateNames,
            transitionMatrix,
            initialDistribution: (() => { const d = new Array(size + 1).fill(0); d[0] = 1; return d; })()
        });

        this.size = size;
        this.gridCols = 10;
        this.gridRows = 10;
        this.enableSpecials = true;
        this.specials = {
            // ladders (low -> high)
            2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44,
            // snakes (high -> low)
            51: 67, 71: 91, 78: 98,
            87: 94,
            16: 6, 46: 25, 49: 11, 62: 19, 64: 60, 74: 53, 89: 68,
            // Additional random snakes
            92: 88, 95: 75, 99: 80
        };
        this.rebuildMatrix();

        this.trackAbsorption([this.size]);
    }

    static buildTransitionMatrix(size, specials) {
        const matrix = Array.from({ length: size + 1 }, () => new Array(size + 1).fill(0));
        for (let state = 0; state <= size; state++) {
            if (state === size) { matrix[state][size] = 1; continue; }
            for (let roll = 1; roll <= 6; roll++) {
                let target = Math.min(state + roll, size);
                if (specials[target] != null) target = specials[target];
                matrix[state][target] += 1 / 6;
            }
        }
        return matrix;
    }

    getNodePositions(centerX, centerY, radius, canvasWidth = 800) {
        // Grid layout: 10x10, snake-like rows (left-to-right then right-to-left), node 0 at bottom-left outside grid
        const tile = 80; // larger spacing for better visibility
        const width = this.gridCols * tile;
        const height = this.gridRows * tile;
        const originX = centerX - width / 2;
        const originY = centerY + height / 2; // y increases downward in canvas

        const positions = Array.from({ length: this.size + 1 }, () => ({ x: centerX, y: centerY }));

        // position 0 slightly below bottom-left corner
        positions[0] = { x: originX - tile * 0.6, y: originY + tile * 0.2 };

        for (let idx = 1; idx <= this.size; idx++) {
            const zeroBased = idx - 1;
            const row = Math.floor(zeroBased / this.gridCols); // 0..9 from bottom
            const colInRow = zeroBased % this.gridCols;
            const isOddRow = row % 2 === 1; // snake-like direction
            const col = isOddRow ? (this.gridCols - 1 - colInRow) : colInRow;

            const x = originX + col * tile + tile / 2;
            const y = originY - row * tile - tile / 2;
            positions[idx] = { x, y };
        }
        return positions;
    }

    setSpecials(newMap) {
        this.specials = { ...newMap };
        this.rebuildMatrix();
    }

    toggleSpecials(enabled) {
        this.enableSpecials = enabled;
        this.rebuildMatrix();
    }

    rebuildMatrix() {
        const specials = this.enableSpecials ? this.specials : {};
        this.transitionMatrix = SnakesAndLadders.buildTransitionMatrix(this.size, specials);
    }

    getCustomControls() {
        // Reuse the simple slider UI as a toggle (0/1); plus return a side-effect editor via onChange
        return {
            type: 'toggle',
            label: 'Snakes & ladders (0=off,1=on)',
            value: this.enableSpecials ? 1 : 0,
            min: 0,
            max: 1,
            step: 1,
            onChange: (v) => this.toggleSpecials(v >= 1)
        };
    }

    getRenderConfig() {
        return {
            canvasHeight: 900,
            showStats: false,
            showTransitionMatrix: false,
            showEdgeLabels: false
        };
    }

    getEditors() {
        return [{
            type: 'mapping',
            id: 'specials',
            title: 'Snakes & Ladders',
            description: 'Enter start and end squares (1-99).',
            value: this.specials,
            onSave: (map) => this.setSpecials(map)
        }];
    }

    getEdgeRenderMode() {
        return 'curved_all';
    }

    isRunComplete() {
        return this.absorbedCount === this.numDots;
    }

    getHistogramData() {
        return this.dotArrivalSteps.filter(Number.isFinite);
    }

}

chainModules.push(SnakesAndLadders);
