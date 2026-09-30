const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const root = join(__dirname, '..');
const sandbox = vm.createContext({ console, fetch: async url => ({
    ok: true, text: async () => readFileSync(join(root, url), 'utf8')
}) });
vm.runInContext('const chainModules = [];', sandbox);
const scripts = [...readFileSync(join(root, 'index.html'), 'utf8').matchAll(/src="((?:js|chains)\/[^\"]+\.js)"/g)].map(m => m[1]);
for (const script of scripts) vm.runInContext(readFileSync(join(root, script), 'utf8'), sandbox, { filename: script });
const create = expression => vm.runInContext(`new ${expression}`, sandbox);
const plain = value => JSON.parse(JSON.stringify(value));
const near = (a, b, epsilon = 1e-10) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
function move(chain, name) {
    const from = chain.dots[0].currentState;
    const to = chain.stateNames.indexOf(name);
    assert.ok(to >= 0, `Unknown state ${name}`);
    chain.transitionMatrix[from].fill(0);
    chain.transitionMatrix[from][to] = 1;
    assert.equal(chain.step(), true);
    chain.finishStep();
}

test('reset cancels pending transitions, histories and callbacks', () => {
    const chain = create('WaitingForSix()');
    let callbacks = 0;
    chain.onStepComplete = () => callbacks++;
    chain.step(); chain.animate(150);
    assert.ok(chain.dots.every(dot => dot.history.length === 1));
    chain.reset(); chain.animate(10000); chain.finishStep();
    assert.equal(chain.stepCount, 0);
    assert.equal(chain.stepInProgress, false);
    assert.equal(chain.stepElapsed, 0);
    assert.equal(callbacks, 0);
    assert.ok(chain.dots.every(dot => Number.isFinite(dot.x) && Number.isFinite(dot.y) && dot.currentState === 0));
    chain.step(); chain.finishStep(); chain.finishStep();
    assert.equal(chain.stepCount, 1);
    assert.equal(callbacks, 1);
});

test('absorption includes t=0 and is recorded only once', () => {
    const chain = create('RandomWalk(0.5, 0)');
    assert.equal(chain.absorbedCount, 100);
    assert.ok(chain.getHistogramData().every(t => t === 0));
    chain.step(); chain.finishStep();
    assert.ok(chain.getHistogramData().every(t => t === 0));
    chain.setNumDots(10);
    assert.equal(chain.absorbedCount, 10);
    assert.equal(chain.getHistogramData().length, 10);
    chain.updateStartPosition(4); chain.reset();
    assert.equal(chain.absorbedCount, 0);
    assert.equal(chain.getHistogramData().length, 0);
});

test('changing N preserves model parameters and cancels an active step', () => {
    const chain = create('RandomWalk()');
    chain.updateProbability(0.8);
    chain.updateStartPosition(7); chain.reset(); chain.step();
    chain.setNumDots(1000);
    assert.equal(chain.p, 0.8);
    assert.equal(chain.startPos, 7);
    assert.equal(chain.transitionMatrix[7][8], 0.8);
    assert.equal(chain.stepCount, 0);
    assert.equal(chain.stepInProgress, false);
    assert.equal(chain.stateCount[7], 1000);
    chain.setNumDots(0);
    assert.equal(chain.step(), false);
    assert.ok(chain.getStateProbabilities().every(p => p === 0));
});

for (const [name, path, word] of [
    ['English1Mer', ['a', 'a', '</s>'], 'aa'],
    ['English2Mer', ['<s>a', 'aa', 'aa', 'a</s>', '</s></s>'], 'aaa']
]) test(`${name} emits repeated letters and publishes immediately on absorption`, async () => {
    const chain = create(`${name}()`);
    await chain.ready;
    assert.ok(chain._dataLoaded, chain.loadError);
    chain.setNumDots(1);
    for (const state of path) move(chain, state);
    assert.deepEqual(plain(chain.getGeneratedWords()), [word]);
    assert.deepEqual(plain(chain.getHistogramData()), [path.length]);
    assert.equal(chain.absorbedCount, 1);
    chain.step(); chain.finishStep();
    assert.deepEqual(plain(chain.getGeneratedWords()), [word]);
    assert.deepEqual(plain(chain.getHistogramData()), [path.length]);
    chain.reset();
    assert.deepEqual(plain(chain.getGeneratedWords()), []);
    assert.deepEqual(plain(chain.getHistogramData()), []);
    for (const state of path) move(chain, state);
    assert.deepEqual(plain(chain.getGeneratedWords()), [word]);
    chain.setNumDots(10);
    assert.deepEqual(plain(chain.getGeneratedWords()), []);
    assert.deepEqual(plain(chain.getHistogramData()), []);
});

test('known exact distributions and stationary vectors', () => {
    const die = create('WaitingForSix()');
    die.getDistributionEvolution(10).forEach((dist, t) => {
        near(dist[0], (5/6) ** t); near(dist[1], 1 - (5/6) ** t);
    });
    for (const expression of ['WeatherModel()', 'PageRank()', 'ThrowingFrisbee()', 'UndirectedGraphWalk()']) {
        const chain = create(expression);
        const pi = chain.getTheoreticalSteadyState();
        near(pi.reduce((a, b) => a + b, 0), 1);
        pi.forEach((p, j) => near(p, pi.reduce((sum, q, i) => sum + q * chain.transitionMatrix[i][j], 0)));
    }
    const pr = create('PageRank()');
    for (const alpha of [0, 0.85, 1]) {
        pr.updateAlpha(alpha);
        const pi = pr.getTheoreticalSteadyState();
        pi.forEach((p, j) => near(p, pi.reduce((sum, q, i) => sum + q * pr.transitionMatrix[i][j], 0)));
        if (alpha === 0) pi.forEach(p => near(p, 1/15));
    }
});

test('all selectable models conserve particles and probability on reachable states', async () => {
    const classes = vm.runInContext('chainModules', sandbox);
    for (const Model of classes) {
        assert.ok(Model.meta?.name);
        const chain = new Model();
        if (chain.ready) await chain.ready;
        assert.ok(chain.states.length, chain.loadError);
        const reachable = new Set(chain.initialDistribution.flatMap((p, i) => p > 0 ? [i] : []));
        for (const from of reachable) {
            const row = chain.transitionMatrix[from];
            near(row.reduce((a, b) => a + b, 0), 1, 1e-6);
            row.forEach((p, i) => { assert.ok(Number.isFinite(p) && p >= 0); if (p > 0) reachable.add(i); });
        }
        chain.setNumDots(30);
        for (let t = 0; t < 30; t++) {
            chain.step(); chain.finishStep();
            assert.equal(chain.stateCount.reduce((a, b) => a + b, 0), 30);
            assert.ok(chain.dots.every(dot => dot.currentState >= 0 && dot.currentState < chain.states.length && dot.history.length === t + 2));
            chain.stateCount.forEach((count, i) => assert.equal(count, chain.dots.filter(dot => dot.currentState === i).length));
        }
        chain.getDistributionEvolution(10).forEach(dist => near(dist.reduce((a, b) => a + b, 0), 1, 1e-6));
        chain.reset();
        assert.equal(chain.stepCount, 0);
        if (chain.getHistogramData) assert.equal(chain.getHistogramData().length, 0);
    }
});

test('exact distribution cache follows changed model parameters', () => {
    const chain = create('RandomWalk()');
    const initial = chain.getDistributionEvolution(10);
    assert.equal(chain.getDistributionEvolution(10), initial);
    chain.updateProbability(0.8); chain.reset();
    const changed = chain.getDistributionEvolution(10);
    assert.notEqual(initial, changed);
    near(changed[1][5], 0.8);
    chain.updateStartPosition(2); chain.reset();
    near(chain.getDistributionEvolution(10)[0][2], 1);
});

test('invalid matrices are rejected without modifying the simulation', () => {
    const chain = create('WaitingForSix()');
    const original = chain.transitionMatrix;
    for (const matrix of [[[1]], [[NaN, 0], [0, 1]], [[1.1, -0.1], [0, 1]], [[0.1, 0.1], [0, 1]]]) {
        assert.throws(() => chain.updateTransitionMatrix(matrix));
        assert.equal(chain.transitionMatrix, original);
    }
});

test('automatic fit includes every node at desktop and narrow widths', async () => {
    for (const Model of vm.runInContext('chainModules', sandbox)) {
        const chain = new Model();
        if (chain.ready) await chain.ready;
        for (const width of [320, 600, 950]) {
            const height = chain.getRenderConfig().canvasHeight || 400;
            const { zoom, pan } = chain.getFitTransform(width, height);
            const radius = chain._getUniformNodeRadius() * zoom;
            for (const pos of chain.getLayoutPositions(width, height)) {
                const x = (pos.x - width / 2) * zoom + width / 2 + pan.x;
                const y = (pos.y - height / 2) * zoom + height / 2 + pan.y;
                assert.ok(x - radius >= 0 && x + radius <= width && y - radius >= 0 && y + radius <= height, Model.meta.name);
            }
        }
    }
});
