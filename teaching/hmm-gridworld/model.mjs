// One position-only HMM on the town street graph. The fixed trip plan is
// used only to create observations; inference receives no route information.
import { TOWN } from "./town.mjs";
import { buildRoute } from "./routes.mjs";

export function randomGenerator(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random) {
  return (
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  );
}

export function makeTown() {
  const points = new Map(),
    edges = new Map();
  const key = (x, y) => `${x},${y}`;
  const addPoint = (x, y) => {
    const k = key(x, y);
    if (!points.has(k)) {
      points.set(k, { x, y });
      edges.set(k, new Set());
    }
    return k;
  };
  for (const street of TOWN.streets)
    for (let segment = 1; segment < street.length; segment++) {
      const [x0, y0] = street[segment - 1],
        [x1, y1] = street[segment];
      if (x0 !== x1 && y0 !== y1) throw new Error("Streets must be orthogonal");
      const length = Math.abs(x1 - x0) + Math.abs(y1 - y0);
      const dx = Math.sign(x1 - x0),
        dy = Math.sign(y1 - y0);
      let previous = addPoint(x0, y0);
      for (let step = 1; step <= length; step++) {
        const next = addPoint(x0 + step * dx, y0 + step * dy);
        edges.get(previous).add(next);
        edges.get(next).add(previous);
        previous = next;
      }
    }
  const cells = [...points.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  const ids = new Map(cells.map((cell, id) => [key(cell.x, cell.y), id]));
  const outgoing = cells.map((cell, id) => [
    id,
    ...[...edges.get(key(cell.x, cell.y))]
      .map((k) => ids.get(k))
      .sort((a, b) => a - b),
  ]);
  const incoming = cells.map(() => []);
  outgoing.forEach((targets, from) =>
    targets.forEach((to) =>
      incoming[to].push({ from, logProbability: -Math.log(targets.length) }),
    ),
  );
  const destinations = TOWN.landmarks.map((landmark) => ({
    ...landmark,
    position: ids.get(key(landmark.x, landmark.y)),
  }));
  if (destinations.some((place) => place.position === undefined))
    throw new Error("Destination is not on a road");
  return {
    kind: "town",
    size: Math.max(TOWN.width, TOWN.height),
    width: TOWN.width,
    height: TOWN.height,
    cells,
    outgoing,
    incoming,
    destinations,
  };
}

export function logEmission(cell, observation, sigma) {
  return (
    -Math.log(2 * Math.PI * sigma * sigma) -
    ((cell.x - observation.x) ** 2 + (cell.y - observation.y) ** 2) /
      (2 * sigma * sigma)
  );
}

export class Viterbi {
  constructor(grid, sigma) {
    if (!Number.isFinite(sigma) || sigma <= 0)
      throw new RangeError("Noise must be positive");
    this.grid = grid;
    this.sigma = sigma;
    this.scores = [];
    this.parents = [];
  }

  append(observation) {
    if (!Number.isFinite(observation.x) || !Number.isFinite(observation.y))
      throw new RangeError("Invalid observation");
    const { cells, incoming } = this.grid;
    const previous = this.scores.at(-1);
    const scores = new Float64Array(cells.length);
    const parents = new Int32Array(cells.length).fill(-1);
    for (let to = 0; to < cells.length; to++) {
      let best = -Math.log(cells.length); // Uniform initial distribution.
      if (previous) {
        best = -Infinity;
        for (const { from, logProbability } of incoming[to]) {
          const candidate = previous[from] + logProbability;
          if (candidate > best) {
            best = candidate;
            parents[to] = from;
          }
        }
      }
      scores[to] = best + logEmission(cells[to], observation, this.sigma);
    }
    this.scores.push(scores);
    this.parents.push(parents);
    return this.path();
  }

  path(time = this.scores.length - 1) {
    if (time < 0) return [];
    if (!Number.isInteger(time) || time >= this.scores.length)
      throw new RangeError("Invalid time");
    const scores = this.scores[time];
    let state = 0;
    for (let i = 1; i < scores.length; i++)
      if (scores[i] > scores[state]) state = i;
    const path = new Array(time + 1);
    for (let t = time; t >= 0; t--) {
      path[t] = state;
      state = this.parents[t][state];
    }
    return path;
  }
}

export class Experiment {
  constructor({ sigma = 2, seed = 14 } = {}) {
    this.grid = makeTown();
    this.frames = buildRoute(this.grid);
    this.states = this.frames.map((frame) => frame.position);
    this.duration = this.states.length - 1;
    const random = randomGenerator(seed ^ 0xa3c59ac3);
    this.noise = this.states.map(() => ({
      x: normal(random),
      y: normal(random),
    }));
    this.setSigma(sigma);
  }

  setSigma(sigma) {
    const decoder = new Viterbi(this.grid, sigma);
    const observations = this.states.map((state, t) => {
      const cell = this.grid.cells[state];
      return {
        x: cell.x + sigma * this.noise[t].x,
        y: cell.y + sigma * this.noise[t].y,
      };
    });
    observations.forEach((observation) => decoder.append(observation));
    this.sigma = sigma;
    this.observations = observations;
    this.decoder = decoder;
  }

  inference(time = this.duration) {
    // The scores/backpointers for this prefix never use later observations.
    return this.decoder.path(time);
  }
}

export function revisions(previous, current) {
  return previous.flatMap((state, time) =>
    state !== current[time] ? [time] : [],
  );
}
