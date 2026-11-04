// All margins and all standard deviations are in percentage points.
export const DEFAULTS = Object.freeze({
  priorSD: 5,
  sharedError: true,
  regions: true,
  houseEffects: true,
});
export const BURN_IN = 15000;
export const THIN = 50;
export const REGION_NAMES = ["Northeast", "Midwest", "South", "West"];

export function seededRandom(seed = 2026) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gaussian(random = Math.random) {
  return (
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  );
}
export function pollSD(poll) {
  // Design/model error plus sampling noise; older evidence gets less precision.
  return (
    Math.sqrt(10000 / poll.n + 2 ** 2) / Math.sqrt(2 ** (-poll.ageDays / 21))
  );
}

export function buildModel(data, options = {}) {
  const config = { ...DEFAULTS, ...options };
  if (!(config.priorSD > 0))
    throw new Error("Prior standard deviation must be positive.");
  const variables = data.races.map((r) => ({
    name: `${r.name} margin`,
    kind: data.chamber === "house" ? "district" : "state",
  }));
  const addVariable = (name, kind) => variables.push({ name, kind }) - 1;
  const g = addVariable("National environment g", "national");
  const b = config.sharedError
    ? addVariable("Shared polling error b", "bias")
    : null;
  const regions = Object.fromEntries(
    REGION_NAMES.map((name) => [
      name,
      config.regions ? addVariable(`${name} swing`, "region") : null,
    ]),
  );
  const pollsters = [
    ...new Set(
      [...data.statePolls, ...data.nationalPolls].map((p) => p.pollster),
    ),
  ].sort();
  const houses = Object.fromEntries(
    pollsters.map((name) => [
      name,
      config.houseEffects ? addVariable(`${name} house effect`, "house") : null,
    ]),
  );
  const factors = [];
  function factor(terms, mean, sd, group) {
    const usable = terms.filter(([index]) => index !== null);
    factors.push({
      terms: usable,
      mean,
      sd,
      precision: 1 / (sd * sd),
      constant: -Math.log(sd) - Math.log(2 * Math.PI) / 2,
      group,
    });
  }
  factor([[g, 1]], 0, 8, "prior");
  if (b !== null) factor([[b, 1]], 0, 2.5, "prior");
  for (const index of Object.values(regions))
    if (index !== null) factor([[index, 1]], 0, 2, "prior");
  for (const index of Object.values(houses))
    if (index !== null) factor([[index, 1]], 0, 1.5, "prior");
  data.races.forEach((race, i) =>
    factor(
      [
        [i, 1],
        [g, -1],
        [regions[race.region], -1],
      ],
      race.lean,
      config.priorSD,
      "prior",
    ),
  );
  const stateIndex = Object.fromEntries(data.races.map((r, i) => [r.state, i]));
  for (const poll of data.statePolls)
    factor(
      [
        [stateIndex[poll.state], 1],
        [b, 1],
        [houses[poll.pollster], 1],
      ],
      poll.margin,
      pollSD(poll),
      "state",
    );
  for (const poll of data.nationalPolls)
    factor(
      [
        [g, 1],
        [b, 1],
        [houses[poll.pollster], 1],
      ],
      poll.margin,
      pollSD(poll),
      "national",
    );
  const byVariable = variables.map(() => []);
  factors.forEach((f, j) =>
    f.terms.forEach(([i, coefficient]) => byVariable[i].push([j, coefficient])),
  );
  const initial = variables.map(() => 0);
  const nationalWeight = data.nationalPolls.reduce(
    (s, p) => s + 1 / pollSD(p) ** 2,
    1 / 64,
  );
  initial[g] =
    data.nationalPolls.reduce((s, p) => s + p.margin / pollSD(p) ** 2, 0) /
    nationalWeight;
  data.races.forEach((race, i) => {
    let precision = 1 / config.priorSD ** 2,
      weighted = (race.lean + initial[g]) * precision;
    for (const p of data.statePolls.filter((p) => p.state === race.state)) {
      const w = 1 / pollSD(p) ** 2;
      precision += w;
      weighted += w * p.margin;
    }
    initial[i] = weighted / precision;
  });
  return {
    data,
    config,
    variables,
    factors,
    byVariable,
    initial,
    g,
    b,
    regions,
    houses,
  };
}

export function scores(model, x) {
  const result = { prior: 0, state: 0, national: 0 };
  for (const f of model.factors) {
    const residual = f.terms.reduce((s, [i, c]) => s + c * x[i], -f.mean);
    result[f.group] += f.constant - 0.5 * residual ** 2 * f.precision;
  }
  return result;
}
export function logPosterior(model, x) {
  return Object.values(scores(model, x)).reduce((a, b) => a + b, 0);
}

export function seatTally(data, margins, independentCaucus = "unaligned") {
  let d = data.fixedSeats.dem,
    r = data.fixedSeats.rep,
    independent = 0;
  data.races.forEach((race, i) => {
    if (race.fixedWinner === "D") d++;
    else if (race.fixedWinner === "R" || margins[i] <= 0) r++;
    else if (!race.independent || independentCaucus === "dem") d++;
    else if (independentCaucus === "rep") r++;
    else independent++;
  });
  // Senate default: a Republican VP resolves a 50–50 tie. House: 218 for either bloc.
  const thresholds = data.controlThresholds || { dem: 51, rep: 50 };
  const control =
    d >= thresholds.dem ? "dem" : r >= thresholds.rep ? "rep" : "pivotal";
  return { d, r, independent, control };
}

export class Sampler {
  constructor(
    model,
    {
      random = Math.random,
      burnIn = BURN_IN,
      thin = THIN,
      independentCaucus = "unaligned",
      initial = model.initial,
    } = {},
  ) {
    this.model = model;
    this.random = random;
    this.burnIn = burnIn;
    this.thin = thin;
    this.independentCaucus = independentCaucus;
    this.x = initial.slice();
    this.residuals = model.factors.map((f) =>
      f.terms.reduce((s, [i, c]) => s + c * this.x[i], -f.mean),
    );
    this.logPost = logPosterior(model, this.x);
    this.iter = 0;
    this.accepted = 0;
    this.retained = 0;
    this.counts = { dem: 0, rep: 0, pivotal: 0 };
    this.histogram = Array((model.data.totalSeats || 100) + 1).fill(0);
    this.winCounts = model.data.races.map(() => 0);
    this.sums = model.variables.map(() => 0);
    this.trace = [];
    this.last = null;
  }

  propose(scale = 1) {
    const { model, random } = this;
    const choice = random();
    const delta = gaussian(random) * scale;
    if (choice < 0.15) {
      // A symmetric block move along the national-environment/poll-bias ridge.
      const changes = model.data.races.map((_, i) => [i, delta]);
      changes.push([model.g, delta]);
      if (model.b !== null) changes.push([model.b, -delta]);
      return {
        changes,
        label:
          model.b !== null
            ? "National block: all races + g, opposite change in b"
            : "National block: all races + g",
        delta,
      };
    }
    if (choice < 0.25 && model.config.regions) {
      const region = REGION_NAMES[Math.floor(random() * REGION_NAMES.length)];
      const changes = [[model.regions[region], delta]];
      model.data.races.forEach((race, i) => {
        if (race.region === region) changes.push([i, delta]);
      });
      return {
        changes,
        label: `${region} block: regional swing + its races`,
        delta,
      };
    }
    const index = Math.floor(random() * model.variables.length);
    return {
      changes: [[index, delta]],
      label: model.variables[index].name,
      delta,
    };
  }

  step(scale = 1, forcedProposal = null) {
    const proposal = forcedProposal || this.propose(scale);
    const updates = new Map();
    for (const [i, delta] of proposal.changes) {
      for (const [j, coefficient] of this.model.byVariable[i])
        updates.set(j, (updates.get(j) || 0) + coefficient * delta);
    }
    let difference = 0;
    for (const [j, dr] of updates)
      difference -=
        0.5 *
        (2 * this.residuals[j] * dr + dr * dr) *
        this.model.factors[j].precision;
    const probability = Math.exp(Math.min(0, difference));
    const u = this.random();
    const accepted = Math.log(u) < Math.min(0, difference);
    if (accepted) {
      for (const [i, delta] of proposal.changes) this.x[i] += delta;
      for (const [j, dr] of updates) this.residuals[j] += dr;
      this.logPost += difference;
      this.accepted++;
    }
    this.iter++;
    this.last = {
      label: proposal.label,
      delta: proposal.delta,
      difference,
      probability,
      u,
      accepted,
    };
    if (this.iter > this.burnIn && (this.iter - this.burnIn) % this.thin === 0)
      this.record();
    if (this.iter % 200 === 0) {
      const seat = seatTally(this.model.data, this.x, this.independentCaucus);
      this.trace.push({
        iteration: this.iter,
        seats: seat.d,
        g: this.x[this.model.g],
        b: this.model.b === null ? 0 : this.x[this.model.b],
      });
      if (this.trace.length > 220) this.trace.shift();
    }
    return this.last;
  }

  record() {
    // Rejections are retained as repeated chain states, not silently dropped.
    this.retained++;
    const seat = seatTally(this.model.data, this.x, this.independentCaucus);
    this.counts[seat.control]++;
    this.histogram[seat.d]++;
    this.x.forEach((value, i) => {
      this.sums[i] += value;
    });
    this.winCounts.forEach((_, i) => {
      const fixed = this.model.data.races[i].fixedWinner;
      if (fixed === "D" || (!fixed && this.x[i] > 0)) this.winCounts[i]++;
    });
  }

  run(steps, scale = 1) {
    for (let i = 0; i < steps; i++) this.step(scale);
  }
}
