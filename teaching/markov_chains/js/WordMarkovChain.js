// Common lifecycle for the two CSV-backed character models.
class WordMarkovChain extends MarkovChain {
    static textCache = new Map();

    static loadText(url) {
        if (!this.textCache.has(url)) {
            const request = fetch(url).then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            }).catch(error => {
                this.textCache.delete(url); // A later selection can retry.
                throw error;
            });
            this.textCache.set(url, request);
        }
        return this.textCache.get(url);
    }

    initializeDots() {
        super.initializeDots();
        this.generatedWords = [];
        for (const dot of this.dots) {
            dot.currentWord = '';
            dot.hasFinished = false;
        }
    }

    onTransition(dotIndex, from, to) {
        const dot = this.dots[dotIndex];
        if (dot.hasFinished) return;
        // Every committed transition emits, including a self-loop (a -> a).
        dot.currentWord += this.getEmittedText(this.stateNames[to]);
        if (this.absorbingStates.has(to)) {
            this.generatedWords.push(dot.currentWord);
            dot.hasFinished = true;
        }
    }

    getGeneratedWords() {
        return this.generatedWords;
    }

    getHistogramData() {
        return this.dotArrivalSteps?.filter(Number.isFinite) || [];
    }

    isRunComplete() {
        return this.absorbedCount === this.numDots;
    }
}
