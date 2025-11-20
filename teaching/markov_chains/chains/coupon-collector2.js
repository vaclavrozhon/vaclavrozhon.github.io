class CouponCollector2 extends MarkovChain {
    constructor(numCoupons = 10) {
        const states = Array.from({ length: numCoupons + 1 }, (_, i) => i);
        const stateNames = states.map(i => `${i}`);
        const transitionMatrix = CouponCollector2._buildTransitionMatrix(numCoupons);

        super({
            name: "Coupon Collector",
            description: `Collect ${numCoupons} coupons with equal probability.`,
            states,
            stateNames,
            transitionMatrix,
            initialDistribution: [1, ...Array(numCoupons).fill(0)]
        });

        this.numCoupons = numCoupons;
        this.absorbingState = numCoupons;
        this._initAbsorptionTracking(this.numDots);
    }

    static _buildTransitionMatrix(numCoupons) {
        return Array.from({ length: numCoupons + 1 }, (_, i) => {
            const row = Array(numCoupons + 1).fill(0);
            if (i === numCoupons) {
                row[i] = 1;
            } else {
                const pNew = (numCoupons - i) / numCoupons;
                row[i] = 1 - pNew;
                row[i + 1] = pNew;
            }
            return row;
        });
    }

    _initAbsorptionTracking(count) {
        this.dotArrivalSteps = new Array(count).fill(NaN);
        this._absorbed = new Array(count).fill(false);
        this.absorbedCount = 0;
        this.onArrival = (dotIndex, state) => {
            if (state === this.absorbingState && !this._absorbed[dotIndex]) {
                this._absorbed[dotIndex] = true;
                this.absorbedCount++;
                const dot = this.dots[dotIndex];
                this.dotArrivalSteps[dotIndex] = dot.history ? dot.history.length - 1 : 0;
            }
        };
    }

    getNodePositions(centerX, centerY) {
        const spacing = this.getNodeSpacing ? this.getNodeSpacing() : 160;
        const startX = centerX - spacing * (this.states.length - 1) / 2;
        return this.states.map((_, i) => ({
            x: startX + i * spacing,
            y: centerY
        }));
    }

    getRenderConfig() {
        return {
            canvasHeight: 420,
            showStats: true,
            showTransitionMatrix: true,
            showEdgeLabels: true,
            selfLoopOrientation: 'up'
        };
    }

    getEdgeRenderMode() {
        return 'mixed';
    }

    getTheoreticalSteadyState() {
        const steady = Array(this.numCoupons + 1).fill(0);
        steady[this.numCoupons] = 1;
        return steady;
    }

    getHistogramData() {
        return this.dotArrivalSteps.filter(v => Number.isFinite(v));
    }

    reset() {
        super.reset();
        this._initAbsorptionTracking(this.numDots);
    }

    setNumDots(num) {
        super.setNumDots(num);
        this._initAbsorptionTracking(num);
    }
}

chainModules.push(CouponCollector2);

