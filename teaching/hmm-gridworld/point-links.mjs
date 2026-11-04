// Hit-test in screen space, so small path points remain easy to hover and the
// MC's transparent click targets never block GPS/path pairing.
export function pointLinks(svg, status) {
  let targets = [],
    pairs = [],
    showGPS = false,
    showViterbi = false;
  let pointer = null,
    active = "";

  function highlight(times) {
    const key = times.join(",");
    if (key === active) return;
    active = key;
    svg.classList.toggle("pair-hover", times.length > 0);
    for (const node of svg.querySelectorAll(".is-linked"))
      node.classList.remove("is-linked");
    const overlay = svg.querySelector(".pair-highlight");
    overlay.dataset.times = key;
    let drawing = "";
    const markedBlue = new Set();
    for (const time of times) {
      const { gps, blue } = pairs[time];
      for (const node of svg.querySelectorAll(
        `.gps-point[data-time="${time}"], .viterbi-point[data-time="${time}"], .viterbi-endpoint[data-time="${time}"], .gps-association[data-time="${time}"], .path-emission-weight[data-time="${time}"]`,
      ))
        node.classList.add("is-linked");
      if (showGPS && showViterbi)
        drawing += `<line class="pair-connector" data-time="${time}" x1="${blue.x}" y1="${blue.y}" x2="${gps.x}" y2="${gps.y}"/>`;
      if (showGPS)
        drawing += `<circle class="pair-halo gps-halo" cx="${gps.x}" cy="${gps.y}" r=".28"/>`;
      const position = `${blue.x},${blue.y}`;
      if (showViterbi && !markedBlue.has(position)) {
        markedBlue.add(position);
        drawing += `<circle class="pair-halo viterbi-halo" cx="${blue.x}" cy="${blue.y}" r=".18"/>`;
      }
    }
    overlay.innerHTML = drawing;
    status.hidden = times.length === 0;
    status.textContent = times.length
      ? `${showGPS && showViterbi ? "GPS ↔ Viterbi" : showGPS ? "GPS" : "Viterbi"} · t = ${times.join(", ")} s`
      : "";
  }

  function locate() {
    if (!pointer || !targets.length) {
      highlight([]);
      return;
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      highlight([]);
      return;
    }
    const p = new DOMPoint(pointer.x, pointer.y).matrixTransform(
      matrix.inverse(),
    );
    const view = svg.viewBox.baseVal;
    if (
      p.x < view.x ||
      p.x > view.x + view.width ||
      p.y < view.y ||
      p.y > view.y + view.height
    ) {
      highlight([]);
      return;
    }
    const scale = Math.hypot(matrix.a, matrix.b);
    let closest = null,
      bestDistance = Infinity;
    for (const target of targets) {
      const distance = Math.hypot(target.x - p.x, target.y - p.y) * scale;
      const radius = Math.max(8, target.radius * scale + 3);
      if (distance <= radius && distance < bestDistance) {
        closest = target;
        bestDistance = distance;
      }
    }
    highlight(closest?.times ?? []);
  }

  svg.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    locate();
  });
  svg.addEventListener("pointerleave", () => {
    pointer = null;
    highlight([]);
  });
  svg.addEventListener("pointercancel", () => {
    pointer = null;
    highlight([]);
  });
  // Page scrolling/resizing can move a point away from a stationary pointer.
  window.addEventListener("scroll", locate, { passive: true });
  window.addEventListener("resize", locate);

  return ({ observations, positions, gpsVisible, viterbiVisible }) => {
    showGPS = gpsVisible;
    showViterbi = viterbiVisible;
    pairs = observations.map((gps, time) => ({ gps, blue: positions[time] }));
    targets = [];
    const blueGroups = new Map();
    for (const [time, pair] of pairs.entries()) {
      if (showGPS)
        targets.push({
          ...pair.gps,
          times: [time],
          radius: time === pairs.length - 1 ? 0.2 : 0.15,
        });
      if (showViterbi) {
        const key = `${pair.blue.x},${pair.blue.y}`;
        if (!blueGroups.has(key))
          blueGroups.set(key, { ...pair.blue, times: [], radius: 0.105 });
        blueGroups.get(key).times.push(time);
      }
    }
    targets.push(...blueGroups.values());
    // render() replaces the SVG children, so refresh even when the time is the same.
    active = null;
    locate();
  };
}
