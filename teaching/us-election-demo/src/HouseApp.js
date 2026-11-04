import React, { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import data from "./data/house2026.json";
import { seatTally } from "./model.mjs";
import {
  buildHouseModel,
  HOUSE_SETTINGS,
  nationalMargin,
} from "./house-model.mjs";
import HouseMap from "./HouseMap";
import "./house.css";

const initial = buildHouseModel(data).initial;
const fmt = (n, digits = 1) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const signed = (n) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const percent = (n, total) => (total ? `${fmt((100 * n) / total)}%` : "—");
const external = { target: "_blank", rel: "noreferrer" };
function color(margin, independent) {
  const base =
    margin >= 0
      ? independent
        ? [187, 143, 45]
        : [69, 102, 198]
      : [207, 87, 99];
  const strength = Math.min(1, Math.abs(margin) / 15);
  return `rgb(${base.map((v, i) => Math.round([239, 240, 247][i] * (1 - strength) + v * strength)).join(",")})`;
}
function histogramBins(histogram) {
  // Align a bin boundary with 218, so a bar never mixes majority/no majority.
  const bins = Array.from({ length: 88 }, (_, i) => {
    const from = Math.max(0, i * 5 - 2),
      to = Math.min(435, i * 5 + 2);
    return {
      seats: (from + to) / 2,
      from,
      to,
      count: histogram.slice(from, to + 1).reduce((a, b) => a + b, 0),
    };
  });
  const used = bins.filter((bin) => bin.count);
  if (!used.length)
    return bins.filter((bin) => bin.seats >= 170 && bin.seats <= 275);
  // Include every retained draw and the majority threshold, with padding.
  const min = Math.min(218, used[0].seats) - 15,
    max = Math.max(218, used.at(-1).seats) + 15;
  return bins.filter((bin) => bin.seats >= min && bin.seats <= max);
}

export default function HouseApp() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState("PA-07");
  const worker = useRef(null),
    generation = useRef(0);
  useEffect(() => {
    const w = new Worker(new URL("./house-worker.mjs", document.baseURI), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = ({ data: message }) => {
      if (message.generation !== generation.current) return;
      if (message.error) setError(message.error);
      else setSnapshot(message);
    };
    w.onerror = () => setError("The sampler could not start. Reload the demo.");
    w.postMessage({ type: "reset", generation: generation.current });
    const pause = () => {
      if (document.hidden)
        w.postMessage({ type: "pause", generation: generation.current });
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      w.terminate();
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);
  const send = (type, extra = {}) =>
    worker.current?.postMessage({
      type,
      generation: generation.current,
      ...extra,
    });
  const reset = () => {
    generation.current++;
    setSnapshot(null);
    setError(null);
    send("reset");
  };
  const s = snapshot,
    margins = s?.x || initial;
  const seats = seatTally(data, margins);
  const retained = s?.retained || 0;
  const counts = s?.counts || { dem: 0, rep: 0, pivotal: 0 };
  const iter = s?.iter || 0;
  const hasMoved = Boolean(s?.accepted);
  const histogram = histogramBins(s?.histogram || Array(436).fill(0));
  const tallyColor = (i) =>
    hasMoved && data.races[i].fixedWinner === "D"
      ? "#4566c6"
      : color(margins[i], data.races[i].independent);
  return (
    <main className="app-shell house-app">
      <header className="house-header">
        <div>
          <p className="eyebrow">PST II / METROPOLIS</p>
          <h1>Who will control the House?</h1>
        </div>
        <a href="#senate" className="house-senate-link">
          Senate demo ↗
        </a>
      </header>
      <p className="house-intro">
        435 unknown district biases, starting at zero. District polls and
        national polls. One possible election map at a time.
      </p>

      {error && (
        <p className="house-error" role="alert">
          {error}
        </p>
      )}
      <section
        className="house-panel house-controls"
        aria-label="Metropolis controls"
      >
        <div className="house-buttons">
          <button
            id="house-run"
            className="primary"
            disabled={!s}
            onClick={() => send(s.running ? "pause" : "run")}
          >
            {s?.running ? "Pause Metropolis" : "Start Metropolis"}
          </button>
          <button
            id="house-step"
            disabled={!s || s.running}
            onClick={() => send("step", { count: 500 })}
          >
            Step ×500
          </button>
          <button id="house-reset" className="quiet" onClick={reset}>
            Reset
          </button>
          <span className="house-stats">
            Iterations <b data-testid="house-iterations">{fmt(iter, 0)}</b>{" "}
            <span>·</span> Accepted{" "}
            <b data-testid="house-acceptance">
              {iter ? `${fmt((100 * s.accepted) / iter)}%` : "—"}
            </b>{" "}
            <span>·</span> National bias{" "}
            <b data-testid="house-national">
              {signed(s?.national ?? nationalMargin(margins))} pp
            </b>
          </span>
        </div>
        <div className="house-progress">
          <span>
            Each proposal: independently shift all 435 biases by N(0, 0.5²),
            then accept or reject the whole map.
          </span>
          <span data-testid="house-warmup">
            {iter < HOUSE_SETTINGS.burnIn
              ? `Warm-up ${fmt(iter, 0)} / ${fmt(HOUSE_SETTINGS.burnIn, 0)}`
              : `${fmt(retained, 0)} retained draws`}
          </span>
        </div>
      </section>

      <section className="house-panel house-visuals">
        <div className="house-map-area">
          <div className="house-map-heading">
            <h2>Current map</h2>
            <span className="house-seat-label">
              <b className="house-dem">
                D{" "}
                <span data-testid="house-dem-seats">
                  {hasMoved ? seats.d : "—"}
                </span>
              </b>
              <b className="house-rep">
                R{" "}
                <span data-testid="house-rep-seats">
                  {hasMoved ? seats.r : "—"}
                </span>
              </b>
              {seats.independent > 0 && (
                <b className="house-ind">I {seats.independent}</b>
              )}
              <small>218 for a majority</small>
            </span>
          </div>
          <HouseMap
            races={data.races}
            margins={margins}
            selected={selected}
            onSelect={setSelected}
            mode="draw"
            tallyColor={tallyColor}
          />
          <p className="house-map-note">
            Colors show the current district biases, in percentage points. Blue:
            Democratic · red: Republican · gold: independent.
          </p>
        </div>
        <aside className="house-histogram">
          <h2>Democratic seats</h2>
          <div className="house-chart" data-testid="house-histogram">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={histogram}
                margin={{ top: 18, right: 12, bottom: 8, left: -24 }}
              >
                <XAxis
                  dataKey="seats"
                  type="number"
                  domain={["dataMin - 3", "dataMax + 3"]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => {
                    const bin = histogram.find(
                      (b) => b.seats === Number(value),
                    );
                    return bin
                      ? `${bin.from}–${bin.to} Democratic seats`
                      : `${value} seats`;
                  }}
                  formatter={(value) => [value, "Retained draws"]}
                />
                <ReferenceLine
                  x={218}
                  stroke="#6554d9"
                  strokeDasharray="4 3"
                  label={{
                    value: "218",
                    fill: "#6554d9",
                    fontSize: 10,
                    position: "top",
                  }}
                />
                <Bar dataKey="count" isAnimationActive={false}>
                  {histogram.map((bin) => (
                    <Cell
                      key={bin.seats}
                      fill={bin.seats >= 218 ? "#6879d2" : "#d8949a"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="house-control-probabilities">
            <div>
              <span>Democratic majority</span>
              <b className="house-dem" data-testid="house-dem">
                {percent(counts.dem, retained)}
              </b>
            </div>
            <div>
              <span>Republican majority</span>
              <b className="house-rep" data-testid="house-rep">
                {percent(counts.rep, retained)}
              </b>
            </div>
            <div>
              <span>Neither reaches 218</span>
              <b className="house-ind" data-testid="house-independent">
                {percent(counts.pivotal, retained)}
              </b>
            </div>
          </div>
          <p className="house-sampling-note">
            <strong data-testid="house-retained">{fmt(retained, 0)}</strong>{" "}
            retained draws. Discard the first 20,000 proposals, then record
            every 100th state, including rejections.
          </p>
          <p className="house-sampling-note">
            Draws are correlated. This is a teaching model; warm-up does not
            certify convergence.
          </p>
        </aside>
      </section>

      <details className="house-panel house-details" id="house-latents">
        <summary>
          Current district biases <span>435 latent variables</span>
        </summary>
        <p className="house-detail-intro">
          μᵢ is the underlying D − R margin, or I − R in Alaska. Positive favors
          the challenger. The two Democratic-only ballots are counted as D seats
          regardless of μᵢ.
        </p>
        <div className="house-latent-grid">
          {data.races.map((r, i) => (
            <button
              key={r.state}
              data-latent={r.state}
              aria-pressed={selected === r.state}
              onClick={() => setSelected(r.state)}
            >
              <span>{r.state}</span>
              <b className={margins[i] >= 0 ? "house-dem" : "house-rep"}>
                {signed(margins[i])}
              </b>
            </button>
          ))}
        </div>
      </details>

      <details className="house-panel house-details" id="house-model">
        <summary>Bayesian model &amp; Metropolis</summary>
        <div className="house-model-copy">
          <p>
            <strong>Unknowns.</strong> One actual bias μᵢ per district, measured
            in percentage points. A map is one point in a 435-dimensional space.
          </p>
          <p>
            <strong>Prior.</strong> Centered on the district’s 2024 presidential
            margin mᵢ on the current district lines. District-specific
            deviations have spread 5 pp, and a shared national swing g lets the
            country move together.
          </p>
          <BlockMath
            math={String.raw`g\sim\mathcal N(0,8^2),\qquad \mu_i\mid g\sim\mathcal N(m_i+g,5^2)`}
          />
          <p>
            <strong>Evidence.</strong> A local poll measures its district; a
            national poll measures μ̄, the equally weighted mean of all district
            biases. Equal district weights are a classroom approximation to
            national turnout. One shared polling error b can move all the polls
            together.
          </p>
          <BlockMath
            math={String.raw`b\sim\mathcal N(0,2.5^2),\qquad y_j\mid\mu,b\sim\mathcal N(\mu_{i(j)}+b,\sigma_j^2)`}
          />
          <BlockMath
            math={String.raw`\bar\mu=\frac1{435}\sum_i\mu_i,\qquad z_k\mid\mu,b\sim\mathcal N(\bar\mu+b,\sigma_k^2)`}
          />
          <p>
            Poll variance is (10000 / n + 2²) / 2<sup>−age/21</sup>: sampling
            noise, an extra 2 pp floor, and less weight for older polls. We
            average over g and b analytically. Only the 435 μᵢ are sampled;
            their posterior is correlated.
          </p>
          <p>
            <strong>Proposal.</strong> Add a fresh, independent Gaussian to
            every district at once. The proposal is symmetric, so the entire
            proposed map is accepted with the usual posterior-density ratio:
          </p>
          <BlockMath
            math={String.raw`\mu_i'=\mu_i+\varepsilon_i,\quad \varepsilon_i\overset{\mathrm{iid}}\sim\mathcal N(0,0.5^2)`}
          />
          <BlockMath
            math={String.raw`\alpha=\min\!\left(1,\frac{p(\boldsymbol\mu'\mid y,z)}{p(\boldsymbol\mu\mid y,z)}\right)`}
          />
          <p>
            The posterior over margins is multivariate Gaussian. Turning margins
            into wins and a House majority is nonlinear. Priors, noise scales,
            turnout weights, and treatment of atypical contests are teaching
            assumptions.
          </p>
        </div>
      </details>

      <details className="house-panel house-details" id="house-data">
        <summary>
          Data &amp; sources <span>2026 polling snapshot · November 2</span>
        </summary>
        <div className="house-data-columns">
          <section>
            <h3>2024 district margins</h3>
            <div className="house-data-scroll">
              <table>
                <thead>
                  <tr>
                    <th>District</th>
                    <th>D − R</th>
                  </tr>
                </thead>
                <tbody>
                  {data.races.map((r) => (
                    <tr key={r.state}>
                      <td>{r.state}</td>
                      <td>{signed(r.margin2024)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h3>District polls · {data.statePolls.length}</h3>
            <div className="house-data-scroll">
              <table>
                <thead>
                  <tr>
                    <th>District / firm</th>
                    <th>Margin</th>
                    <th>n</th>
                  </tr>
                </thead>
                <tbody>
                  {data.statePolls.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <a href={p.url} {...external}>
                          {p.state} · {p.pollster}
                        </a>
                        <small>{p.end}</small>
                      </td>
                      <td>{signed(p.margin)}</td>
                      <td>{fmt(p.n, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h3>National polls · {data.nationalPolls.length}</h3>
            <div className="house-data-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Firm</th>
                    <th>D − R</th>
                    <th>n</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nationalPolls.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <a href={p.url} {...external}>
                          {p.pollster}
                        </a>
                        <small>{p.end}</small>
                      </td>
                      <td>{signed(p.margin)}</td>
                      <td>{fmt(p.n, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <p className="house-detail-intro">
          Polls from October 1–November 2, 2026, retrieved November 3. Latest
          qualifying poll per firm and district: 60 polls in 35 districts, plus
          31 national polls. Unpolled districts still respond through the shared
          national swing and national evidence.
        </p>
        <p className="house-detail-intro">
          Census district geometry with Missouri restored to 119th-Congress
          lines; matching 2024 presidential baselines from The Downballot. CA-11
          and CA-34 are fixed Democratic seats. An Alaska independent win stays
          unaligned; the I − R margin is used as an opposition-preference proxy
          in the national average. Other candidate, turnout, unopposed, runoff
          and ranked-choice effects are simplified. This is not a calibrated
          election forecast.
        </p>
        <div className="house-sources">
          {data.sources.map((source) => (
            <a key={source.url} href={source.url} {...external}>
              {source.label} ↗
            </a>
          ))}
        </div>
        <div className="house-downloads">
          <a href="./data/house-polls-2026.csv" download>
            District polls CSV
          </a>
          <a href="./data/national-polls-2026.csv" download>
            National polls CSV
          </a>
          <a href="./data/house-baselines-2026.csv" download>
            2024 baselines CSV
          </a>
          <a href="./data/house-districts-2026.geojson" download>
            District boundaries
          </a>
        </div>
      </details>
    </main>
  );
}
