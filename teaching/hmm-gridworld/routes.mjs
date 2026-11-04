// A single 60-second trip: 58 road moves and a 2-second coffee stop.
// The HMM receives neither these waypoints nor the stop schedule.
export const ROUTE = {
  start: "Station",
  legs: [
    {
      to: "Cafe",
      via: [
        [4, 1],
        [2, 1],
        [2, 3],
        [4, 3],
      ],
      wait: 2,
    },
    {
      to: "Hospital",
      via: [
        [4, 3],
        [14, 3],
        [14, 1],
        [16, 1],
        [16, 3],
        [14, 3],
        [14, 6],
      ],
      wait: 0,
    },
    {
      to: "Harbor",
      via: [
        [14, 6],
        [14, 11],
      ],
      wait: 0,
    },
    {
      to: "Library",
      via: [
        [14, 11],
        [14, 9],
        [6, 9],
        [6, 11],
        [4, 11],
      ],
      wait: 0,
    },
  ],
};

export function buildRoute(grid) {
  const place = (name) => grid.destinations.find((p) => p.name === name);
  const ids = new Map(grid.cells.map((p, id) => [`${p.x},${p.y}`, id]));
  let position = place(ROUTE.start).position;
  const frames = [
    { position, destination: ROUTE.legs[0].to, phase: "driving" },
  ];
  for (const leg of ROUTE.legs) {
    const target = place(leg.to).position;
    const append = (phase) =>
      frames.push({ position, destination: leg.to, phase });
    const end = grid.cells[target];
    for (const [x, y] of [...leg.via, [end.x, end.y]]) {
      const from = grid.cells[position];
      if (from.x !== x && from.y !== y)
        throw new Error("Route waypoints must follow orthogonal streets");
      const dx = Math.sign(x - from.x),
        dy = Math.sign(y - from.y);
      const length = Math.abs(x - from.x) + Math.abs(y - from.y);
      for (let step = 1; step <= length; step++) {
        const next = ids.get(`${from.x + step * dx},${from.y + step * dy}`);
        if (!grid.outgoing[position].includes(next))
          throw new Error("The route leaves the road graph");
        position = next;
        append(position === target ? "arrived" : "driving");
      }
    }
    for (let wait = 0; wait < leg.wait; wait++) append("waiting");
  }
  frames.at(-1).phase = "complete";
  if (frames.length !== 61)
    throw new Error("The route must last exactly 60 seconds");
  return frames;
}
