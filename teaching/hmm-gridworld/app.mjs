import { Experiment } from "./model.mjs";
import { townArtwork } from "./town-art.mjs";
import { chainArtwork } from "./chain-art.mjs";
import { laneGeometry, LANE_OFFSETS } from "./lane-geometry.mjs";
import { pathFactors } from "./path-factors.mjs";
import { pointLinks } from "./point-links.mjs";

const $ = (id) => document.getElementById(id);
const experiment = new Experiment();
const updatePointLinks = pointLinks($("map"), $("pair-status"));
function observationView(observations) {
  // Fit the whole fixed trip at this noise level so stepping never moves the
  // camera. Keep room for the latest GPS ring, without clamping observations.
  const margin = 0.55;
  const x =
    Math.floor(Math.min(-0.8, ...observations.map((p) => p.x - margin)) * 10) /
    10;
  const y =
    Math.floor(Math.min(-0.95, ...observations.map((p) => p.y - margin)) * 10) /
    10;
  const right =
    Math.ceil(Math.max(17.8, ...observations.map((p) => p.x + margin)) * 10) /
    10;
  const bottom =
    Math.ceil(Math.max(13.85, ...observations.map((p) => p.y + margin)) * 10) /
    10;
  return { x, y, width: right - x, height: bottom - y };
}
let time = 0;
let timer = null;
let view = "map";
let selectedState = experiment.grid.cells.findIndex(
  (p) => p.x === 6 && p.y === 3,
);

function pathLine(points, attributes) {
  if (points.length < 2) return "";
  return `<polyline points="${points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${attributes}/>`;
}

function car(cell, previous) {
  const angle =
    previous && (cell.x !== previous.x || cell.y !== previous.y)
      ? (Math.atan2(cell.y - previous.y, cell.x - previous.x) * 180) / Math.PI
      : 0;
  return `<g class="car-marker" transform="translate(${cell.x} ${cell.y}) rotate(${angle}) scale(.020)">
    <rect x="-13" y="-15" width="9" height="5" rx="2" fill="#27635e"/><rect x="6" y="-15" width="9" height="5" rx="2" fill="#27635e"/>
    <rect x="-13" y="10" width="9" height="5" rx="2" fill="#27635e"/><rect x="6" y="10" width="9" height="5" rx="2" fill="#27635e"/>
    <rect x="-19" y="-12" width="38" height="24" rx="8" fill="#168c7c" stroke="white" stroke-width="2.5"/>
    <path d="M3 -9L11 -7L11 7L3 9Z" fill="#b9e6df"/><rect x="-12" y="-8" width="6" height="16" rx="2" fill="#b9e6df"/>
    <path d="M17 -7v4m0 6v4" stroke="#fff5cc" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;
}

function render() {
  const { grid, states, observations } = experiment;
  const viewport = observationView(observations);
  $("map").setAttribute(
    "viewBox",
    `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`,
  );
  document.querySelector(".map-container").style.aspectRatio =
    `${viewport.width} / ${viewport.height}`;
  const showGPS = $("show-gps").checked;
  const showTruth = $("show-truth").checked;
  const showViterbi = $("show-viterbi").checked;
  const path = experiment.inference(time);
  const estimated = path.map((id) => grid.cells[id]);
  const truth = states.slice(0, time + 1).map((id) => grid.cells[id]);
  const truthLane = laneGeometry(truth, LANE_OFFSETS.truth);
  const estimatedLane = laneGeometry(estimated, LANE_OFFSETS.viterbi);
  const observed = observations.slice(0, time + 1);
  const isChain = view === "chain";
  const graph = isChain ? chainArtwork(grid, selectedState) : null;
  const factors =
    isChain && showViterbi
      ? pathFactors({
          grid,
          path,
          observations: observed,
          sigma: experiment.sigma,
          lane: estimatedLane,
          view: viewport,
          showGPS,
          selectedState,
        })
      : null;
  const focusedState = document.activeElement?.getAttribute("data-state");
  let content = `<title>${isChain ? "Markov chain" : "Linden Town"} at ${time} seconds</title><desc>${isChain ? "Each node is a street position. Two-way arrows show possible moves; loops mean waiting. Select a node to see outgoing transition probabilities." : "The car follows streets and can wait."} Orange is GPS data, green is the true path, and blue is the Viterbi estimate.</desc><defs><clipPath id="view-clip"><rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}"/></clipPath></defs><g clip-path="url(#view-clip)">${isChain ? graph.base : townArtwork}`;

  if (factors) content += factors.connectors;
  if (showTruth)
    content += `<g class="truth-path">${pathLine(truthLane.line, 'stroke="#168c7c" stroke-width=".075" stroke-dasharray=".15 .12" opacity=".9"')}</g>`;
  if (showViterbi) {
    content += `<g class="viterbi-path">${pathLine(estimatedLane.line, 'stroke="white" stroke-width=".13" opacity=".9"')}${pathLine(estimatedLane.line, 'stroke="#5965d9" stroke-width=".07"')}`;
    for (const [t, p] of estimatedLane.positions.entries())
      content += `<circle class="viterbi-point" data-time="${t}" cx="${p.x}" cy="${p.y}" r=".045" fill="#5965d9"><title>Viterbi at ${t} s: (${estimated[t].x}, ${estimated[t].y})</title></circle>`;
    const last = estimatedLane.positions.at(-1);
    content += `<circle class="viterbi-endpoint" data-time="${time}" cx="${last.x}" cy="${last.y}" r=".105" fill="white" stroke="#5965d9" stroke-width=".04"/></g>`;
  }
  if (showGPS) {
    content += '<g class="gps-observations">';
    for (const [t, p] of observed.entries()) {
      const latest = t === time;
      content += `<circle class="gps-point" data-time="${t}" cx="${p.x}" cy="${p.y}" r="${latest ? 0.2 : 0.15}" fill="${latest ? "#f68b1e" : "#ed861b"}" stroke="${latest ? "#994f0d" : "#fff"}" stroke-width=".045"><title>GPS at ${t} s: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})</title></circle>`;
      if (latest)
        content += `<circle cx="${p.x}" cy="${p.y}" r=".34" fill="none" stroke="#cb710f" stroke-width=".045"/>`;
    }
    content += "</g>";
  }
  if (showTruth) {
    const last = truthLane.positions.at(-1),
      heading = truthLane.headings.at(-1);
    content += car(last, { x: last.x - heading.x, y: last.y - heading.y });
  }
  if (isChain) content += graph.selection;
  if (factors) content += factors.labels;
  $("map").innerHTML =
    content + '<g class="pair-highlight" data-times=""></g></g>';
  $("map").setAttribute("role", isChain ? "group" : "img");
  $("map").setAttribute(
    "aria-label",
    isChain
      ? "Interactive Markov chain. Select a state to inspect its transitions."
      : "Linden Town, the true car route, noisy GPS, and the Viterbi estimate",
  );
  if (isChain && focusedState !== null)
    $("map")
      .querySelector(`[data-state="${focusedState}"]`)
      ?.focus({ preventScroll: true });
  $("view-map").setAttribute("aria-pressed", String(!isChain));
  $("view-chain").setAttribute("aria-pressed", String(isChain));
  $("chain-info").hidden = !isChain;
  $("path-factor-info").hidden = !factors;
  $("gps-factor-legend").hidden = !showGPS;
  $("gps-factor-product").hidden = !showGPS;
  const selected = grid.cells[selectedState];
  $("chain-state-info").hidden = !selected;
  if (selected) {
    const options = grid.outgoing[selectedState].length;
    $("chain-state-info").textContent =
      `State (${selected.x}, ${selected.y}): ${options - 1} neighbor${options === 2 ? "" : "s"} + waiting · 1/${options} each`;
  } else $("chain-state-info").textContent = "";
  $("time").textContent = time;
  $("history").value = time;
  $("next").disabled = time === experiment.duration;
  $("play").disabled = time === experiment.duration;
  $("next").title =
    time === experiment.duration
      ? "Trip complete. Reset or move the timeline to replay."
      : "Next step (→)";
  $("sigma-value").textContent = `σ = ${experiment.sigma.toFixed(1)}`;
  const frame = experiment.frames[time];
  $("journey-status").textContent = !showTruth
    ? "Linden Town · 60-second trip"
    : frame.phase === "complete"
      ? "Trip complete · Library"
      : `${frame.phase === "arrived" ? "Arrived at" : frame.phase === "waiting" ? "Waiting at" : "Driving to"} ${frame.destination}`;
  updatePointLinks({
    observations: observed,
    positions: estimatedLane.positions,
    gpsVisible: showGPS,
    viterbiVisible: showViterbi,
  });
}

function stop() {
  clearInterval(timer);
  timer = null;
  $("play").textContent = "▶ Play";
  $("play").setAttribute("aria-pressed", "false");
}

function advance() {
  if (time >= experiment.duration) return;
  time++;
  if (time === experiment.duration) stop();
  render();
}

function jump(target) {
  stop();
  time = Math.max(0, Math.min(target, experiment.duration));
  render();
}

function togglePlay() {
  if (timer) stop();
  else if (time < experiment.duration) {
    timer = setInterval(advance, 1000);
    $("play").textContent = "Ⅱ Pause";
    $("play").setAttribute("aria-pressed", "true");
    advance();
  }
}

$("next").addEventListener("click", () => {
  stop();
  advance();
});
$("play").addEventListener("click", togglePlay);
$("restart").addEventListener("click", () => jump(0));
$("history").addEventListener("input", (event) =>
  jump(Number(event.target.value)),
);
$("sigma").addEventListener("input", (event) => {
  stop();
  experiment.setSigma(Number(event.target.value));
  render();
});
for (const id of ["show-gps", "show-truth", "show-viterbi"])
  $(id).addEventListener("change", render);
for (const mode of ["map", "chain"])
  $("view-" + mode).addEventListener("click", () => {
    view = mode;
    render();
  });
function selectState(event) {
  const node = event.target.closest("[data-state]");
  if (!node) return;
  const id = Number(node.dataset.state);
  selectedState = selectedState === id ? null : id;
  render();
}
$("map").addEventListener("click", selectState);
$("map").addEventListener("keydown", (event) => {
  if (
    (event.key === "Enter" || event.key === " ") &&
    event.target.closest("[data-state]")
  ) {
    event.preventDefault();
    event.stopPropagation();
    selectState(event);
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.target.closest("input,textarea,select,[contenteditable]") ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (event.code === "ArrowRight") {
    event.preventDefault();
    stop();
    advance();
  }
  if (event.code === "ArrowLeft") {
    event.preventDefault();
    jump(time - 1);
  }
  if (event.code === "Space" && !event.target.closest("button,a,summary")) {
    event.preventDefault();
    togglePlay();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
render();
