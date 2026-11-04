# Where is the car?

A standalone, buildless HMM teaching demo. Serve the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/teaching/hmm-gridworld/>. No external assets or
runtime dependencies are required. Jekyll serves this directory unchanged.

## One town, one route, one model

- Linden Town has 93 street positions, junctions, dead ends, and two bridges.
  `town.mjs` supplies the same street geometry to the graph and SVG artwork.
- `routes.mjs` defines one fixed, exactly 60-second trip: Station → Cafe
  (2-second stop) → Hospital → Harbor → Library. It loops around the northeast
  house before reaching the hospital, crossing the north bridge outward and
  the south bridge on the return.
  The trip contains 58 unit road moves, 2 waiting steps, and 61 observations
  including time zero. There is no route generator or route/model/map selector.
- The HMM state is position only. Waiting and every available neighboring
  street position are equally likely. The initial distribution is uniform.
  The decoder knows neither the route nor its stops, start, or destination.
- Map / Model changes the background to the exact inference graph,
  keeping state coordinates, observations, path overlays, time, and noise.
  All 93 states have a self-loop; each road edge has arrows both ways. Click
  or keyboard-select a node to highlight its outgoing transitions, each with
  probability `1 / (number of neighbors + 1)`. Activating the same node again
  clears its highlight and outgoing labels. The selected node is independent
  of the true position. `chain-art.mjs` reads the model's adjacency lists.
- In chain view, `path-factors.mjs` annotates the displayed Viterbi prefix:
  initial probability 1/93, source-dependent transition fractions (including
  waits), and faint same-time GPS connectors labeled `exp(-a^2)`, where
  `a = d/(sigma*sqrt(2))`. This absorbs the usual `/2` without changing the weight.
  Distances use raw model states, not the cosmetic lane offsets. Repeated
  directed transitions use powers; every observation has its own factor.
  These are joint-density factors, not posterior probabilities or odds. The
  common `(2*pi*sigma^2)^(-(t+1))` emission normalizer is omitted. GPS connectors
  follow the GPS and Viterbi visibility toggles; all factors disappear in Map
  view or when Viterbi is hidden. Labels avoid nodes and one another where
  possible. The map now uses the available page width without a viewport-height
  cap so these annotations have more room.
- Hovering either a GPS point or a Viterbi point highlights its same-time pair,
  connector and emission label. Coincident Viterbi time points highlight all
  corresponding observations. Screen-space hit testing works through the MC's
  transparent state buttons and makes the small blue markers easier to reach.
  Pairing works in both views, respects visibility, and updates after replay,
  noise or view changes; hover never changes the selected Markov state.
- Each observation adds independent Gaussian noise to x and y. A fixed seed
  makes reloads repeatable; the noise slider scales the same standardized draws
  without changing the true path. Observations remain unbounded.
- Viterbi uses log probabilities and source-dependent transition probabilities.
  Each prefix has its own stored scores/backpointers. Selecting a time uses only
  observations through that time, even though the full trip is precomputed.
  A new observation can revise any part of the most probable path so far.
- Controls: Next step, Play/Pause, Reset, the 0–60-second timeline, GPS noise,
  a Map / Model switch, and independent visibility toggles for GPS,
  truth, and Viterbi. Hiding a layer also hides its related status text.
- The map uses the full content width and fits all GPS points, including their
  rings, at the selected noise level. Framing stays fixed while stepping or
  toggling layers and expands when more noise needs more space. Coordinates
  are never clamped. No future points or path segments appear on the map.
- Displayed paths use travel-relative lanes: truth is 0.11 units right of the
  centerline, Viterbi 0.27 units left. Opposite passes occupy opposite lanes;
  unequal offsets keep a true pass separate from an opposite inferred pass.
  Right-angle joins and rounded U-turns connect the lanes, with car, inferred
  points, and endpoint following their own path. Waits preserve
  heading. `lane-geometry.mjs` only transforms the displayed prefix; model
  states, tooltips, GPS observations, and Markov graph coordinates are unchanged.
- Playback advances one simulated second per real second, immediately on start.
  It stops at 60 seconds, on reset, timeline/noise changes, or tab hiding.
  Reset preserves noise and visibility. Right/left arrows step; space toggles
  playback when focus is outside an interactive control. UI text is English.

## Validation

```sh
node teaching/hmm-gridworld/tests/model.test.mjs
node teaching/hmm-gridworld/tests/lane-geometry.test.mjs
node teaching/hmm-gridworld/tests/path-factors.test.mjs
PLAYWRIGHT_MODULE=/tmp/hmm-gridworld-qa/node_modules/playwright/index.mjs node teaching/hmm-gridworld/tests/browser-smoke.mjs
```

Model checks cover the exact route/stop schedule, legal moves and normalized
transitions, exhaustive Viterbi verification, prefix isolation, noise scaling,
and deterministic replay. Browser checks cover playback through the endpoint,
reset/history, layer visibility, noise, fixed map framing, and responsive layouts.
Optional browser variables: `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `DEMO_URL`.
