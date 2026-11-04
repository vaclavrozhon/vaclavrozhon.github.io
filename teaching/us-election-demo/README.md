# 2026 elections · Metropolis Lab

English, browser-local classroom demo. The map samples all 35 Senate elections in 2026, including the Florida and Ohio special elections. The 65 seats not up are fixed at 34 Democratic-caucus seats (including King and Sanders) and 31 Republican seats. Democratic control requires 51 seats; Republican control requires 50 with the Republican vice president. New independent winners in Idaho, Montana, Nebraska, and South Dakota remain unaligned by default; a separate scenario control can assign them to either caucus.

## Run

```sh
npm install
npm run build
python3 -m http.server 8766 --bind 127.0.0.1 --directory build
```

Open <http://127.0.0.1:8766/> for House, or <http://127.0.0.1:8766/#senate> for Senate. The production build also works at `/teaching/us-election-demo/build/` under a repository-root server. Assets and downloadable CSVs use relative URLs. `build/` is ignored by the existing repository configuration; rebuild it after source changes. No runtime poll fetch or external CSS service is required.

## Data snapshot

Poll fieldwork ends October 1–November 2, 2026; downloaded November 3. The bundled snapshot contains **200 state polls in 25 states and 31 national generic-ballot polls**. Ten races have no qualifying poll in the selected source/window and use the hierarchical prior. These are pre-election inputs, not results. This is not Silver Bulletin's forecast.

- [Silver Bulletin's public midterm polling table](https://www.natesilver.net/p/nate-silver-2026-midterm-election-polls-model), which draws on the NYT poll database. Its public embedded table links the CSV used by the importer.
- [Silver Bulletin generic-ballot polls](https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls), using the publicly linked downloadable spreadsheet.
- [FEC official 2024 presidential results](https://www.fec.gov/resources/cms-content/documents/2024presgeresults.xlsx), for state relative leans. The national D−R margin is −1.471909 pp, including DC in the national calculation.
- [Official Senate party lineup and seats up](https://www.dailypress.senate.gov/on-the-floor/senate-facts/) and [vice-presidential tie-breaking](https://www.senate.gov/legislative/TieVotes.htm).

Selection is deterministic: latest poll per firm per race within the window, with a known positive sample size and the latest actual candidate pairing. National same-date variants prefer likely voters, then registered voters, then adults, then larger samples. Senate same-date ties use larger samples. State pairings come from the latest source row, selecting the named independent in ID/MT/NE/SD and the Democratic candidate elsewhere; the largest Republican share identifies the leading Republican. Obsolete hypothetical pairings are excluded. We use raw displayed margins, not adjusted averages, forecast probabilities, or Silver Bulletin influence weights. Partisan-sponsor flags, sample populations, field dates, and individual source links remain visible.

The public Silver table only includes races meeting its own coverage threshold. Thus “prior only” does not claim that no poll exists anywhere. The model ignores third-place candidates and approximates Alaska ranked-choice transfers and runoffs as a two-leading-candidate contest. It does not estimate independents' future caucus decisions from polling data.

Normalized data live in `src/data/snapshot2026.json`, with downloadable exports in `public/data/*-2026.csv` and `race-baselines-2024.csv`. The old 2024 CSV files are retained but are not loaded by the new demo.

To reproduce or intentionally refresh the snapshot (requires Python `requests` and `openpyxl`):

```sh
python3 scripts/update_data.py --as-of 2026-11-02 --since 2026-10-01
```

The live upstream spreadsheets can change; the checked-in normalized snapshot is the reproducible input for this lesson. Review candidate pairings and data counts before accepting any later refresh. The importer keeps download URLs alongside source labels. `--cache /path` can reuse downloaded `silver-polls.csv`, `silver-generic.csv`, and `fec2024.xlsx`.

## Model

All margins and standard deviations are in percentage points. Normal distributions below use variance as the second argument:

```text
g ~ Normal(0, 8²)                   national environment
b ~ Normal(0, 2.5²)                 shared poll bias
r[k] ~ Normal(0, 2²)                four regional swings
h[p] ~ Normal(0, 1.5²)              one effect per pollster name
mu[i] ~ Normal(lean[i] + g + r[k(i)], 5²)

state poll y[j] ~ Normal(mu[state(j)] + b + h[pollster(j)], sigma[j]²)
national poll z[j] ~ Normal(g + b + h[pollster(j)], sigma[j]²)
sigma[j]² = (10000 / sample[j] + 2²) / 2^(-ageDays[j] / 21)
```

`lean[i]` is the state’s 2024 presidential D−R margin minus the national margin. It is an explicitly rough opposition-lean proxy for independent challengers. State prior SD defaults to **5**, and is adjustable. The model has 134 latent variables with all effects enabled: 35 state margins, g, b, 4 regional effects, and 93 pollster effects. Effect toggles fix removed effects at zero and reset the sampler. These spreads, priors, regional groups, poll noise floor, and recency rule are educational assumptions, not empirically calibrated forecast parameters.

The generic ballot measures a national latent environment, not a population-weighted mean of the particular states holding Senate races. Polls constrain g+b, while shared biases and regional shifts correlate state outcomes. All latent terms are Gaussian, so this model has a multivariate Gaussian posterior; converting correlated margins to wins, seats, and control is nonlinear.

## Sampler

`src/model.mjs` implements Metropolis in log space. Symmetric proposals mix single-coordinate moves (75%), a national block (15%: all margins and g shift together while b shifts oppositely), and a regional block (10%). With regions disabled, that 10% becomes coordinate proposals. The corresponding reverse move has the same probability; no Hastings correction is needed. Incremental factor updates are checked against complete posterior scoring in tests.

The initial state blends state priors with poll measurements; it is not counted as a posterior draw. Discard 15,000 proposals, then retain every 50th state, including repeated states after rejection. Statistics accumulate over all retained draws; only the displayed trace is bounded to the last 220 points. Samples are correlated, and thinning is not a convergence guarantee. There is no automatic claim of convergence. Reset/re-run to compare estimates.

## Checks

```sh
node --test tests/model.test.mjs
PLAYWRIGHT_MODULE=/tmp/hmm-gridworld-qa/node_modules/playwright/index.mjs node tests/browser-smoke.mjs
```

Model tests check input provenance and selection invariants, chamber arithmetic and independent scenarios, Gaussian parameters, incremental acceptance ratios, rejection/warm-up bookkeeping, and sampled moments against an analytically solved correlated Gaussian posterior. Browser tests cover sampling, model resets, controls, map interaction, data downloads, relative deployment paths, and responsive layouts.

## House · simplified classroom view

The default URL and `#house` open the district map. `#senate` preserves the
Senate demo above. The House interface follows the earlier presidential demo:
Start/Pause, Step ×500, Reset, the current map, and a Democratic-seat histogram.
Current biases, Bayesian formulas, and the three evidence tables are collapsible.
There are no model toggles, sampler sliders, alternate map layouts, or probability
map modes. Geographic zoom/pan and district selection remain available.

The bundled House snapshot has 435 baselines, 60 district polls in 35 districts,
and 31 national polls, with fieldwork through November 2, 2026. Baselines are
The Downballot's rounded 2024 presidential margins on 2026 district lines.
The existing snapshot is reused; this UI change does not refresh source data.

### House target density

The Markov state is exactly the 435 actual district biases μᵢ (D−R pp; I−R
in Alaska). With mᵢ the district's 2024 presidential margin:

```text
g ~ Normal(0, 8²)
mu[i] | g ~ Normal(m[i] + g, 5²)
b ~ Normal(0, 2.5²)
local poll y[j] | mu,b ~ Normal(mu[district(j)] + b, sigma[j]²)
national poll z[k] | mu,b ~ Normal(mean(mu) + b, sigma[k]²)
sigma[j]² = (10000 / sample[j] + 2²) / 2^(-ageDays[j] / 21)
```

All normal distributions use variance as the second argument. National evidence
uses the equal-weight district mean as a rough national-turnout proxy. All 435
biases enter this average, including a generic preference proxy for the two
Democratic-only races and the independent challenge in Alaska. Seats for the
same-party races are fixed D; an independent Alaska win is unaligned.

The common national swing g and common polling error b are **integrated out
analytically**, not held fixed or sampled by extra moves. The resulting prior
covariance is `5² I + 8² 11ᵀ`. The joint poll covariance is
`diag(sigma²) + 2.5² 11ᵀ`, across BOTH local and national polls. Thus the target
is a nonfactorizing 435-dimensional Gaussian posterior. The implementation uses
rank-one inverse formulas, so evaluating its log density takes O(districts +
polls). Turning correlated biases into seat counts and a majority is nonlinear.

### House proposal and bookkeeping

Each iteration proposes **all districts at once**, independently:

```text
mu'[i] = mu[i] + epsilon[i],   epsilon[i] iid Normal(0, 0.5²)
accept the entire vector with min(1, exp(logPosterior(mu') - logPosterior(mu)))
```

The Gaussian proposal is symmetric; no Hastings correction, clipping,
coordinate updates, shared proposal increment, regional blocks, or adaptive
kernel are used. A rejection retains the entire old map.

The chain starts with zero bias in every district, including after Reset.
The map displays the warm-up from this neutral state; the historical prior and
poll likelihoods still determine the target density. The initial state is not
counted as a posterior draw. Discard 20,000 proposals, then
retain every 100th state, including repetitions after rejection. The histogram
and control frequencies retain all draws, and its displayed extent includes
every occupied bin. Sampling happens in 500-proposal Web Worker bursts. Reset
stops the worker loop and clears counts; leaving House terminates the worker.
The UI reports correlated draws, not certified convergence or a calibrated
forecast. Parameter assumptions are fixed for this teaching demo.

Boundary source: [Census TIGERweb 120th Congressional Districts](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0). The [Census documentation](https://www.census.gov/programs-surveys/decennial-census/about/rdo/congressional-districts.120th_Congress.html) warns that its Missouri geometry predates a court decision. The preview substitutes all eight Missouri shapes from the 119th layer and their corresponding 2024-line baselines. Other states use the 120th layer. DC and territorial non-voting delegates are excluded. Geometry is simplified with a 0.004-degree maximum offset, projected to Albers USA (AK/HI insets), and clipped to the `us-atlas` land outline for display. The downloadable GeoJSON retains the Census geographic coordinates; `house-map.json` is a preprojected display asset.

[The Downballot data and attribution](https://www.the-downballot.com/p/the-downballots-calculations-of-presidential) and each poll's source link are included in the UI. Poll selection uses the Senate snapshot's date window, latest firm/race sample, and latest actual pairing. Alaska uses Hill (I) against Begich (R), remaining unaligned on a win. CA-11 and CA-34 are counted as Democratic seats based on the same-party ballot shown in the source. CA-06 treats Kiley as the Republican-caucus opponent. Other minor-party candidates, unopposed contests, candidate quality, runoff and ranked-choice mechanics are not exhaustively modeled. This is an exploratory classroom preview, not a calibrated forecast or an address-to-district lookup.

To regenerate House data/geometry intentionally:

```sh
python3 scripts/update_house.py
node scripts/build_house_map.cjs
npm run build
```

The importer uses the Senate snapshot's date window and national polls. `--cache
/tmp` can reuse raw downloads. Source files are `src/data/house2026.json`,
`src/data/house-map.json`, and `public/data/house-*.csv` / `.geojson`.

`npm run build` and `npm start` prepare native ES modules from `src/house.worker.js`,
`src/house-model.mjs`, and the common utilities in `src/model.mjs`. The generated
public worker/model modules are ignored by Git. Poll data are embedded, so the
worker works at both root and nested URLs without remote requests.

House checks:

```sh
node --test tests/model.test.mjs tests/house-model.test.mjs
PLAYWRIGHT_MODULE=/tmp/hmm-gridworld-qa/node_modules/playwright/index.mjs node tests/house-browser-smoke.mjs
```

Tests compare the marginalized log density to independently inverted covariance
matrices, verify Gaussian proposal moments/independence and whole-map rejection,
and compare sampled moments to an analytic posterior. Data/seat checks cover
all 435 joins, Missouri alignment, fixed D seats and the 218-seat threshold.
Browser checks cover the simpler controls, worker reset/pause, warm-up/counting,
map interaction, formulas, sources, responsive layouts and nested hosting.
