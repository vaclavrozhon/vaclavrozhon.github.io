// Display geometry only. Model states and GPS coordinates stay on their
// original coordinates. In SVG (y down), (-dy, dx) is right of travel.
export const LANE_OFFSETS = { truth: 0.11, viterbi: -0.27 };

export function laneGeometry(points, offset) {
  if (!points.length) return { line: [], positions: [], headings: [] };
  const vertices = [],
    indices = [];
  for (const point of points) {
    const last = vertices.at(-1);
    if (!last || last.x !== point.x || last.y !== point.y) vertices.push(point);
    indices.push(vertices.length - 1);
  }
  const directions = vertices.slice(1).map((point, i) => {
    const dx = point.x - vertices[i].x,
      dy = point.y - vertices[i].y;
    const length = Math.hypot(dx, dy);
    return { x: dx / length, y: dy / length };
  });
  const shifted = (p, d) => ({ x: p.x - d.y * offset, y: p.y + d.x * offset });
  const line = [],
    anchors = [],
    headings = [];
  for (const [i, point] of vertices.entries()) {
    const incoming = directions[i - 1] ?? directions[0] ?? { x: 1, y: 0 };
    const outgoing = directions[i] ?? incoming;
    const dot = incoming.x * outgoing.x + incoming.y * outgoing.y;
    const start = shifted(point, incoming);
    headings.push(incoming);
    if (dot < -0.999) {
      // A small semicircle joins the two lanes at a U-turn. Waits at this
      // vertex keep their arrival-side anchor until the car departs.
      anchors.push(start);
      const normal = { x: start.x - point.x, y: start.y - point.y };
      for (let step = 0; step <= 12; step++) {
        const angle = (Math.PI * step) / 12;
        line.push({
          x:
            point.x +
            normal.x * Math.cos(angle) +
            incoming.x * Math.abs(offset) * Math.sin(angle),
          y:
            point.y +
            normal.y * Math.cos(angle) +
            incoming.y * Math.abs(offset) * Math.sin(angle),
        });
      }
    } else {
      // Intersection of the two offset lines; for our right-angle streets
      // this gives a compact corner instead of a diagonal across the road.
      const join = {
        x: point.x - ((incoming.y + outgoing.y) * offset) / (1 + dot),
        y: point.y + ((incoming.x + outgoing.x) * offset) / (1 + dot),
      };
      line.push(join);
      anchors.push(join);
    }
  }
  return {
    line,
    positions: indices.map((i) => anchors[i]),
    headings: indices.map((i) => headings[i]),
  };
}
