import { test } from "node:test";
import assert from "node:assert/strict";
import { Experiment } from "../model.mjs";
import { pathWeights, pathFactors } from "../path-factors.mjs";
import { laneGeometry, LANE_OFFSETS } from "../lane-geometry.mjs";

test("Path factors use source degrees, include waits, and measure 2D noise in sigma units", () => {
  const grid = {
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    outgoing: [
      [0, 1],
      [1, 0, 2],
      [2, 1],
    ],
  };
  const path = [0, 1, 1, 2, 1, 0, 1];
  const observations = path.map((id) => ({
    x: grid.cells[id].x + 3,
    y: grid.cells[id].y + 4,
  }));
  const weights = pathWeights(grid, path, observations, 2);
  assert.equal(weights.initial, 1 / 3);
  assert.deepEqual(
    weights.transitions.map((step) => step.choices),
    [2, 3, 3, 2, 3, 2],
  );
  assert.equal(weights.transitions[1].from, weights.transitions[1].to);
  assert.ok(
    weights.emissions.every(
      (e) =>
        e.distance === 5 && e.scaledDistance === 2.5 && e.logWeight === -3.125,
    ),
  );
  const drawing = pathFactors({
    grid,
    path,
    observations,
    sigma: 2,
    lane: laneGeometry(
      path.map((id) => grid.cells[id]),
      LANE_OFFSETS.viterbi,
    ),
    view: { x: -1, y: -1, width: 10, height: 10 },
    showGPS: true,
  });
  assert.ok(drawing.labels.includes('data-times="1,6"'));
  assert.ok(drawing.labels.includes('class="path-wait-loop"'));
  assert.equal(
    (drawing.connectors.match(/class="gps-association"/g) || []).length,
    path.length,
  );
  assert.ok(drawing.labels.includes("−1.77²"));
  assert.ok(!drawing.labels.includes("²/2"));
});

test("Multiplying displayed factors recovers the Viterbi score up to the common Gaussian constant", () => {
  for (const sigma of [0.3, 2, 3]) {
    const experiment = new Experiment({ sigma });
    for (const time of [0, 7, 25, 60]) {
      const path = experiment.inference(time);
      const weights = pathWeights(
        experiment.grid,
        path,
        experiment.observations,
        sigma,
      );
      const logWeight =
        Math.log(weights.initial) -
        weights.transitions.reduce(
          (sum, step) => sum + Math.log(step.choices),
          0,
        ) +
        weights.emissions.reduce((sum, e) => sum + e.logWeight, 0);
      const logDensity =
        logWeight - (time + 1) * Math.log(2 * Math.PI * sigma * sigma);
      assert.ok(
        Math.abs(logDensity - Math.max(...experiment.decoder.scores[time])) <
          1e-9,
      );
      assert.equal(
        weights.emissions.length,
        time + 1,
        "Only evidence through the selected time",
      );
    }
  }
});
