import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildModel,
  Sampler,
  scores,
  logPosterior,
  seatTally,
  pollSD,
  seededRandom,
} from "../src/model.mjs";
const data = JSON.parse(
  fs.readFileSync(new URL("../src/data/snapshot2026.json", import.meta.url)),
);

test("snapshot accounts for 100 seats, 35 elections and correctly labeled independents", () => {
  assert.equal(data.races.length, 35);
  assert.equal(new Set(data.races.map((r) => r.state)).size, 35);
  assert.equal(
    data.fixedSeats.dem + data.fixedSeats.rep + data.races.length,
    100,
  );
  assert.equal(data.races.filter((r) => r.heldBy === "D").length, 13);
  assert.deepEqual(
    data.races.filter((r) => r.special).map((r) => r.state),
    ["FL", "OH"],
  );
  assert.deepEqual(
    data.races.filter((r) => r.independent).map((r) => r.state),
    ["ID", "MT", "NE", "SD"],
  );
  assert.equal(data.fixedSeats.dem, 34);
  assert.equal(data.fixedSeats.rep, 31);
});

test("poll facts are dated, sourced, unique per firm/race, and match published margins", () => {
  assert.equal(data.statePolls.length, 200);
  assert.equal(data.nationalPolls.length, 31);
  const keys = new Set();
  for (const p of [...data.statePolls, ...data.nationalPolls]) {
    const key = `${p.state || "US"}:${p.pollster}`;
    assert.ok(!keys.has(key), key);
    keys.add(key);
    assert.ok(p.end >= data.windowStart && p.end <= data.asOf);
    assert.ok(p.n > 0 && p.ageDays >= 0 && /^https?:\/\//.test(p.url));
    const margin = p.state ? p.challenger - p.republican : p.dem - p.rep;
    assert.ok(Math.abs(p.margin - margin) < 1e-3);
    assert.ok(Number.isFinite(pollSD(p)));
    if (p.state) assert.ok(data.races.some((r) => r.state === p.state));
  }
  for (const race of data.races)
    assert.ok(
      Math.abs(race.lean - (race.margin2024 - data.baselineNationalMargin)) <
        0.001,
    );
});

test("seat tally respects the VP, independent control scenarios, and all fixed seats", () => {
  const x = data.races.map(() => -1);
  const dIndices = data.races
    .map((r, i) => (!r.independent ? i : -1))
    .filter((i) => i >= 0);
  dIndices.slice(0, 16).forEach((i) => (x[i] = 1));
  assert.deepEqual(seatTally(data, x), {
    d: 50,
    r: 50,
    independent: 0,
    control: "rep",
  });
  const ne = data.races.findIndex((r) => r.state === "NE");
  x[ne] = 1;
  assert.deepEqual(seatTally(data, x), {
    d: 50,
    r: 49,
    independent: 1,
    control: "pivotal",
  });
  assert.deepEqual(seatTally(data, x, "dem"), {
    d: 51,
    r: 49,
    independent: 0,
    control: "dem",
  });
  assert.deepEqual(seatTally(data, x, "rep"), {
    d: 50,
    r: 50,
    independent: 0,
    control: "rep",
  });
  assert.equal(
    seatTally(
      data,
      data.races.map(() => -1),
    ).d,
    34,
  );
  assert.equal(
    seatTally(
      data,
      data.races.map(() => 1),
    ).r,
    31,
  );
});

test("Gaussian prior has sigma 5, national polls measure g, and switched-off effects disappear", () => {
  const model = buildModel(data, {
    sharedError: false,
    regions: false,
    houseEffects: false,
  });
  assert.equal(model.variables.length, 36);
  assert.equal(model.b, null);
  const statePrior = model.factors.find(
    (f) => f.group === "prior" && f.terms.some(([i]) => i === 0),
  );
  assert.equal(statePrior.sd, 5);
  for (const f of model.factors.filter((f) => f.group === "national"))
    assert.deepEqual(f.terms, [[model.g, 1]]);
  assert.equal(buildModel(data).variables.length, 134);
  assert.throws(() => buildModel(data, { priorSD: 0 }));
});

test("incremental Metropolis ratios match full posterior scoring for all move types", () => {
  const model = buildModel(data);
  const chain = new Sampler(model, {
    random: seededRandom(5),
    burnIn: 0,
    thin: 1,
  });
  for (let t = 0; t < 1200; t++) {
    const proposal = chain.propose(t % 3 ? 1 : 4);
    const before = chain.x.slice();
    const proposed = before.slice();
    for (const [i, delta] of proposal.changes) proposed[i] += delta;
    const difference =
      logPosterior(model, proposed) - logPosterior(model, before);
    const result = chain.step(1, proposal);
    assert.ok(Math.abs(result.difference - difference) < 1e-8);
    assert.ok(Math.abs(chain.logPost - logPosterior(model, chain.x)) < 1e-7);
    assert.deepEqual(chain.x, result.accepted ? proposed : before);
  }
  assert.equal(chain.retained, 1200);
  assert.equal(
    Object.values(chain.counts).reduce((a, b) => a + b),
    chain.retained,
  );
  assert.equal(
    chain.histogram.reduce((a, b) => a + b),
    chain.retained,
  );
});

test("warm-up, thinning and rejected states are counted correctly", () => {
  const model = buildModel(data);
  const chain = new Sampler(model, { random: () => 0.5, burnIn: 3, thin: 2 });
  const before = chain.x.slice();
  const proposal = {
    changes: [[0, 100000]],
    label: "Impossible test jump",
    delta: 100000,
  };
  for (let i = 0; i < 9; i++) chain.step(1, proposal);
  assert.equal(chain.accepted, 0);
  assert.equal(chain.retained, 3);
  assert.deepEqual(chain.x, before);
  chain.sums.forEach((sum, i) =>
    assert.ok(Math.abs(sum - 3 * before[i]) < 1e-8),
  );
});

test("a small correlated Gaussian target matches its analytic posterior moments", () => {
  // x = (state margin, national g). Prior: g~N(0,64), x|g~N(1+g,25).
  // State observation 4, national observation 2, each with variance 5.
  const fixture = {
    fixedSeats: { dem: 34, rep: 31 },
    races: [{ state: "X", name: "Test", lean: 1, region: "West" }],
    statePolls: [
      { state: "X", pollster: "A", margin: 4, n: 10000, ageDays: 0 },
    ],
    nationalPolls: [{ pollster: "B", margin: 2, n: 10000, ageDays: 0 }],
  };
  const model = buildModel(fixture, {
    sharedError: false,
    regions: false,
    houseEffects: false,
  });
  const a = 1 / 25 + 1 / 5,
    b = -1 / 25,
    c = 1 / 64 + 1 / 25 + 1 / 5,
    determinant = a * c - b * b;
  const varianceX = c / determinant,
    varianceG = a / determinant,
    covariance = -b / determinant;
  const v1 = 1 / 25 + 4 / 5,
    v2 = -1 / 25 + 2 / 5;
  const meanX = varianceX * v1 + covariance * v2,
    meanG = covariance * v1 + varianceG * v2;
  const chain = new Sampler(model, {
    random: seededRandom(71),
    burnIn: 3000,
    thin: 1,
  });
  let count = 0,
    sx = 0,
    sg = 0,
    xx = 0,
    gg = 0,
    xg = 0;
  for (let t = 0; t < 250000; t++) {
    chain.step(2.5);
    if (t < 3000) continue;
    const [x, g] = chain.x;
    count++;
    sx += x;
    sg += g;
    xx += x * x;
    gg += g * g;
    xg += x * g;
  }
  assert.ok(Math.abs(sx / count - meanX) < 0.08);
  assert.ok(Math.abs(sg / count - meanG) < 0.08);
  assert.ok(Math.abs(xx / count - (sx / count) ** 2 - varianceX) < 0.16);
  assert.ok(Math.abs(gg / count - (sg / count) ** 2 - varianceG) < 0.16);
  assert.ok(Math.abs(xg / count - (sx * sg) / count ** 2 - covariance) < 0.16);
  assert.ok(
    Number.isFinite(
      Object.values(scores(model, chain.x)).reduce((a, b) => a + b),
    ),
  );
});

const house = JSON.parse(
  fs.readFileSync(new URL("../src/data/house2026.json", import.meta.url)),
);
const houseMap = JSON.parse(
  fs.readFileSync(new URL("../src/data/house-map.json", import.meta.url)),
);
const houseGeometry = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/house-districts-2026.geojson", import.meta.url),
  ),
);
test("all 435 House districts join one-to-one to geometry and dated baselines", () => {
  const ids = house.races.map((r) => r.state).sort();
  assert.equal(ids.length, 435);
  assert.equal(new Set(ids).size, 435);
  assert.deepEqual(houseMap.districts.map((r) => r.id).sort(), ids);
  assert.deepEqual(houseGeometry.features.map((f) => f.id).sort(), ids);
  assert.equal(new Set(house.races.map((r) => r.stateCode)).size, 50);
  assert.equal(
    houseGeometry.features.filter(
      (f) => f.properties.vintage === "119th restored",
    ).length,
    8,
  );
  assert.ok(
    house.races
      .filter((r) => r.stateCode === "MO")
      .every((r) => r.baselineSource.includes("2024 lines")),
  );
  for (const d of houseMap.districts) {
    assert.ok(d.d.startsWith("M"));
    assert.ok(d.bounds.flat().every(Number.isFinite));
    assert.ok(d.bounds[1][0] - d.bounds[0][0] < 1000);
  }
  for (const r of house.races)
    assert.ok(
      Math.abs(r.lean - r.margin2024 + house.baselineNationalMargin) < 0.001,
    );
});
test("House evidence has real district IDs and excludes same-party races from D-R likelihood", () => {
  const keys = new Set();
  for (const p of house.statePolls) {
    assert.ok(house.races.some((r) => r.state === p.state));
    assert.ok(p.end >= house.windowStart && p.end <= house.asOf);
    assert.ok(p.n > 0 && p.url.startsWith("http"));
    assert.ok(Math.abs(p.margin - p.challenger + p.republican) < 0.001);
    assert.ok(!keys.has(`${p.state}:${p.pollster}`));
    keys.add(`${p.state}:${p.pollster}`);
    assert.ok(!house.races.find((r) => r.state === p.state).fixedWinner);
  }
  assert.equal(house.statePolls.length, 60);
  assert.equal(new Set(house.statePolls.map((p) => p.state)).size, 35);
  assert.equal(house.nationalPolls.length, 31);
});
test("House control needs 218, never the Senate threshold or a VP tie-break", () => {
  const margins = house.races.map(() => -1);
  const free = house.races
    .map((r, i) => (!r.fixedWinner && !r.independent ? i : -1))
    .filter((i) => i >= 0);
  free.slice(0, 215).forEach((i) => (margins[i] = 1));
  assert.deepEqual(seatTally(house, margins), {
    d: 217,
    r: 218,
    independent: 0,
    control: "rep",
  });
  const alaska = house.races.findIndex((r) => r.state === "AK-AL");
  margins[alaska] = 1;
  assert.deepEqual(seatTally(house, margins), {
    d: 217,
    r: 217,
    independent: 1,
    control: "pivotal",
  });
  assert.deepEqual(seatTally(house, margins, "dem"), {
    d: 218,
    r: 217,
    independent: 0,
    control: "dem",
  });
  assert.deepEqual(seatTally(house, margins, "rep"), {
    d: 217,
    r: 218,
    independent: 0,
    control: "rep",
  });
  margins[free[215]] = 1;
  assert.equal(seatTally(house, margins).control, "dem");
});
test("House sampler records the entire 0–435 seat range with finite posterior scores", async () => {
  const { buildHouseModel, HouseSampler, houseLogPosterior } = await import(
    "../src/house-model.mjs"
  );
  const model = buildHouseModel(house),
    chain = new HouseSampler(model, {
      random: seededRandom(77),
      burnIn: 100,
      thin: 10,
    });
  assert.equal(chain.x.length, 435);
  assert.equal(chain.histogram.length, 436);
  chain.run(1000);
  assert.equal(chain.retained, 90);
  assert.equal(
    chain.histogram.reduce((a, b) => a + b),
    90,
  );
  assert.equal(
    Object.values(chain.counts).reduce((a, b) => a + b),
    90,
  );
  assert.ok(Number.isFinite(chain.logPost));
  assert.ok(Math.abs(chain.logPost - houseLogPosterior(model, chain.x)) < 1e-7);
  const seats = seatTally(house, chain.x);
  assert.equal(seats.d + seats.r + seats.independent, 435);
});
