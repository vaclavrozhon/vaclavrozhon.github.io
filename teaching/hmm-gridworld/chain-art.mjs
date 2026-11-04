// Render the very same adjacency lists used by Viterbi, in town coordinates.
export function chainArtwork(grid, selected) {
  const arrow = (id, color) =>
    `<marker id="${id}" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill="${color}"/></marker>`;
  const edge = (from, to) => {
    const a = grid.cells[from],
      b = grid.cells[to];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    return `M${a.x + dx * 0.18} ${a.y + dy * 0.18}L${b.x - dx * 0.18} ${b.y - dy * 0.18}`;
  };
  const loop = ({ x, y }) =>
    `M${x + 0.14} ${y - 0.01}C${x + 0.64} ${y - 0.08} ${x + 0.12} ${y - 0.65} ${x + 0.02} ${y - 0.14}`;
  let base = `<g class="chain-art"><defs>${arrow("chain-arrow", "#a9afc6")}${arrow("selected-arrow", "#6554d9")}</defs>`;
  base +=
    '<g class="chain-edges" fill="none" stroke="#a9afc6" stroke-width=".026">';
  for (const [from, targets] of grid.outgoing.entries()) {
    for (const to of targets) {
      if (to === from)
        base += `<path class="chain-loop" d="${loop(grid.cells[from])}" marker-end="url(#chain-arrow)"><title>Wait at state ${from}: 1/${targets.length}</title></path>`;
      else if (from < to)
        base += `<path class="chain-edge" data-from="${from}" data-to="${to}" d="${edge(from, to)}" marker-start="url(#chain-arrow)" marker-end="url(#chain-arrow)"><title>${from} → ${to}: 1/${targets.length}; ${to} → ${from}: 1/${grid.outgoing[to].length}</title></path>`;
    }
  }
  base += '</g><g class="chain-nodes">';
  for (const [id, p] of grid.cells.entries())
    base += `<circle cx="${p.x}" cy="${p.y}" r=".13" fill="white" stroke="#8c94b1" stroke-width=".03"/>`;
  base += "</g></g>";

  const targets = grid.outgoing[selected] ?? [];
  const source = grid.cells[selected];
  let selection = '<g class="chain-selection">';
  for (const to of targets) {
    const p = grid.cells[to],
      self = to === selected;
    selection += `<path class="selected-transition" data-to="${to}" data-probability="${1 / targets.length}" d="${self ? loop(source) : edge(selected, to)}" fill="none" stroke="#6554d9" stroke-width=".045" marker-end="url(#selected-arrow)"/>`;
    const dx = p.x - source.x,
      dy = p.y - source.y;
    const x = self ? source.x + 0.43 : (source.x + p.x) / 2 + dy * 0.2;
    const y = self ? source.y - 0.36 : (source.y + p.y) / 2 - dx * 0.2;
    selection += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size=".19" font-weight="650" fill="#6554d9" stroke="white" stroke-width=".09" paint-order="stroke">1/${targets.length}</text>`;
    selection += `<circle cx="${p.x}" cy="${p.y}" r="${self ? 0.16 : 0.13}" fill="${self ? "#6554d9" : "#e9e4ff"}" stroke="#6554d9" stroke-width=".035"/>`;
  }
  selection += '</g><g class="chain-hit-targets">';
  for (const [id, p] of grid.cells.entries())
    selection += `<circle class="chain-state" data-state="${id}" cx="${p.x}" cy="${p.y}" r=".28" fill="transparent" role="button" tabindex="0" aria-pressed="${id === selected}" aria-label="State ${id} at (${p.x}, ${p.y}), ${grid.outgoing[id].length} possible next states including waiting. Activate to toggle transition probabilities."><title>State ${id}: (${p.x}, ${p.y}) · 1/${grid.outgoing[id].length} per outgoing transition</title></circle>`;
  selection += "</g>";
  return { base, selection };
}
