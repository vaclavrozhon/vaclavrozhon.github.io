import { gaussian, pollSD, seatTally } from "./model.mjs";

export const HOUSE_SETTINGS = Object.freeze({
  districtSD: 5,
  nationalSwingSD: 8,
  sharedPollErrorSD: 2.5,
  proposalSD: 0.5,
  burnIn: 20000,
  thin: 100,
});

// The Markov state contains only district margins. Integrating the Gaussian
// national swing and common polling error leaves a correlated density on mu.
export function buildHouseModel(data, options = {}) {
  const settings = { ...HOUSE_SETTINGS, ...options };
  for (const key of ["districtSD", "proposalSD"])
    if (!(settings[key] > 0 && Number.isFinite(settings[key])))
      throw new RangeError(`${key} must be positive`);
  for (const key of ["nationalSwingSD", "sharedPollErrorSD"])
    if (!(settings[key] >= 0 && Number.isFinite(settings[key])))
      throw new RangeError(`${key} must be nonnegative`);
  const index = Object.fromEntries(data.races.map((r, i) => [r.state, i]));
  const baseline = data.races.map((r) => r.margin2024);
  const localPolls = data.statePolls.map((p) => ({
    index: index[p.state],
    margin: p.margin,
    precision: 1 / pollSD(p) ** 2,
  }));
  const nationalPolls = data.nationalPolls.map((p) => ({
    margin: p.margin,
    precision: 1 / pollSD(p) ** 2,
  }));
  const totalPrecision = [...localPolls, ...nationalPolls].reduce(
    (s, p) => s + p.precision,
    0,
  );
  return {
    data,
    settings,
    baseline,
    localPolls,
    nationalPolls,
    totalPrecision,
    // Start neutral so the map shows the chain warming up toward the posterior.
    initial: baseline.map(() => 0),
  };
}

export function nationalMargin(mu) {
  return mu.reduce((sum, x) => sum + x, 0) / mu.length;
}

export function houseScores(model, mu) {
  const { settings, baseline, localPolls, nationalPolls } = model;
  const variance = settings.districtSD ** 2;
  let sum = 0,
    squares = 0;
  for (let i = 0; i < mu.length; i++) {
    const delta = mu[i] - baseline[i];
    sum += delta;
    squares += delta * delta;
  }
  // Inverse of 5² I + 8² 11ᵀ (Sherman–Morrison).
  const priorCorrection = settings.nationalSwingSD
    ? (sum * sum) / (mu.length + variance / settings.nationalSwingSD ** 2)
    : 0;
  const prior = (-0.5 * (squares - priorCorrection)) / variance;
  let local = 0,
    national = 0,
    weightedResidual = 0;
  for (const p of localPolls) {
    const residual = p.margin - mu[p.index];
    local -= 0.5 * residual * residual * p.precision;
    weightedResidual += residual * p.precision;
  }
  const mean = nationalMargin(mu);
  for (const p of nationalPolls) {
    const residual = p.margin - mean;
    national -= 0.5 * residual * residual * p.precision;
    weightedResidual += residual * p.precision;
  }
  // Integrate one b shared by ALL local and national polls. This cross-term
  // prevents many surveys from making their common error disappear.
  const shared = settings.sharedPollErrorSD
    ? (0.5 * weightedResidual ** 2) /
      (1 / settings.sharedPollErrorSD ** 2 + model.totalPrecision)
    : 0;
  return { prior, local, national, shared };
}

export function houseLogPosterior(model, mu) {
  const s = houseScores(model, mu);
  // Normalizing constants do not depend on mu and cancel in the ratio.
  return s.prior + s.local + s.national + s.shared;
}

export class HouseSampler {
  constructor(
    model,
    {
      random = Math.random,
      initial = model.initial,
      burnIn = model.settings.burnIn,
      thin = model.settings.thin,
    } = {},
  ) {
    this.model = model;
    this.random = random;
    this.x = initial.slice();
    this.burnIn = burnIn;
    this.thin = thin;
    this.logPost = houseLogPosterior(model, this.x);
    this.iter = 0;
    this.accepted = 0;
    this.retained = 0;
    this.histogram = Array(
      (model.data.totalSeats || model.data.races.length) + 1,
    ).fill(0);
    this.counts = { dem: 0, rep: 0, pivotal: 0 };
    this.last = null;
  }

  propose() {
    // ONE simultaneous proposal: a fresh independent Gaussian for EVERY
    // district. No coordinate selection, common increment, or block moves.
    return this.x.map(
      (mu) => mu + this.model.settings.proposalSD * gaussian(this.random),
    );
  }

  step(proposal = this.propose()) {
    const proposedLog = houseLogPosterior(this.model, proposal);
    const difference = proposedLog - this.logPost;
    const probability = Math.exp(Math.min(0, difference));
    const u = this.random();
    const accepted = Math.log(u) < Math.min(0, difference);
    if (accepted) {
      this.x = proposal;
      this.logPost = proposedLog;
      this.accepted++;
    }
    this.iter++;
    this.last = { accepted, difference, probability, u };
    if (
      this.iter > this.burnIn &&
      (this.iter - this.burnIn) % this.thin === 0
    ) {
      this.retained++;
      const seats = seatTally(this.model.data, this.x);
      this.histogram[seats.d]++;
      this.counts[seats.control]++;
    }
    return this.last;
  }

  run(count) {
    for (let i = 0; i < count; i++) this.step();
  }
}
