import React, { useEffect, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import usStates from "us-atlas/states-10m.json";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import data from "./data/snapshot2026.json";
import {
  buildModel,
  Sampler,
  scores,
  seatTally,
  DEFAULTS,
  BURN_IN,
  THIN,
} from "./model.mjs";

const FIPS = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  10: "DE",
  11: "DC",
  12: "FL",
  13: "GA",
  15: "HI",
  16: "ID",
  17: "IL",
  18: "IN",
  19: "IA",
  20: "KS",
  21: "KY",
  22: "LA",
  23: "ME",
  24: "MD",
  25: "MA",
  26: "MI",
  27: "MN",
  28: "MS",
  29: "MO",
  30: "MT",
  31: "NE",
  32: "NV",
  33: "NH",
  34: "NJ",
  35: "NM",
  36: "NY",
  37: "NC",
  38: "ND",
  39: "OH",
  40: "OK",
  41: "OR",
  42: "PA",
  44: "RI",
  45: "SC",
  46: "SD",
  47: "TN",
  48: "TX",
  49: "UT",
  50: "VT",
  51: "VA",
  53: "WA",
  54: "WV",
  55: "WI",
  56: "WY",
};
const fmt = (n, digits = 1) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const signed = (n) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const percent = (n, total) => (total ? `${fmt((100 * n) / total)}%` : "—");
const stateIndex = Object.fromEntries(data.races.map((r, i) => [r.state, i]));
const snapshotDate = new Date(`${data.asOf}T12:00:00Z`).toLocaleDateString(
  "en-US",
  { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
);
const blank = "#e5e8ef";
function color(margin, independent = false) {
  const positive = independent ? [188, 137, 34] : [65, 101, 200];
  const target = margin >= 0 ? positive : [204, 83, 91];
  const strength = Math.min(1, Math.abs(margin) / 12);
  return `rgb(${target.map((v, i) => Math.round([240, 240, 246][i] * (1 - strength) + v * strength)).join(",")})`;
}
const external = { target: "_blank", rel: "noreferrer" };

function PollTable({ national = false }) {
  const polls = national ? data.nationalPolls : data.statePolls;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {!national && <th>Race</th>}
            <th>Pollster / source</th>
            <th>Field dates</th>
            <th>Sample</th>
            <th>{national ? "D − R" : "D / I − R"}</th>
          </tr>
        </thead>
        <tbody>
          {polls.map((p, i) => (
            <tr key={i}>
              {!national && (
                <td>
                  <b>{p.state}</b>
                  {data.races[stateIndex[p.state]].independent && (
                    <span className="ind-badge">I</span>
                  )}
                </td>
              )}
              <td>
                <a href={p.url} {...external}>
                  {p.pollster} ↗
                </a>
                {p.partisan && <small>Partisan sponsor: {p.partisan}</small>}
              </td>
              <td className="date-cell">
                {p.start} → {p.end}
              </td>
              <td>
                {fmt(p.n, 0)} <small className="inline">{p.population}</small>
              </td>
              <td className={p.margin >= 0 ? "dem-text" : "rep-text"}>
                {signed(p.margin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState(DEFAULTS);
  const [caucus, setCaucus] = useState("unaligned");
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [scale, setScale] = useState(1);
  const [selected, setSelected] = useState("TX");
  const [mapMode, setMapMode] = useState("draw");
  const [showLatents, setShowLatents] = useState(false);
  const sampler = useRef(null);
  if (!sampler.current) sampler.current = new Sampler(buildModel(data));
  const s = sampler.current;
  const model = s.model;
  const count = s.retained;
  const seats = seatTally(data, s.x, caucus);
  const selectedIndex = stateIndex[selected];
  const race = data.races[selectedIndex];
  const racePolls = data.statePolls.filter((p) => p.state === selected);
  const components = scores(model, s.x);
  const histogram = Array.from({ length: 36 }, (_, i) => ({
    seats: i + 34,
    count: s.histogram[i + 34],
  }));
  const last = s.last;
  void tick;

  const reset = (nextConfig = config, nextCaucus = caucus) => {
    setRunning(false);
    sampler.current = new Sampler(buildModel(data, nextConfig), {
      independentCaucus: nextCaucus,
    });
    setTick((t) => t + 1);
  };
  const changeConfig = (next) => {
    setConfig(next);
    reset(next);
  };
  const step = (steps) => {
    sampler.current.run(steps, scale);
    setTick((t) => t + 1);
  };
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      sampler.current.run(2500, scale);
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(timer);
  }, [running, scale]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  return (
    <div className="app-shell">
      <header className="page-header">
        <div className="logo" aria-hidden="true">
          M<span>↗</span>
        </div>
        <div>
          <p className="eyebrow">
            PST II <span>/</span> METROPOLIS LAB
          </p>
          <h1>Who will control the Senate?</h1>
        </div>
        <a
          className="back-link"
          href="https://vaclavrozhon.github.io/teaching/2026/probability-2"
        >
          Back to course ↗
        </a>
      </header>
      <div className="intro-row">
        <p>
          35 elections. One national mood. A tangled posterior.
          <br />
          <strong>
            Sample possible 2026 Senate maps, one Metropolis move at a time.
          </strong>
        </p>
        <a className="chamber-preview-link" href="#house">
          House preview · 435 districts ↗
        </a>
        <span className="snapshot-badge">
          POLL SNAPSHOT · {snapshotDate.toUpperCase()}
        </span>
      </div>

      <section
        className="outcomes"
        aria-label="Estimated Senate control probabilities"
      >
        <div className="outcome dem">
          <span>Democratic control</span>
          <strong data-testid="dem-probability">
            {percent(s.counts.dem, count)}
          </strong>
          <small>51+ seats in the Democratic caucus</small>
        </div>
        <div className="outcome rep">
          <span>Republican control</span>
          <strong data-testid="rep-probability">
            {percent(s.counts.rep, count)}
          </strong>
          <small>50+ Republican seats; VP breaks ties</small>
        </div>
        <div className="outcome ind">
          <span>Independents pivotal</span>
          <strong data-testid="pivotal-probability">
            {percent(s.counts.pivotal, count)}
          </strong>
          <small>Neither party reaches its control threshold</small>
        </div>
        <div className="sampling-status">
          <p className="eyebrow">MONTE CARLO ESTIMATE</p>
          <b data-testid="retained">{fmt(count, 0)} retained draws</b>
          <p>
            {count
              ? "Draws are correlated. Run longer and restart to check stability."
              : "Run the chain to fill these estimates. Warm-up draws are excluded."}
          </p>
          <small>Teaching model · not a calibrated forecast</small>
        </div>
      </section>

      <section className="controls-card" aria-label="Metropolis controls">
        <div className="buttons">
          <button
            className="primary"
            id="run"
            onClick={() => setRunning((v) => !v)}
            aria-pressed={running}
          >
            {running ? "Ⅱ Pause" : "▶ Run Metropolis"}
          </button>
          <button id="step" disabled={running} onClick={() => step(1)}>
            One proposal
          </button>
          <button id="batch" disabled={running} onClick={() => step(20000)}>
            +20,000 proposals
          </button>
          <button className="quiet" id="reset" onClick={() => reset()}>
            ↺ Reset chain
          </button>
          <label className="proposal-control">
            Proposal step <output>{fmt(scale)} pp</output>
            <input
              aria-label="Proposal standard deviation"
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="chain-status">
          <span>
            Proposals <b data-testid="iterations">{fmt(s.iter, 0)}</b>
          </span>
          <span>
            Accepted <b>{s.iter ? percent(s.accepted, s.iter) : "—"}</b>
          </span>
          <span>
            Warm-up{" "}
            <b>
              {fmt(Math.min(s.iter, BURN_IN), 0)} / {fmt(BURN_IN, 0)}
            </b>
          </span>
          <span>
            Retain every <b>{THIN}th move</b>
          </span>
          <span className="dimensions">
            <b>{model.variables.length}</b> latent variables
          </span>
        </div>
        <div
          className={`proposal-result ${last ? (last.accepted ? "accepted" : "rejected") : ""}`}
          aria-live="polite"
        >
          {last ? (
            <>
              <span className="decision">
                {last.accepted ? "ACCEPTED" : "REJECTED"}
              </span>
              <span>
                {last.label}: <b>{signed(last.delta)} pp</b>
              </span>
              <span>
                Δ log p = <b>{fmt(last.difference, 3)}</b>
              </span>
              <span>
                α = <b>{fmt(last.probability, 3)}</b>, u = {fmt(last.u, 3)}
              </span>
            </>
          ) : (
            <>
              <span className="decision">READY</span>
              <span>
                Propose a change, compare posterior density, accept or stay.
                Rejected moves count too.
              </span>
            </>
          )}
        </div>
      </section>

      <div className="main-grid">
        <section className="card map-card">
          <div className="card-title">
            <div>
              <p className="eyebrow">A POSSIBLE ELECTION</p>
              <h2>
                {mapMode === "draw"
                  ? "The current sampled map"
                  : "Estimated challenger win probability"}
              </h2>
            </div>
            <div className="segmented">
              <button
                aria-pressed={mapMode === "draw"}
                onClick={() => setMapMode("draw")}
              >
                Current draw
              </button>
              <button
                aria-pressed={mapMode === "probability"}
                onClick={() => setMapMode("probability")}
              >
                Win probability
              </button>
            </div>
          </div>
          <div className="map-legend">
            <span>
              <i className="swatch blue" />
              Democrat
            </span>
            <span>
              <i className="swatch red" />
              Republican
            </span>
            <span>
              <i className="swatch gold" />
              Independent
            </span>
            <span>
              <i className="swatch gray" />
              No election
              {!count && mapMode === "probability" ? " / no samples yet" : ""}
            </span>
          </div>
          <div className="us-map">
            <ComposableMap
              projection="geoAlbersUsa"
              width={820}
              height={490}
              role="img"
              aria-label="2026 Senate races. Gray states have no Senate election."
            >
              <Geographies geography={usStates}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const code = FIPS[String(geo.id).padStart(2, "0")];
                    const i = stateIndex[code];
                    const r = data.races[i];
                    const m = r ? s.x[i] : 0;
                    const display =
                      mapMode === "draw"
                        ? m
                        : count
                          ? (s.winCounts[i] / count - 0.5) * 24
                          : 0;
                    const fill =
                      !r || (mapMode === "probability" && !count)
                        ? blank
                        : color(display, r.independent);
                    const label = r
                      ? mapMode === "draw"
                        ? `${r.name}: ${r.independent ? "Independent" : "Democratic"} challenger ${signed(m)} pp versus Republican`
                        : `${r.name}: ${r.independent ? "Independent" : "Democratic"} challenger win estimate ${percent(s.winCounts[i], count)}`
                      : `${geo.properties.name}: no Senate election in 2026`;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke={code === selected ? "#6554d9" : "#fff"}
                        strokeWidth={code === selected ? 2 : 0.7}
                        onClick={r ? () => setSelected(code) : undefined}
                        onKeyDown={
                          r
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelected(code);
                                }
                              }
                            : undefined
                        }
                        tabIndex={r ? 0 : undefined}
                        role={r ? "button" : undefined}
                        aria-label={label}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            outline: "none",
                            fill: r ? "#bcb0ee" : blank,
                            cursor: r ? "pointer" : "default",
                          },
                          pressed: { outline: "none" },
                        }}
                      >
                        <title>{label}</title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
          <div className="seat-labels">
            <b className="dem-text">D caucus {seats.d}</b>
            <span>
              {seats.independent
                ? `Independent ${seats.independent}`
                : "100 seats"}
            </span>
            <b className="rep-text">R {seats.r}</b>
          </div>
          <div
            className="seat-strip"
            role="img"
            aria-label={`Current draw: ${seats.d} Democratic caucus, ${seats.r} Republican, ${seats.independent} unaligned independent seats`}
          >
            {Array.from({ length: 100 }, (_, i) => (
              <i
                key={i}
                className={
                  i < seats.d
                    ? "blue"
                    : i < seats.d + seats.independent
                      ? "gold"
                      : "red"
                }
              />
            ))}
          </div>
          <p className="map-note">
            65 seats are not on the ballot:{" "}
            <b>34 Democratic-caucus + 31 Republican</b>. Each of the 35 races
            adds one seat. The two existing independent senators are included in
            the Democratic caucus.
          </p>
          <div className="race-inspector">
            <div className="race-heading">
              <label htmlFor="selected-race">Inspect a race</label>
              <select
                id="selected-race"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {data.races.map((r) => (
                  <option key={r.state} value={r.state}>
                    {r.name}
                    {r.special ? " (special)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <p>
              <b>
                {race.challenger} ({race.independent ? "I" : "D"})
              </b>{" "}
              vs. <b>{race.republican} (R)</b>
              {race.special && (
                <span className="ind-badge">Special election</span>
              )}
            </p>
            <div className="race-stats">
              <div>
                <small>Current margin</small>
                <b>{signed(s.x[selectedIndex])} pp</b>
              </div>
              <div>
                <small>Challenger win estimate</small>
                <b>{percent(s.winCounts[selectedIndex], count)}</b>
              </div>
              <div>
                <small>2024 relative lean</small>
                <b>{signed(race.lean)} pp</b>
              </div>
              <div>
                <small>State polls in snapshot</small>
                <b>{racePolls.length || "Prior only"}</b>
              </div>
            </div>
            {!racePolls.length && (
              <p className="small-copy">
                No qualifying poll in this selected source and date window. This
                race borrows information from the national environment, regional
                swing, and its 2024 lean.
              </p>
            )}
            {race.independent && (
              <p className="small-copy">
                This challenger is an independent, not a Democrat. The caucus
                scenario below determines how a win is counted.
              </p>
            )}
          </div>
        </section>

        <aside className="settings">
          <section className="card">
            <p className="eyebrow">GAUSSIAN PRIOR</p>
            <div className="setting-heading">
              <h2>How much can a state move?</h2>
              <output>
                {fmt(config.priorSD)}
                <small>pp standard deviation</small>
              </output>
            </div>
            <input
              id="prior-sd"
              aria-label="State prior standard deviation"
              type="range"
              min="2"
              max="10"
              step="0.5"
              value={config.priorSD}
              onChange={(e) =>
                changeConfig({ ...config, priorSD: Number(e.target.value) })
              }
            />
            <div className="range-labels">
              <span>Stronger pooling</span>
              <span>More freedom</span>
            </div>
            <p className="small-copy">
              State margins vary around their 2024 relative lean + national
              environment + regional swing. Default σ = 5 pp; variance = 25.
            </p>
          </section>
          <section className="card">
            <p className="eyebrow">WHY THE POSTERIOR IS TANGLED</p>
            <h2>Shared sources of uncertainty</h2>
            <label className="feature">
              <input
                type="checkbox"
                checked={config.sharedError}
                onChange={(e) =>
                  changeConfig({ ...config, sharedError: e.target.checked })
                }
              />
              <span>
                <b>Shared polling error</b>
                <small>
                  b ∼ N(0, 2.5²). Every poll can miss in the same direction.
                </small>
              </span>
            </label>
            <label className="feature">
              <input
                type="checkbox"
                checked={config.regions}
                onChange={(e) =>
                  changeConfig({ ...config, regions: e.target.checked })
                }
              />
              <span>
                <b>Four regional swings</b>
                <small>r ∼ N(0, 2²). Nearby races can move together.</small>
              </span>
            </label>
            <label className="feature">
              <input
                type="checkbox"
                checked={config.houseEffects}
                onChange={(e) =>
                  changeConfig({ ...config, houseEffects: e.target.checked })
                }
              />
              <span>
                <b>Pollster house effects</b>
                <small>
                  h ∼ N(0, 1.5²). One agency shares its bias across surveys.
                </small>
              </span>
            </label>
            <p className="setting-note">
              Changing the model clears the chain and its estimates.
            </p>
          </section>
          <section className="card">
            <p className="eyebrow">CAUCUS SCENARIO</p>
            <label className="select-label" htmlFor="caucus">
              If new independents win…
            </label>
            <select
              id="caucus"
              value={caucus}
              onChange={(e) => {
                setCaucus(e.target.value);
                reset(config, e.target.value);
              }}
            >
              <option value="unaligned">Keep them unaligned</option>
              <option value="dem">Assume they support Democrats</option>
              <option value="rep">Assume they support Republicans</option>
            </select>
            <p className="small-copy">
              ID, MT, NE and SD have independent challengers in this model.
              Caucus choices are assumptions, not inferred from vote polls.
              Unaligned wins may leave control unresolved.
            </p>
          </section>
          <section className="card density-card">
            <p className="eyebrow">CURRENT LOG DENSITY</p>
            {[
              ["Prior", components.prior],
              ["State polls", components.state],
              ["National polls", components.national],
            ].map(([label, value]) => (
              <div className="density-row" key={label}>
                <span>{label}</span>
                <b>{fmt(value, 1)}</b>
              </div>
            ))}
            <div className="density-total">
              <span>Total log p + constant</span>
              <b>{fmt(s.logPost, 1)}</b>
            </div>
            <p className="small-copy">
              Metropolis needs density ratios. The unknown posterior normalizer
              cancels.
            </p>
          </section>
        </aside>
      </div>

      <section className="charts-grid">
        <div className="card">
          <p className="eyebrow">POSTERIOR OVER CHAMBER COMPOSITION</p>
          <h2>How many Democratic-caucus seats?</h2>
          <div className="chart histogram">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={histogram}
                margin={{ top: 25, right: 15, left: 0, bottom: 20 }}
              >
                <CartesianGrid vertical={false} stroke="#eef0f5" />
                <XAxis
                  dataKey="seats"
                  interval={3}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  width={35}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f4f2fa" }}
                  labelFormatter={(v) => `${v} Democratic-caucus seats`}
                />
                <ReferenceLine
                  x={51}
                  stroke="#6554d9"
                  strokeDasharray="4 3"
                  label={{
                    value: "51 to control",
                    position: "top",
                    fontSize: 11,
                    fill: "#6554d9",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Retained draws"
                  isAnimationActive={false}
                  radius={[3, 3, 0, 0]}
                >
                  {histogram.map((b) => (
                    <Cell
                      key={b.seats}
                      fill={b.seats >= 51 ? "#637bca" : "#d2a1a7"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="small-copy">
            Only post-warm-up draws. A rejected proposal leaves the current map
            in the chain. Independent seats follow the selected caucus scenario.
          </p>
        </div>
        <div className="card">
          <p className="eyebrow">TRACE · RECENT PROPOSALS</p>
          <h2>National mood and shared polling error</h2>
          <div className="trace-key">
            <span className="dem-text">— National environment g</span>
            <span className="ind-text">— Shared error b</span>
          </div>
          <div className="chart trace">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={s.trace}
                margin={{ top: 8, right: 15, left: 0, bottom: 20 }}
              >
                <CartesianGrid vertical={false} stroke="#eef0f5" />
                <XAxis
                  dataKey="iteration"
                  tickFormatter={(v) => `${v / 1000}k`}
                  minTickGap={35}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis width={35} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => `${fmt(v, 2)} pp`} />
                <Line
                  type="linear"
                  dataKey="g"
                  name="National environment"
                  stroke="#637bca"
                  strokeWidth={1.7}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="b"
                  name="Shared polling error"
                  stroke="#bc8922"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="small-copy">
            Polls constrain g + b. A more Democratic environment can be offset
            by a more Republican polling error: a correlated ridge to explore.
          </p>
        </div>
      </section>

      <section className="card model-card">
        <div className="card-title">
          <div>
            <p className="eyebrow">UNDER THE HOOD</p>
            <h2>A hierarchical Gaussian model</h2>
          </div>
          <span className="snapshot-badge">
            {model.variables.length} DIMENSIONS
          </span>
        </div>
        <p>
          All numbers are percentage points. Positive margins favor the
          Democratic challenger (or the named independent). N(m, σ²) uses
          variance as its second parameter.
        </p>
        <div className="equations">
          <div>
            <h3>01 · Prior and partial pooling</h3>
            <BlockMath
              math={String.raw`\mu_i \mid g,r \sim \mathcal N(\ell_i+g+r_{k(i)},\;${config.priorSD}^2)`}
            />
            <p>
              ℓᵢ = state’s 2024 presidential D − R margin minus the national
              2024 margin ({signed(data.baselineNationalMargin)} pp). g ∼ N(0,
              8²); regional rₖ ∼ N(0, 2²). For independent challengers, this is
              a rough opposition-lean proxy.
            </p>
          </div>
          <div>
            <h3>02 · State and national evidence</h3>
            <BlockMath
              math={String.raw`y_j\sim\mathcal N(\mu_{s(j)}+b+h_{p(j)},\sigma_j^2)`}
            />
            <BlockMath
              math={String.raw`z_j\sim\mathcal N(g+b+h_{p(j)},\sigma_j^2)`}
            />
            <p>
              b ∼ N(0, 2.5²), hₚ ∼ N(0, 1.5²). Positive bias means polls
              overstate the challenger. Generic-ballot polls measure the
              national environment, not a population-weighted average of the
              Senate races.
            </p>
          </div>
          <div>
            <h3>03 · Noise and age</h3>
            <BlockMath
              math={String.raw`\sigma_j^2=\frac{10000/n_j+2^2}{2^{-a_j/21}}`}
            />
            <p>
              nⱼ is the published sample size; aⱼ is days from the poll’s end to
              the snapshot. The 2 pp noise floor and 21-day half-life are
              teaching assumptions. Disabled effects are fixed at zero.
            </p>
          </div>
          <div>
            <h3>04 · Metropolis</h3>
            <BlockMath
              math={String.raw`\alpha=\min\{1,\exp[\log p(x'\mid y,z)-\log p(x\mid y,z)]\}`}
            />
            <p>
              Symmetric Gaussian proposals update one variable, a whole region,
              or all races with g and an opposing shift in b. With every term
              Gaussian, the latent posterior is multivariate Gaussian;
              converting margins into seats makes the quantity we care about
              nonlinear.
            </p>
          </div>
        </div>
        <details>
          <summary>Assumptions and what these probabilities mean</summary>
          <p>
            This is a teaching model, not Silver Bulletin’s forecast. It uses
            published poll margins, not Silver Bulletin’s adjusted averages or
            win probabilities. National polls and state polls share b and agency
            effects; races share g and regional effects. Polls with the same
            fieldwork are not intentionally counted as separate national/state
            evidence for the same question.
          </p>
          <p>
            One recent survey per pollster per race limits repeated tracking
            polls. Respondent overlap, turnout, undecided-voter allocation,
            candidate quality, and all other poll correlations are not fully
            modeled. LV, RV, and adult polls use their reported samples without
            a likely-voter correction. Alaska ranked-choice transfers,
            third-place candidates, and possible runoffs are approximated as a
            contest between the two named leading candidates.
          </p>
          <p>
            Only 25 of the 35 races have qualifying state polls in this source
            window; the others use the hierarchical prior. New independents are
            unaligned by default. A Democratic caucus needs 51 seats; 50
            Republican seats suffice with the Republican vice president.
            “Independents pivotal” means the selected caucus assumption has not
            resolved control.
          </p>
          <p>
            The first {fmt(BURN_IN, 0)} proposals are discarded and every {THIN}
            th state is retained, including repeats after rejection. Thinning
            does not guarantee independent draws or convergence. A single
            chain’s proportions may drift: run longer, reset, and compare.
          </p>
        </details>
        <button
          className="latent-toggle"
          aria-expanded={showLatents}
          onClick={() => setShowLatents((v) => !v)}
        >
          {showLatents ? "Hide" : "Show"} all current latent variables
        </button>
        {showLatents && (
          <div className="latent-grid">
            {model.variables.map((v, i) => (
              <div key={v.name}>
                <span>{v.name}</span>
                <b>{signed(s.x[i])}</b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card data-card">
        <p className="eyebrow">THE EVIDENCE</p>
        <h2>Real polls. A frozen, inspectable snapshot.</h2>
        <p>
          {data.statePolls.length} state polls + {data.nationalPolls.length}{" "}
          generic-ballot polls, ending October 1 – November 2, 2026. Downloaded
          November 3. These are pre-election inputs, not election results.
        </p>
        <p className="small-copy">{data.selection}</p>
        <details>
          <summary>
            State Senate polls{" "}
            <span>{data.statePolls.length} polls · 25 states</span>
          </summary>
          <PollTable />
          <a className="download" href="./data/senate-polls-2026.csv" download>
            ↓ Download state polls CSV
          </a>
        </details>
        <details>
          <summary>
            National generic-ballot polls{" "}
            <span>{data.nationalPolls.length} polls</span>
          </summary>
          <PollTable national />
          <a
            className="download"
            href="./data/national-polls-2026.csv"
            download
          >
            ↓ Download national polls CSV
          </a>
        </details>
        <details>
          <summary>2024 baseline and all 35 races</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th>Held by</th>
                  <th>2024 D − R</th>
                  <th>Relative lean ℓᵢ</th>
                  <th>State polls</th>
                </tr>
              </thead>
              <tbody>
                {data.races.map((r) => (
                  <tr key={r.state}>
                    <td>
                      {r.name}
                      {r.special ? " (special)" : ""}
                    </td>
                    <td>{r.heldBy}</td>
                    <td>{signed(r.margin2024)}</td>
                    <td>{signed(r.lean)}</td>
                    <td>
                      {data.statePolls.filter((p) => p.state === r.state)
                        .length || "Prior only"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a
            className="download"
            href="./data/race-baselines-2024.csv"
            download
          >
            ↓ Download baselines CSV
          </a>
        </details>
        <div className="sources">
          <h3>Sources</h3>
          {data.sources.map((source) => (
            <a key={source.url} href={source.url} {...external}>
              {source.label} ↗
            </a>
          ))}
        </div>
      </section>
      <footer>
        <span>METROPOLIS LAB · 2026 SENATE</span>
        <span>
          Data snapshot: {snapshotDate} · All model spreads are standard
          deviations.
        </span>
      </footer>
    </div>
  );
}
