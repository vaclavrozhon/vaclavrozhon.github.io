class WaitingForSix extends MarkovChain {
    static meta = {"name": "Waiting for Six", "description": "Rolling a die until getting a 6."};

    constructor() {
        super({
            name: "Waiting for Six",
            description: "Rolling a die until getting a 6. Two states: Rolling and Success.",
            states: [0, 1],
            stateNames: ['Rolling', 'Success'],
            transitionMatrix: [
                [5/6, 1/6],  // Rolling: 5/6 stay rolling, 1/6 to success
                [0, 1]       // Success: absorbing state
            ],
            initialDistribution: [1.0, 0.0]  // Start in Rolling state
        });

        this.trackAbsorption([1]);
    }

    getNodePositions(centerX, centerY, radius) {
        // Position nodes horizontally
        const spacing = 200;
        return [
            { x: centerX - spacing/2, y: centerY },
            { x: centerX + spacing/2, y: centerY }
        ];
    }

    getTheoreticalSteadyState() {
        // Eventually all probability mass goes to Success state
        return [0, 1];
    }

    getRenderConfig() {
        return {
            canvasHeight: 300,
            showStats: true,
            showTransitionMatrix: true,
            showEdgeLabels: true
        };
    }

    isRunComplete() {
        return this.absorbedCount === this.numDots;
    }

    getHistogramData() {
        return this.dotArrivalSteps ? this.dotArrivalSteps.filter(v => Number.isFinite(v)) : [];
    }
}

chainModules.push(WaitingForSix);
