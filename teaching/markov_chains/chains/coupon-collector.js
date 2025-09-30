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

        // Absorption tracking
        this.absorbingState = numCoupons; // Complete collection state
        this.dotArrivalSteps = new Array(this.numDots).fill(NaN);
        this._absorbed = new Array(this.numDots).fill(false);
        this.absorbedCount = 0;
        this.onArrival = (dotIndex, state) => {
            if (state === this.absorbingState && !this._absorbed[dotIndex]) {
                this._absorbed[dotIndex] = true;
                this.absorbedCount++;
                const dot = this.dots[dotIndex];
                const transitions = dot.history ? dot.history.length - 1 : 0;
                this.dotArrivalSteps[dotIndex] = transitions;
            }
        };
    }

    getNodePositions(centerX, centerY, radius, canvasWidth = 800) {
        // Arrange ALL states on a single horizontal row, evenly spaced
        const count = this.states.length;
        if (count === 0) return [];

        const nodeRadius = this.getNodeRadius ? this.getNodeRadius() : 30;
        const margin = Math.max(2 * nodeRadius, 40);
        const available = Math.max(canvasWidth - 2 * margin, count > 1 ? 1 : 0);
        const step = count > 1 ? available / (count - 1) : 0;

        return this.states.map((_, i) => ({
            x: centerX - available / 2 + i * step,
            y: centerY
        }));
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
            showTransitionMatrix: true,
            showEdgeLabels: false
        };
    }

    getEdgeRenderMode() {
        return 'mixed'; // Use straight edges for cleaner look with many states
    }

    isRunComplete() {
        return this.absorbedCount === this.numDots;
    }

    getHistogramData() {
        return this.dotArrivalSteps ? this.dotArrivalSteps.filter(v => Number.isFinite(v)) : [];
    }

    reset() {
        super.reset();
        this.dotArrivalSteps = new Array(this.numDots).fill(NaN);
        this._absorbed = new Array(this.numDots).fill(false);
        this.absorbedCount = 0;
    }

    setNumDots(num) {
        super.setNumDots(num);
        this.dotArrivalSteps = new Array(num).fill(NaN);
        this._absorbed = new Array(num).fill(false);
        this.absorbedCount = 0;
    }
}

chainModules.push(CouponCollector);