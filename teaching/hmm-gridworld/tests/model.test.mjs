import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Experiment,
  makeTown,
  Viterbi,
  logEmission,
  revisions,
} from "../model.mjs";

test("The one trip lasts 60 seconds with the intended stops and both bridge crossings", () => {
  const a = new Experiment(),
    b = new Experiment({ seed: 91 });
  assert.equal(a.duration, 60);
  assert.equal(a.states.length, 61);
  assert.equal(a.observations.length, 61);
  assert.deepEqual(a.states, b.states);
  assert.notDeepEqual(a.observations, b.observations);
  const points = a.states.map((id) => a.grid.cells[id]);
  assert.deepEqual(points[0], { x: 4, y: 0 });
  assert.deepEqual(points[60], { x: 4, y: 12 });
  assert.equal(a.frames[60].phase, "complete");
  const waits = a.states.slice(1).filter((id, t) => id === a.states[t]).length;
  assert.equal(waits, 2);
  assert.deepEqual(
    points.slice(21, 30),
    [
      { x: 14, y: 3 },
      { x: 14, y: 2 },
      { x: 14, y: 1 },
      { x: 15, y: 1 },
      { x: 16, y: 1 },
      { x: 16, y: 2 },
      { x: 16, y: 3 },
      { x: 15, y: 3 },
      { x: 14, y: 3 },
    ],
    "The trip must loop around the house in the northeast",
  );
  assert.deepEqual(
    points.filter((p) => p.x === 11).map((p) => p.y),
    [3, 9],
  );
  for (const [arrival, place, wait] of [
    [8, "Cafe", 2],
    [35, "Hospital", 0],
    [44, "Harbor", 0],
  ]) {
    assert.equal(a.frames[arrival].phase, "arrived");
    assert.equal(a.frames[arrival].destination, place);
    for (let t = arrival + 1; t <= arrival + wait; t++) {
      assert.equal(a.states[t], a.states[arrival]);
      assert.equal(a.frames[t].phase, "waiting");
    }
    assert.notEqual(a.states[arrival + wait + 1], a.states[arrival]);
  }
  for (const path of [a.states, a.inference()])
    for (let t = 1; t < path.length; t++)
      assert.ok(a.grid.outgoing[path[t - 1]].includes(path[t]));
});

test("Town has 93 connected states with equal probabilities for legal moves and waiting", () => {
  const town = makeTown();
  assert.equal(town.cells.length, 93);
  const seen = new Set([0]),
    queue = [0];
  for (let i = 0; i < queue.length; i++)
    for (const to of town.outgoing[queue[i]])
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
  assert.equal(seen.size, town.cells.length);
  assert.equal(
    town.cells.some((p) => p.x === 11 && p.y === 6),
    false,
  );
  for (const degree of [2, 3, 4, 5])
    assert.ok(town.outgoing.some((row) => row.length === degree));
  for (const [from, row] of town.outgoing.entries()) {
    assert.ok(row.includes(from));
    let sum = 0;
    for (const to of row) {
      const a = town.cells[from],
        b = town.cells[to];
      assert.ok(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1);
      assert.ok(town.outgoing[to].includes(from));
      const probability = Math.exp(
        town.incoming[to].find((edge) => edge.from === from).logProbability,
      );
      assert.ok(Math.abs(probability - 1 / row.length) < 1e-14);
      sum += probability;
    }
    assert.ok(Math.abs(sum - 1) < 1e-14);
  }
});

function pathScore(grid, observations, sigma, path) {
  let score = -Math.log(grid.cells.length);
  for (let t = 0; t < path.length; t++) {
    score += logEmission(grid.cells[path[t]], observations[t], sigma);
    if (t) score -= Math.log(grid.outgoing[path[t - 1]].length);
  }
  return score;
}

test("Viterbi equals exhaustive search with source-dependent transition probabilities", () => {
  const grid = {
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
    outgoing: [
      [0, 1],
      [0, 1, 2, 3],
      [1, 2],
      [1, 3],
    ],
    incoming: [[], [], [], []],
  };
  grid.outgoing.forEach((row, from) =>
    row.forEach((to) =>
      grid.incoming[to].push({ from, logProbability: -Math.log(row.length) }),
    ),
  );
  const observations = [
    { x: -0.4, y: 0.3 },
    { x: 1.2, y: 0.7 },
    { x: 2.8, y: -0.5 },
    { x: 0.8, y: 1.5 },
  ];
  for (const sigma of [0.3, 1, 3]) {
    const decoder = new Viterbi(grid, sigma);
    observations.forEach((observation, t) => {
      const decoded = decoder.append(observation);
      const prefix = observations.slice(0, t + 1);
      let best = -Infinity;
      function visit(path) {
        if (path.length === prefix.length) {
          best = Math.max(best, pathScore(grid, prefix, sigma, path));
          return;
        }
        for (const next of path.length
          ? grid.outgoing[path.at(-1)]
          : [0, 1, 2, 3])
          visit([...path, next]);
      }
      visit([]);
      assert.ok(
        Math.abs(pathScore(grid, prefix, sigma, decoded) - best) < 1e-10,
      );
    });
  }
});

test("Precomputing the trip does not leak later observations into earlier inference", () => {
  const experiment = new Experiment();
  const prefixDecoder = new Viterbi(experiment.grid, experiment.sigma);
  let previous = [],
    revised = 0;
  experiment.observations.forEach((observation, t) => {
    const expected = prefixDecoder.append(observation);
    assert.deepEqual(experiment.inference(t), expected);
    assert.equal(expected.length, t + 1);
    revised += revisions(previous, expected).length;
    previous = expected;
  });
  assert.ok(revised > 0);
  assert.deepEqual(experiment.inference(-1), []);
});

test("Noise slider preserves the route and Gaussian draws, including off-map observations", () => {
  const experiment = new Experiment();
  const truth = [...experiment.states];
  const gps = structuredClone(experiment.observations);
  experiment.setSigma(0.5);
  assert.deepEqual(experiment.states, truth);
  for (let t = 0; t <= experiment.duration; t++) {
    const p = experiment.grid.cells[truth[t]];
    for (const axis of ["x", "y"])
      assert.ok(
        Math.abs(
          4 * (experiment.observations[t][axis] - p[axis]) -
            (gps[t][axis] - p[axis]),
        ) < 1e-12,
      );
  }
  experiment.setSigma(2);
  assert.deepEqual(experiment.observations, gps);
  const fresh = new Experiment();
  assert.deepEqual(experiment.inference(), fresh.inference());
  assert.deepEqual(experiment.observations, fresh.observations);
  experiment.setSigma(3);
  assert.ok(
    experiment.observations.some(
      (p) => p.x < -0.8 || p.y < -0.95 || p.x > 17.8 || p.y > 13.85,
    ),
  );
  assert.throws(() => experiment.setSigma(0), RangeError);
  assert.equal(experiment.sigma, 3);
});

test("Initial observation is counted once and invalid inference input is rejected", () => {
  const grid = makeTown(),
    decoder = new Viterbi(grid, 2);
  const observation = { x: 4, y: 0 };
  decoder.append(observation);
  for (let id = 0; id < grid.cells.length; id++)
    assert.equal(
      decoder.scores[0][id],
      -Math.log(grid.cells.length) +
        logEmission(grid.cells[id], observation, 2),
    );
  assert.throws(() => decoder.append({ x: NaN, y: 0 }), RangeError);
  assert.throws(() => decoder.path(1), RangeError);
});
