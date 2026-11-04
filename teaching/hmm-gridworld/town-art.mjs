import { TOWN } from "./town.mjs";

function tree(x, y, scale = 1, tint = "#80ae83") {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx=".06" cy=".12" rx=".23" ry=".15" fill="#4d735318"/><path d="M0 .12v-.18" stroke="#ab9070" stroke-width=".06"/><circle cy="-.12" r=".23" fill="${tint}"/><circle cx="-.07" cy="-.18" r=".14" fill="#ffffff20"/></g>`;
}

function house(
  x,
  y,
  width,
  height,
  color = "#dba794",
  roof = "#c8806c",
  type = "house",
) {
  const windows = [];
  for (let wx = 0.18; wx < width - 0.1; wx += 0.34) {
    windows.push(
      `<rect x="${wx}" y="${height - 0.19}" width=".13" height=".12" rx=".025" fill="#fff8df"/>`,
    );
  }
  return `<g class="town-building" transform="translate(${x} ${y})">
    <rect x=".08" y=".09" width="${width}" height="${height}" rx=".07" fill="#4866471a"/>
    <rect width="${width}" height="${height}" rx=".06" fill="${color}" stroke="#ffffff8c" stroke-width=".035"/>
    <path d="M-.06 .02L${width / 2} -.13L${width + 0.06} .02V${height - 0.29}L${width / 2} ${height - 0.17}L-.06 ${height - 0.29}Z" fill="${roof}"/>
    <path d="M${width / 2} -.1V${height - 0.21}" stroke="#ffffff35" stroke-width=".035"/>
    ${windows.join("")}
    ${type === "hospital" ? `<rect x="${width / 2 - 0.09}" y=".16" width=".18" height=".58" rx=".02" fill="#c77d76"/><rect x="${width / 2 - 0.29}" y=".36" width=".58" height=".18" rx=".02" fill="#c77d76"/>` : `<rect x="${width - 0.26}" y=".1" width=".11" height=".18" rx=".02" fill="#a87a6e"/>`}
  </g>`;
}

function label(name, x, y, size = 0.16, color = "#778675") {
  return `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-size="${size}" font-weight="650" letter-spacing=".025" paint-order="stroke" stroke="#edf3e6" stroke-width=".065">${name}</text>`;
}

function artwork() {
  let svg = `<g class="town-art">
    <defs><clipPath id="town-clip"><rect x="-2.3" y="-7" width="22.4" height="22" rx=".3"/></clipPath>
      <pattern id="river-ripples" width="1.1" height=".8" patternUnits="userSpaceOnUse"><path d="M.15 .2q.13-.08.26 0t.26 0M.6 .62q.12-.07.24 0" fill="none" stroke="#f8ffff" stroke-opacity=".38" stroke-width=".025"/></pattern>
    </defs>
    <g clip-path="url(#town-clip)">
    <rect x="-2.3" y="-7" width="22.4" height="22" fill="#eaf0e2"/>
    <path d="M-.6 11.7Q.9 10.7 1.2 12.5T2 14H-.6M8.7-.8Q9 .4 10 .7T10.3 2.6L10.8-1M13.1 12.2Q14.2 12.9 14.2 14H17.8V12.6Q15.5 13.1 13.1 12.2" fill="#dce9d2"/>
    <path d="M10.6-7C10.4-5 12-3 11.4-1C10.8 1.4 11.8 2.4 11.5 4.3S10.8 6.8 11.5 8.8S12.2 12.2 11.2 14Q11 14.5 11.2 15" fill="none" stroke="#d8e6cd" stroke-width="2.4"/>
    <path d="M10.6-7C10.4-5 12-3 11.4-1C10.8 1.4 11.8 2.4 11.5 4.3S10.8 6.8 11.5 8.8S12.2 12.2 11.2 14Q11 14.5 11.2 15" fill="none" stroke="#a8d1d8" stroke-width="1.55"/>
    <path d="M10.6-7C10.4-5 12-3 11.4-1C10.8 1.4 11.8 2.4 11.5 4.3S10.8 6.8 11.5 8.8S12.2 12.2 11.2 14Q11 14.5 11.2 15" fill="none" stroke="url(#river-ripples)" stroke-width="1.5"/>
    <rect x="2.58" y="6.56" width="2.8" height="2.05" rx=".35" fill="#d4e5c9"/>
    <path d="M4 7Q3.5 7.2 3.15 7.8T4.6 8.4" fill="none" stroke="#f6f1d9" stroke-width=".16"/>
    <ellipse cx="3.2" cy="8" rx=".43" ry=".26" fill="#9dcbd0"/>
    <path d="M3 8q.15-.06.3 0" fill="none" stroke="#cfe7e7" stroke-width=".03"/>
    <rect x="6.65" y="3.62" width="1.75" height="1.9" rx=".2" fill="#e4dfcb"/>
    <circle cx="7.5" cy="4.65" r=".3" fill="#f4efdf" stroke="#d3cbb7" stroke-width=".04"/>
    <circle cx="7.5" cy="4.65" r=".2" fill="#9fcbd0"/><circle cx="7.5" cy="4.65" r=".055" fill="#f8faf0"/>
    <rect x="6.8" y="11.8" width="2.1" height="1.1" rx=".16" fill="#c7ddbf"/>
    <rect x="7" y="11.96" width="1.7" height=".78" rx=".03" fill="none" stroke="#f3f8ed" stroke-width=".025"/>
    <path d="M7.85 11.96v.78" stroke="#f3f8ed" stroke-width=".025"/><circle cx="7.85" cy="12.35" r=".18" fill="none" stroke="#f3f8ed" stroke-width=".025"/>
    <path d="M12.2 10.75h1.1v.5h-1.1" fill="#d2b892" stroke="#b49e7f" stroke-width=".025"/>
    <path d="M12.35 10.75v.5m.2-.5v.5m.2-.5v.5" stroke="#b49e7f" stroke-width=".025"/>
  `;

  // Draw exactly the same segments that supply the model's edges.
  const roads = TOWN.streets
    .map((points) =>
      points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" "),
    )
    .join(" ");
  svg += `<path class="street-outline" d="${roads}" fill="none" stroke="#d2d2bd" stroke-width=".82" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="street-surface" d="${roads}" fill="none" stroke="#fbf8ec" stroke-width=".68" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${roads}" fill="none" stroke="#dfd7c4" stroke-width=".025" stroke-dasharray=".17 .2"/>`;
  for (const y of TOWN.bridges) {
    svg += `<g class="town-bridge"><path d="M10.3 ${y}H12.7" stroke="#f3ecd8" stroke-width=".68"/>
      <path d="M10.3 ${y - 0.43}H12.7M10.3 ${y + 0.43}H12.7" stroke="#a9b8ac" stroke-width=".065" stroke-linecap="round"/>`;
    for (let x = 10.35; x < 12.7; x += 0.3)
      svg += `<path d="M${x} ${y - 0.46}v.12M${x} ${y + 0.34}v.12" stroke="#94a99b" stroke-width=".065"/>`;
    svg += `</g>`;
  }
  for (const [x, y] of [
    [2, 3],
    [6, 6],
    [14, 9],
    [6, 3],
  ]) {
    for (let k = 0; k < 5; k++)
      svg += `<path d="M${x + 0.47} ${y - 0.25 + k * 0.12}h.26" stroke="#d6cbb4" stroke-width=".06"/>`;
  }

  const buildings = [
    [5.1, -0.45, 2.4, 0.75, "#b5b6c2", "#8d94a6"],
    [2.75, 1.58, 1.0, 0.85, "#dfb9a0", "#cf957b"],
    [4.25, 1.55, 1.05, 0.94, "#dec7a7", "#b79c7a"],
    [6.8, 1.55, 1.35, 0.9, "#c5c2cf", "#a59eb8"],
    [0.35, 4, 1.05, 1.2, "#edc99a", "#d4a578"],
    [2.7, 4.12, 0.72, 1.15, "#d7b3a2", "#ba8b7e"],
    [4.65, 4.4, 0.8, 0.9, "#e5bba4", "#c98e79"],
    [6.9, 3.7, 1.2, 0.48, "#e0c5ab", "#b7a28b"],
    [7, 6.75, 1.2, 1.45, "#d7c5aa", "#b6a38c"],
    [0.35, 7.15, 0.95, 1.03, "#c5c3cd", "#a4a0b6"],
    [2.75, 9.7, 0.9, 0.65, "#d8b99e", "#c89877"],
    [4.35, 9.7, 0.95, 0.65, "#b8c9c0", "#8baa9c"],
    [6.9, 10.05, 1.75, 1.13, "#e9d5ac", "#c9b586"],
    [2.9, 12.5, 2.35, 0.7, "#bfc3d5", "#989fbf"],
    [14.65, 1.55, 0.78, 0.94, "#d8b1a6", "#b9857c"],
    [14.75, 4.05, 1.0, 1.1, "#c6d2bd", "#9cb18e"],
    [16.3, 4.1, 0.86, 1.05, "#e3c5a6", "#cda07d"],
    [15.85, 6.85, 1.4, 1.35, "#e3e2da", "#f8f5ea", "hospital"],
    [14.75, 9.7, 1.0, 0.65, "#d2bdab", "#b49a86"],
    [14.7, 11.8, 1.65, 0.85, "#b7c2c6", "#91a7ae"],
  ];
  buildings.forEach((args) => {
    svg += house(...args);
  });
  // Café awning and terrace; town hall entrance; railway platform.
  svg += `<path d="M4.61 5.17h.88" stroke="#f9eadb" stroke-width=".17"/><path d="M4.66 5.17h.12m.12 0h.12m.12 0h.12m.12 0h.12" stroke="#bb826e" stroke-width=".17"/>
    <circle cx="3.65" cy="4.85" r=".13" fill="#e5cfaa" stroke="#baaa88" stroke-width=".025"/><circle cx="4.05" cy="5.2" r=".13" fill="#e5cfaa" stroke="#baaa88" stroke-width=".025"/>
    <path d="M8.25 7.15h.28m-.28.15h.28m-.28.15h.28" stroke="#c9bda5" stroke-width=".06"/>
    <path d="M5.15 .48h2.2" stroke="#c5c8c2" stroke-width=".06"/>
    <path d="M7.1-.2h.22" stroke="#e4e3df" stroke-width=".07"/>
    <g transform="translate(11.9 11.7) rotate(-12)"><path d="M-.13-.38Q-.27.02 0 .42Q.27.02.13-.38Z" fill="#f8f4df" stroke="#7eacb5" stroke-width=".035"/><rect x="-.08" y="-.13" width=".16" height=".29" rx=".03" fill="#b7a295"/></g>`;

  const trees = [
    [0.6, 0.3],
    [1.1, 1.5],
    [0.5, 2.1],
    [8.7, 0.15],
    [9.4, 1.1],
    [9.9, 1.9],
    [10.15, 4.4],
    [10.1, 5.3],
    [10.05, 6.9],
    [10.2, 8],
    [10.4, 10.2],
    [10.25, 12],
    [3, 6.95],
    [3.3, 7.25],
    [4.9, 8.1],
    [4.25, 8.4],
    [2.8, 8.45],
    [0.7, 10.3],
    [0.4, 11.1],
    [1, 12.6],
    [1.65, 13.1],
    [6.1, 12.8],
    [9.5, 12.5],
    [12.9, 0.6],
    [13.05, 2],
    [13.1, 4.3],
    [12.95, 5.2],
    [13.1, 7.2],
    [12.85, 8.1],
    [16.9, 0.6],
    [17.15, 2.2],
    [15.3, 7.2],
    [15, 7.9],
    [16.7, 9.9],
    [13.2, 12.5],
    [17, 12.7],
  ];
  trees.forEach(([x, y], i) => {
    svg += tree(
      x,
      y,
      0.85 + (i % 4) * 0.1,
      ["#8eb68a", "#78a481", "#a5bd86"][i % 3],
    );
  });
  svg += label("STATION", 6.3, 0.52, 0.16, "#717986");
  svg += label("BAKERY", 0.88, 5.56);
  svg += label("CAFE", 4.8, 5.64);
  svg += label("MARKET", 7.5, 5.25, 0.135);
  svg += label("LINDEN PARK", 3.75, 8.68, 0.145);
  svg += label("TOWN HALL", 7.6, 8.53);
  svg += label("SCHOOL", 7.75, 11.47);
  svg += label("LIBRARY", 4.05, 13.45);
  svg += label("HOSPITAL", 16.5, 8.58, 0.145);
  svg += label("HARBOR", 13.25, 11.72, 0.145);
  svg += `<text x="11.4" y="6.6" transform="rotate(90 11.4 6.6)" text-anchor="middle" fill="#719fa9" font-size=".19" letter-spacing=".08">LINDEN RIVER</text>`;
  svg += label("LINDEN ST", 4.8, 2.75, 0.12, "#a5a08e");
  svg += label("BRIDGE ST", 15.25, 8.72, 0.12, "#a5a08e");
  svg += `</g><rect x="-2.3" y="-7" width="22.4" height="22" rx=".3" fill="none" stroke="#d5e0d0" stroke-width=".035"/></g>`;
  return svg;
}

// Static geometry is generated once; moving paths and GPS are drawn above it.
export const townArtwork = artwork();
