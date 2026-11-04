import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildHouseModel,
  HouseSampler,
  HOUSE_SETTINGS,
  houseLogPosterior,
} from "../src/house-model.mjs";
import { seededRandom, pollSD } from "../src/model.mjs";
const house = JSON.parse(
  fs.readFileSync(new URL("../src/data/house2026.json", import.meta.url)),
);
const toy = {
  chamber: "house",
  totalSeats: 3,
  fixedSeats: { dem: 0, rep: 0 },
  controlThresholds: { dem: 2, rep: 2 },
  races: [
    { state: "A", margin2024: -1 },
    { state: "B", margin2024: 2 },
    { state: "C", margin2024: 0 },
  ],
  statePolls: [
    { state: "A", margin: 1.2, n: 2000, ageDays: 0 },
    { state: "B", margin: 3, n: 1500, ageDays: 4 },
  ],
  nationalPolls: [
    { margin: 1.8, n: 3000, ageDays: 1 },
    { margin: 2.1, n: 2500, ageDays: 3 },
  ],
};
function inverse(matrix) {
  const n = matrix.length;
  const a = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => Number(i === j)),
  ]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    [a[c], a[pivot]] = [a[pivot], a[c]];
    const scale = a[c][c];
    for (let j = 0; j < 2 * n; j++) a[c][j] /= scale;
    for (let r = 0; r < n; r++)
      if (r !== c) {
        const factor = a[r][c];
        for (let j = 0; j < 2 * n; j++) a[r][j] -= factor * a[c][j];
      }
  }
  return a.map((row) => row.slice(n));
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const multiply = (a, x) => a.map((row) => dot(row, x));
function reference(model) {
  const n = toy.races.length,
    polls = [...toy.statePolls, ...toy.nationalPolls];
  const priorCov = Array.from({ length: n }, (_, i) =>
    Array.from(
      { length: n },
      (_, j) =>
        model.settings.nationalSwingSD ** 2 +
        (i === j ? model.settings.districtSD ** 2 : 0),
    ),
  );
  const pollCov = polls.map((p, i) =>
    polls.map(
      (_, j) =>
        model.settings.sharedPollErrorSD ** 2 + (i === j ? pollSD(p) ** 2 : 0),
    ),
  );
  const priorPrecision = inverse(priorCov),
    pollPrecision = inverse(pollCov);
  const A = polls.map((p) =>
    toy.races.map((r) => (p.state ? Number(r.state === p.state) : 1 / n)),
  );
  const y = polls.map((p) => p.margin),
    baseline = toy.races.map((r) => r.margin2024);
  const Q = priorPrecision.map((row) => row.slice()),
    h = multiply(priorPrecision, baseline);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let a = 0; a < polls.length; a++)
        for (let b = 0; b < polls.length; b++)
          Q[i][j] += A[a][i] * pollPrecision[a][b] * A[b][j];
  const py = multiply(pollPrecision, y);
  for (let i = 0; i < n; i++)
    for (let a = 0; a < polls.length; a++) h[i] += A[a][i] * py[a];
  const covariance = inverse(Q),
    mean = multiply(covariance, h);
  return {
    mean,
    covariance,
    score(mu) {
      const delta = mu.map((x, i) => x - baseline[i]),
        residual = y.map((v, i) => v - dot(A[i], mu));
      return (
        -0.5 *
        (dot(delta, multiply(priorPrecision, delta)) +
          dot(residual, multiply(pollPrecision, residual)))
      );
    },
  };
}

test("Collapsed prior and joint polling likelihood match explicit covariance matrices", () => {
  for (const sharedPollErrorSD of [0, 0.7, 2.5]) {
    const model = buildHouseModel(toy, { sharedPollErrorSD });
    const truth = reference(model);
    for (const mu of [
      [0, 0, 0],
      [-3, 2, 4],
      [8, 9, 10],
    ])
      assert.ok(
        Math.abs(houseLogPosterior(model, mu) - truth.score(mu)) < 1e-10,
      );
  }
  const model = buildHouseModel(toy);
  const cross =
    houseLogPosterior(model, [1, 1, 0]) -
    houseLogPosterior(model, [1, 0, 0]) -
    houseLogPosterior(model, [0, 1, 0]) +
    houseLogPosterior(model, [0, 0, 0]);
  assert.ok(
    Math.abs(cross) > 0.001,
    "The posterior must not factor into independent districts",
  );
});

test("Every proposal moves all 435 districts with independent Gaussian noise", () => {
  const chain = new HouseSampler(buildHouseModel(house), {
    random: seededRandom(125),
  });
  assert.equal(chain.x.length, 435);
  assert.equal(HOUSE_SETTINGS.districtSD, 5);
  const proposal = chain.propose(),
    changes = proposal.map((v, i) => v - chain.x[i]);
  assert.ok(changes.every((v) => v !== 0));
  assert.equal(new Set(changes).size, 435, "No shared/block increment");
  let n = 0,
    s1 = 0,
    s2 = 0,
    sq1 = 0,
    sq2 = 0,
    cross = 0;
  for (let t = 0; t < 4000; t++) {
    const p = chain.propose(),
      a = p[0] - chain.x[0],
      b = p[1] - chain.x[1];
    n++;
    s1 += a;
    s2 += b;
    sq1 += a * a;
    sq2 += b * b;
    cross += a * b;
  }
  assert.ok(Math.abs(s1 / n) < 0.03 && Math.abs(s2 / n) < 0.03);
  assert.ok(
    Math.abs(sq1 / n - 0.25) < 0.025 && Math.abs(sq2 / n - 0.25) < 0.025,
  );
  assert.ok(Math.abs(cross / n - (s1 * s2) / n ** 2) < 0.02);
});

test("A whole map is accepted or rejected once, using the full posterior ratio; rejections count", () => {
  const model = buildHouseModel(toy),
    chain = new HouseSampler(model, { random: () => 0.5, burnIn: 0, thin: 1 });
  const initial = chain.x.slice();
  const rejected = chain.step(initial.map((x) => x + 10000));
  assert.equal(rejected.accepted, false);
  assert.deepEqual(chain.x, initial);
  chain.step(initial.slice());
  assert.equal(chain.retained, 2);
  assert.equal(Math.max(...chain.histogram), 2);
  const proposal = initial.map((x, i) => x + (i + 1) * 0.1);
  const expected = houseLogPosterior(model, proposal) - chain.logPost;
  chain.random = () => 0;
  const accepted = chain.step(proposal);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.probability, Math.exp(Math.min(0, expected)));
  assert.deepEqual(chain.x, proposal);
  assert.equal(chain.logPost, houseLogPosterior(model, proposal));
});

test("Metropolis moments agree with the analytically solved correlated Gaussian posterior", () => {
  const model = buildHouseModel(toy, {
    districtSD: 2,
    nationalSwingSD: 1.2,
    sharedPollErrorSD: 0.7,
  });
  const expected = reference(model);
  const chain = new HouseSampler(model, {
    random: seededRandom(501),
    burnIn: 5000,
    thin: 10,
  });
  const sum = [0, 0, 0],
    squares = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let t = 0; t < 305000; t++) {
    const before = chain.retained;
    chain.step();
    if (chain.retained === before) continue;
    for (let i = 0; i < 3; i++) {
      sum[i] += chain.x[i];
      for (let j = 0; j < 3; j++) squares[i][j] += chain.x[i] * chain.x[j];
    }
  }
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(sum[i] / chain.retained - expected.mean[i]) < 0.12);
    for (let j = 0; j < 3; j++)
      assert.ok(
        Math.abs(
          squares[i][j] / chain.retained -
            (sum[i] * sum[j]) / chain.retained ** 2 -
            expected.covariance[i][j],
        ) < 0.2,
      );
  }
});
