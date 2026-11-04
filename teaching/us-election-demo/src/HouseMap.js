import React, { useCallback, useEffect, useRef, useState } from "react";
import geometry from "./data/house-map.json";
const HOME = { x: 0, y: 0, k: 1 };
const limit = (v, min, max) => Math.max(min, Math.min(max, v));
export default function HouseMap({
  races,
  margins,
  winCounts,
  count,
  selected,
  onSelect,
  mode,
  focusRequest,
  tallyColor,
}) {
  const [view, setView] = useState(HOME),
    [hover, setHover] = useState(null),
    [dragging, setDragging] = useState(false);
  const drag = useRef(null),
    svg = useRef(null);
  const index = Object.fromEntries(races.map((r, i) => [r.state, i]));
  function zoom(factor) {
    setView((v) => {
      const k = limit(v.k * factor, 1, 20),
        ratio = k / v.k;
      return { x: 500 - (500 - v.x) * ratio, y: 310 - (310 - v.y) * ratio, k };
    });
  }
  const fit = useCallback((items) => {
    if (!items.length) return;
    const x0 = Math.min(...items.map((d) => d.bounds[0][0])),
      y0 = Math.min(...items.map((d) => d.bounds[0][1]));
    const x1 = Math.max(...items.map((d) => d.bounds[1][0])),
      y1 = Math.max(...items.map((d) => d.bounds[1][1]));
    const k = limit(
      Math.min(860 / Math.max(x1 - x0, 1), 500 / Math.max(y1 - y0, 1)),
      1,
      20,
    );
    setView({ k, x: 500 - (k * (x0 + x1)) / 2, y: 310 - (k * (y0 + y1)) / 2 });
  }, []);
  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.state === "US") setView(HOME);
    else fit(geometry.districts.filter((d) => d.state === focusRequest.state));
  }, [focusRequest, fit]);
  const active = hover || selected,
    activeIndex = index[active],
    race = races[activeIndex];
  const margin = margins[activeIndex];
  return (
    <div className="district-map-wrap">
      <div className="district-map-tools">
        <button aria-label="Zoom in" onClick={() => zoom(1.6)}>
          ＋
        </button>
        <button aria-label="Zoom out" onClick={() => zoom(1 / 1.6)}>
          −
        </button>
        <button onClick={() => setView(HOME)}>Reset view</button>
        <span>{view.k.toFixed(1)}×</span>
      </div>
      <svg
        ref={svg}
        viewBox="0 0 1000 620"
        className={`district-map ${dragging ? "dragging" : ""}`}
        aria-label="Map of all 435 voting congressional districts"
        role="group"
        onDoubleClick={(e) => {
          const district = document.elementFromPoint(e.clientX, e.clientY)
            ?.dataset.district;
          if (district) {
            onSelect(district);
            fit(geometry.districts.filter((d) => d.id === district));
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
          svg.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y;
          if (Math.hypot(dx, dy) > 4) {
            drag.current.moved = true;
            setDragging(true);
            setHover(null);
            const ratio = 1000 / svg.current.getBoundingClientRect().width;
            setView({
              ...drag.current.view,
              x: drag.current.view.x + dx * ratio,
              y: drag.current.view.y + dy * ratio,
            });
          }
        }}
        onPointerUp={(e) => {
          const wasDragged = drag.current?.moved;
          drag.current = null;
          setDragging(false);
          if (svg.current.hasPointerCapture(e.pointerId))
            svg.current.releasePointerCapture(e.pointerId);
          if (!wasDragged) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            if (target?.dataset.district) onSelect(target.dataset.district);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        <defs>
          <clipPath id="house-viewport">
            <rect width="1000" height="620" />
          </clipPath>
          <clipPath id="house-land">
            <path d={geometry.land} />
          </clipPath>
        </defs>
        <g clipPath="url(#house-viewport)">
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <path d={geometry.land} fill="#e7eaf2" />
            <g clipPath="url(#house-land)">
              {geometry.districts.map((d) => {
                const i = index[d.id],
                  r = races[i];
                const label = r.fixedWinner
                  ? `${d.id}: Democratic-only ballot`
                  : `${d.id}: ${mode === "probability" ? (count ? `${((100 * winCounts[i]) / count).toFixed(1)}% ${r.independent ? "independent" : "Democratic"} win estimate` : "no retained samples yet") : `${margins[i] >= 0 ? "+" : ""}${margins[i].toFixed(1)} pp ${r.independent ? "I" : "D"} − R`}`;
                return (
                  <path
                    key={d.id}
                    data-district={d.id}
                    d={d.d}
                    fill={tallyColor(i)}
                    stroke={
                      selected === d.id
                        ? "#37295b"
                        : hover === d.id
                          ? "#ffda6f"
                          : "#fff"
                    }
                    strokeWidth={
                      selected === d.id ? 2 : hover === d.id ? 1.7 : 0.5
                    }
                    vectorEffect="non-scaling-stroke"
                    role="button"
                    tabIndex={selected === d.id ? 0 : -1}
                    aria-label={label}
                    onMouseEnter={() => !drag.current && setHover(d.id)}
                    onMouseLeave={() => setHover(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(d.id);
                      }
                    }}
                    onDoubleClick={() => {
                      onSelect(d.id);
                      fit([d]);
                    }}
                  >
                    <title>{label}</title>
                  </path>
                );
              })}
            </g>
            <path
              d={geometry.stateBorders}
              fill="none"
              stroke="#4f5877"
              strokeOpacity=".45"
              strokeWidth=".65"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            {view.k > 2.5 &&
              geometry.districts
                .filter((d) => d.state === selected.slice(0, 2))
                .map((d) => (
                  <text
                    key={d.id}
                    x={d.center[0]}
                    y={d.center[1]}
                    textAnchor="middle"
                    fontSize={11 / view.k}
                    fontWeight="650"
                    fill="#202c47"
                    stroke="#ffffffd9"
                    strokeWidth={3 / view.k}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {d.id}
                  </text>
                ))}
          </g>
        </g>
      </svg>
      <div className="map-hover-card">
        <b>{active}</b>
        <span>
          {race.fixedWinner
            ? "Democratic-only ballot"
            : mode === "probability"
              ? count
                ? `${((100 * winCounts[activeIndex]) / count).toFixed(1)}% challenger win estimate`
                : "Run the chain to estimate win probability"
              : `${margin >= 0 ? "+" : ""}${margin.toFixed(1)} pp · ${race.independent ? "Independent" : "Democratic"} − Republican`}
        </span>
      </div>
      <div className="district-map-caption">
        <span>Drag to pan · double-click a district to zoom</span>
        <span>AK & HI shown as insets</span>
      </div>
    </div>
  );
}
