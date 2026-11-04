import { test } from "node:test";
import assert from "node:assert/strict";
import { laneGeometry, LANE_OFFSETS } from "../lane-geometry.mjs";
import { Experiment } from "../model.mjs";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("Right and left follow travel direction in SVG, with four distinct lane positions", () => {
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ]) {
    const route = [
      { x: 2, y: 2 },
      { x: 2 + dx, y: 2 + dy },
    ];
    const lanes = [];
    for (const offset of Object.values(LANE_OFFSETS)) {
      const forward = laneGeometry(route, offset);
      const reverse = laneGeometry([...route].reverse(), offset);
      for (const [path, sign] of [
        [forward, 1],
        [reverse, -1],
      ]) {
        const mid = {
          x: (path.line[0].x + path.line[1].x) / 2,
          y: (path.line[0].y + path.line[1].y) / 2,
        };
        const side = -dy * (mid.x - (2 + dx / 2)) + dx * (mid.y - (2 + dy / 2));
        close(side, sign * offset);
        lanes.push(side);
      }
    }
    for (let i = 0; i < lanes.length; i++)
      for (let j = i + 1; j < lanes.length; j++)
        assert.ok(Math.abs(lanes[i] - lanes[j]) >= 0.159);
  }
});

test("Street corners join adjacent offset segments without diagonal shortcuts", () => {
  for (const offset of Object.values(LANE_OFFSETS)) {
    const result = laneGeometry(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
      offset,
    );
    close(result.line[0].y, offset);
    close(result.line[1].x, 1 - offset);
    close(result.line[1].y, offset);
    close(result.line[2].x, 1 - offset);
  }
});

test("U-turns connect opposite lanes in front of the turn; stops stay on the arrival side", () => {
  for (const offset of Object.values(LANE_OFFSETS)) {
    const result = laneGeometry(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ],
      offset,
    );
    assert.deepEqual(result.positions[1], result.positions[2]);
    close(result.positions[1].y, offset);
    close(result.positions[3].y, -offset);
    for (const p of result.line.slice(1, -1)) {
      assert.ok(p.x >= 1 - 1e-12);
      close(Math.hypot(p.x - 1, p.y), Math.abs(offset));
    }
    for (let i = 1; i < result.line.length; i++)
      assert.ok(
        Math.hypot(
          result.line[i].x - result.line[i - 1].x,
          result.line[i].y - result.line[i - 1].y,
        ) <=
          1 + 1e-12,
      );
  }
});

test("Stationary prefixes and waiting endpoints are stable and do not mutate model positions", () => {
  const route = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 2 },
  ];
  const snapshot = structuredClone(route);
  for (const offset of Object.values(LANE_OFFSETS)) {
    assert.equal(laneGeometry([], offset).line.length, 0);
    const waiting = laneGeometry([route[0], route[0], route[0]], offset);
    assert.deepEqual(waiting.positions[0], waiting.positions[2]);
    const first = laneGeometry(route.slice(0, 2), offset);
    const stopped = laneGeometry(route, offset);
    assert.deepEqual(first.line, stopped.line);
    assert.deepEqual(first.positions.at(-1), stopped.positions.at(-1));
    assert.deepEqual(stopped.headings.at(-1), { x: 0, y: 1 });
  }
  assert.deepEqual(route, snapshot);
});

test("Every true and inferred prefix has finite lane geometry and aligned time markers", () => {
  for (const sigma of [0.3, 2, 3]) {
    const experiment = new Experiment({ sigma });
    const observations = structuredClone(experiment.observations);
    for (let t = 0; t <= 60; t++) {
      for (const [states, offset] of [
        [experiment.states.slice(0, t + 1), LANE_OFFSETS.truth],
        [experiment.inference(t), LANE_OFFSETS.viterbi],
      ]) {
        const points = states.map((id) => experiment.grid.cells[id]);
        const lane = laneGeometry(points, offset);
        assert.equal(lane.positions.length, t + 1);
        assert.ok(
          [...lane.line, ...lane.positions, ...lane.headings].every(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
          ),
        );
        assert.deepEqual(lane.positions.at(-1), lane.line.at(-1));
      }
    }
    assert.deepEqual(experiment.observations, observations);
  }
});
