class CouponCollector extends MarkovChain {
    constructor() {
        // States represent number of distinct coupons collected (0 to 10)
        const numCoupons = 10;
        const states = Array.from({length: numCoupons + 1}, (_, i) => i);
        const stateNames = states.map(i => i === numCoupons ? `${i} (Complete!)` : i.toString());

        // Create transition matrix
        const transitionMatrix = [];
        for (let i = 0; i <= numCoupons; i++) {
            const row = new Array(numCoupons + 1).fill(0);

            if (i === numCoupons) {
                // Complete set - absorbing state
                row[numCoupons] = 1.0;
            } else {
                // Have i distinct coupons
                // Probability of getting a new coupon: (numCoupons - i) / numCoupons
                // Probability of getting a duplicate: i / numCoupons
                row[i] = i / numCoupons;           // Stay in same state (duplicate)
                row[i + 1] = (numCoupons - i) / numCoupons;  // New coupon
            }

            transitionMatrix.push(row);
        }

        super({
            name: "Coupon Collector",
            description: "Collecting 10 different coupons. Each coupon is equally likely to appear.",
            states: states,
            stateNames: stateNames,
            transitionMatrix: transitionMatrix,
            initialDistribution: [1.0, ...new Array(numCoupons).fill(0)]  // Start with 0 coupons
        });

        this.numCoupons = numCoupons;
    }

    getNodePositions(centerX, centerY, radius) {
        // Arrange nodes in a grid formation
        const cols = 4;
        const rows = Math.ceil(this.states.length / cols);
        const spacingX = 140;
        const spacingY = 100;

        const startX = centerX - (cols - 1) * spacingX / 2;
        const startY = centerY - (rows - 1) * spacingY / 2;

        return this.states.map((_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return {
                x: startX + col * spacingX,
                y: startY + row * spacingY
            };
        });
    }

    getTheoreticalSteadyState() {
        // Eventually all probability mass goes to the complete state
        const steadyState = new Array(this.numCoupons + 1).fill(0);
        steadyState[this.numCoupons] = 1;
        return steadyState;
    }

    getRenderConfig() {
        return {
            canvasHeight: 500,
            showStats: true,
            showTransitionMatrix: false,  // Too large to display nicely
            showEdgeLabels: false         // Too cluttered with many transitions
        };
    }

    getEdgeRenderMode() {
        return 'mixed'; // Use straight edges for cleaner look with many states
    }
}

chainModules.push(CouponCollector);