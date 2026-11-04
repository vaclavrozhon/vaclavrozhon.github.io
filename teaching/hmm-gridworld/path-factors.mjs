import { LANE_OFFSETS } from "./lane-geometry.mjs";

// Factors of the joint path/evidence density, omitting only the common
// (2πσ²)^(-number of observations) Gaussian normalizer.
export function pathWeights(grid, path, observations, sigma) {
  return {
    initial: 1 / grid.cells.length,
    transitions: path.slice(1).map((to, i) => ({
      time: i + 1,
      from: path[i],
      to,
      choices: grid.outgoing[path[i]].length,
    })),
    emissions: path.map((id, time) => {
      const state = grid.cells[id],
        observation = observations[time];
      const distance = Math.hypot(
        state.x - observation.x,
        state.y - observation.y,
      );
      const scaledDistance = distance / sigma;
      return {
        time,
        distance,
        scaledDistance,
        logWeight: -(scaledDistance ** 2) / 2,
      };
    }),
  };
}

// Reserve the nodes, data points and already placed labels. Prefer labels near
// their own edge/connector, with a fine leader when a label needs more space.
function labelLayout(grid, observations, view, selectedState) {
  const occupied = [...grid.cells, ...observations].map((p) => ({
    x: p.x,
    y: p.y,
    width: 0.36,
    height: 0.36,
  }));
  if (selectedState != null) {
    const source = grid.cells[selectedState];
    for (const id of grid.outgoing[selectedState]) {
      const p = grid.cells[id],
        self = id === selectedState;
      occupied.push({
        x: self
          ? source.x + 0.43
          : (source.x + p.x) / 2 + (p.y - source.y) * 0.2,
        y: self
          ? source.y - 0.36
          : (source.y + p.y) / 2 - (p.x - source.x) * 0.2,
        width: 0.48,
        height: 0.4,
        label: true,
      });
    }
  }
  return (nearby, width, height = 0.4) => {
    const clampX = (x) =>
      Math.max(
        view.x + width / 2 + 0.08,
        Math.min(view.x + view.width - width / 2 - 0.08, x),
      );
    const clampY = (y) =>
      Math.max(
        view.y + height / 2 + 0.08,
        Math.min(view.y + view.height - height / 2 - 0.08, y),
      );
    // Off-screen GPS can put the preferred midpoint far outside the view.
    // Search around its visible boundary too, rather than piling up labels.
    const origin = { x: clampX(nearby[0].x), y: clampY(nearby[0].y) };
    const candidates = [...nearby];
    for (const radius of [0.6, 1, 1.4, 1.8, 2.4])
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        candidates.push({
          x: origin.x + Math.cos(angle) * radius,
          y: origin.y + Math.sin(angle) * radius,
        });
      }
    let best,
      bestCost = Infinity;
    for (const [rank, p] of candidates.entries()) {
      const x = clampX(p.x),
        y = clampY(p.y);
      let cost = rank * 0.002 + Math.hypot(x - p.x, y - p.y);
      for (const box of occupied) {
        const overlapX = (width + box.width) / 2 + 0.05 - Math.abs(x - box.x);
        const overlapY = (height + box.height) / 2 + 0.05 - Math.abs(y - box.y);
        if (overlapX > 0 && overlapY > 0)
          cost += (box.label ? 10000 : 10) + overlapX * overlapY;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = { x, y, width, height, label: true };
      }
    }
    occupied.push(best);
    return best;
  };
}

function label(box, content, className, attributes, title) {
  return `<g class="path-factor-label ${className}" ${attributes}><title>${title}</title><rect x="${box.x - box.width / 2}" y="${box.y - box.height / 2}" width="${box.width}" height="${box.height}" rx=".055"/><text x="${box.x}" y="${box.y + 0.068}" text-anchor="middle">${content}</text></g>`;
}

function leader(anchor, box, className) {
  if (Math.hypot(anchor.x - box.x, anchor.y - box.y) < 0.25) return "";
  return `<line class="factor-leader ${className}" x1="${anchor.x}" y1="${anchor.y}" x2="${box.x}" y2="${box.y}"/>`;
}

export function pathFactors({
  grid,
  path,
  observations,
  sigma,
  lane,
  view,
  showGPS,
  selectedState,
}) {
  const weights = pathWeights(grid, path, observations, sigma);
  const place = labelLayout(
    grid,
    showGPS ? observations : [],
    view,
    selectedState,
  );
  let connectors = "",
    labels = "",
    loops = "";
  const start = lane.positions[0];
  const initialBox = place(
    [
      { x: start.x - 0.48, y: start.y - 0.5 },
      { x: start.x + 0.48, y: start.y - 0.5 },
      { x: start.x - 0.48, y: start.y + 0.5 },
      { x: start.x + 0.48, y: start.y + 0.5 },
    ],
    0.75,
    0.4,
  );
  labels += leader(start, initialBox, "transition-leader");
  labels += label(
    initialBox,
    `1/${grid.cells.length}`,
    "path-initial-probability",
    `data-probability="${weights.initial}"`,
    `Initial state: 1/${grid.cells.length}`,
  );

  // Identical directed transitions contribute once per visit, including waits.
  const groups = new Map();
  for (const step of weights.transitions) {
    const p = lane.positions[step.time];
    const key =
      `${step.from}:${step.to}` +
      (step.from === step.to ? `:${p.x}:${p.y}` : "");
    if (!groups.has(key)) groups.set(key, { ...step, times: [] });
    groups.get(key).times.push(step.time);
  }
  for (const step of groups.values()) {
    const a = grid.cells[step.from],
      b = grid.cells[step.to];
    const wait = step.from === step.to;
    let anchor, candidates;
    if (wait) {
      const p = lane.positions[step.time];
      loops += `<path class="path-wait-loop" d="M${p.x + 0.06} ${p.y - 0.04}C${p.x + 0.65} ${p.y - 0.12} ${p.x + 0.12} ${p.y - 0.72} ${p.x - 0.04} ${p.y - 0.06}"/>`;
      anchor = { x: p.x + 0.22, y: p.y - 0.28 };
      candidates = [
        { x: p.x + 0.4, y: p.y - 0.5 },
        { x: p.x + 0.55, y: p.y - 0.3 },
        { x: p.x - 0.35, y: p.y - 0.5 },
      ];
    } else {
      const normal = { x: a.y - b.y, y: b.x - a.x };
      anchor = {
        x: (a.x + b.x) / 2 + normal.x * LANE_OFFSETS.viterbi,
        y: (a.y + b.y) / 2 + normal.y * LANE_OFFSETS.viterbi,
      };
      candidates = [-0.17, -0.34, 0.18, -0.52, 0.35].map((offset) => ({
        x: anchor.x + normal.x * offset,
        y: anchor.y + normal.y * offset,
      }));
    }
    const count = step.times.length;
    const content =
      count === 1
        ? `1/${step.choices}`
        : `(1/${step.choices})<tspan dy="-.095" font-size=".135">${count}</tspan>`;
    const box = place(candidates, count === 1 ? 0.48 : 0.8);
    labels += leader(anchor, box, "transition-leader");
    labels += label(
      box,
      content,
      "path-transition-probability",
      `data-from="${step.from}" data-to="${step.to}" data-times="${step.times.join(",")}" data-probability="${1 / step.choices}"`,
      `${wait ? "Wait" : "Move"} at ${step.times.join(", ")} s: 1/${step.choices} per transition${count > 1 ? `, used ${count} times` : ""}`,
    );
  }

  if (showGPS) {
    // Place the most recent evidence first. All likelihoods use unshifted model
    // states; the small lane offset is only used for connector endpoints.
    for (const emission of [...weights.emissions].reverse()) {
      const { time, scaledDistance, distance, logWeight } = emission;
      // Absorb the factor 1/2 into the displayed distance, keeping the weight.
      const exponentDistance = scaledDistance / Math.SQRT2;
      const p = lane.positions[time],
        observation = observations[time];
      connectors += `<line class="gps-association" data-time="${time}" x1="${p.x}" y1="${p.y}" x2="${observation.x}" y2="${observation.y}"/>`;
      const dx = observation.x - p.x,
        dy = observation.y - p.y;
      const length = Math.hypot(dx, dy);
      const normal = length
        ? { x: -dy / length, y: dx / length }
        : { x: 0, y: -1 };
      const candidates = [];
      for (const offset of [-0.18, 0.18, -0.4, 0.4, -0.65, 0.65, -0.95, 0.95])
        for (const fraction of [0.55, 0.35, 0.75, 0.2, 0.9])
          candidates.push({
            x: p.x + dx * fraction + normal.x * offset,
            y: p.y + dy * fraction + normal.y * offset,
            fraction,
          });
      const box = place(candidates, 0.82, 0.4);
      const fraction = length
        ? Math.max(
            0,
            Math.min(
              1,
              ((box.x - p.x) * dx + (box.y - p.y) * dy) / length ** 2,
            ),
          )
        : 0;
      const anchor = { x: p.x + dx * fraction, y: p.y + dy * fraction };
      labels += leader(anchor, box, "emission-leader");
      labels += label(
        box,
        `e<tspan dy="-.09" font-size=".14">−${exponentDistance.toFixed(2)}²</tspan>`,
        "path-emission-weight",
        `data-time="${time}" data-distance="${distance}" data-scaled-distance="${scaledDistance}" data-log-weight="${logWeight}"`,
        `GPS at ${time} s: a = d/(σ√2) = ${exponentDistance.toFixed(4)}, relative weight = ${Math.exp(logWeight).toPrecision(4)}. Common density factor 1/(2πσ²) omitted.`,
      );
    }
  }
  return {
    connectors: `<g class="path-evidence">${connectors}</g>`,
    labels: `<g class="path-factors">${loops}${labels}</g>`,
  };
}
