# Markov chain teaching widgets

Static HTML, React and canvas; no build step. Serve the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/teaching/markov_chains/>. The page loads React,
Babel and Chart.js from CDNs, so the browser needs an internet connection.

## Simulation behaviour

- **Step** commits one transition after its animation. **Run** adds exactly the
  requested number of steps. **Stop** lets the current transition finish.
- **Reset**, a change to the number of dots, or any model control/editor restarts
  at time 0 and clears generated words and absorption statistics. Changing the
  number of dots preserves the selected model's parameters.
- Speed and camera changes preserve the experiment. **Fit** fits the whole graph;
  use +/− and drag to inspect dense graphs. Window resizing refits the graph.
- Histogram bars use **all dots** as the denominator. Unfinished trials are
  reported separately; the displayed mean and population standard deviation
  describe completed trials only until all dots have finished.
- The distribution table is the exact evolution from the current initial
  distribution, independent of the Monte Carlo sample size.

## Code structure

`js/MarkovChain.js` owns sampling, animation commits, reset, first absorption
times and graph drawing. `js/WordMarkovChain.js` shares CSV caching and word
emission between the two English examples. Characters are emitted on committed
transitions, including self-loops. `js/app.jsx` owns the run budget, restart
policy for model controls, camera and statistics UI.

Each class in `chains/` supplies `static meta` for the sidebar so listing models
does not construct them. Model controls replace their transition matrix or
initial-distribution array; the UI then resets the simulation. Replacing these
arrays also invalidates the exact-distribution cache. Do not modify cached
matrix/distribution arrays in place.

The bigram layout retains all 730 states, including contexts never observed in
the corpus. Its 122 empty transition rows are unreachable from the start state;
the tests check probability conservation on reachable states. The final
absorbing state is `</s></s>`.

## Regression checks

From the repository root, using Node.js 18 or later:

```sh
node --test teaching/markov_chains/tests/models.test.cjs
```

The browser checks require Python's `playwright` package and a Playwright
Chromium installation. With the server running:

```sh
python teaching/markov_chains/tests/browser_smoke.py
```

Use `--chromium /path/to/chrome` for an existing browser, `--url URL` for a
different server, and `--screenshots /tmp/markov-screenshots` to save previews.
The checks cover all examples, run/reset and model changes, mapping edits,
word generation, histogram normalization, CSV caching/failure recovery, large
matrix pagination and narrow layouts.
