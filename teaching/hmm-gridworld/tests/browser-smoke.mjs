import assert from "node:assert/strict";
import { Experiment, makeTown } from "../model.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const text = (id) => page.locator(`#${id}`).innerText();
const slider = (id, value) =>
  page.locator(`#${id}`).evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, String(value));
const drawing = () => page.locator("#map").innerHTML();
try {
  await page.goto(
    process.env.DEMO_URL || "http://127.0.0.1:8765/teaching/hmm-gridworld/",
  );
  await page.locator(".car-marker").waitFor();
  assert.equal(await text("time"), "0");
  assert.equal(await page.locator("select").count(), 0);
  assert.equal(await page.locator(".toolbar button").count(), 3);
  assert.equal(await page.locator('input[type="checkbox"]').count(), 3);
  assert.equal(await page.locator(".town-bridge").count(), 2);
  assert.equal(await page.locator("#history").getAttribute("max"), "60");
  const initial = await drawing();
  const history = [initial];
  for (let t = 1; t <= 15; t++) {
    await page.locator("#next").click();
    assert.equal(await text("time"), String(t));
    assert.equal(
      await page.locator(".gps-observations circle title").count(),
      t + 1,
    );
    history.push(await drawing());
  }
  await slider("history", 7);
  assert.equal(await drawing(), history[7]);
  await page.keyboard.press("ArrowRight");
  assert.equal(await drawing(), history[8]);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await drawing(), history[7]);
  console.log(
    "PASS simplified controls, stepping, keyboard, and prefix-only history",
  );

  const beforeNoise = await drawing();
  const route = await page
    .locator(".truth-path polyline")
    .getAttribute("points");
  const view = await page.locator("#map").getAttribute("viewBox");
  await slider("sigma", 0.3);
  assert.equal(
    await page.locator(".truth-path polyline").getAttribute("points"),
    route,
  );
  assert.notEqual(await drawing(), beforeNoise);
  assert.notEqual(await page.locator("#map").getAttribute("viewBox"), view);
  await slider("sigma", 2);
  assert.equal(await drawing(), beforeNoise);
  for (let mask = 0; mask < 8; mask++) {
    const gps = Boolean(mask & 1),
      truth = Boolean(mask & 2),
      viterbi = Boolean(mask & 4);
    await page.locator("#show-gps").setChecked(gps);
    await page.locator("#show-truth").setChecked(truth);
    await page.locator("#show-viterbi").setChecked(viterbi);
    assert.equal(await page.locator(".gps-observations").count(), Number(gps));
    assert.equal(await page.locator(".truth-path").count(), Number(truth));
    assert.equal(await page.locator(".car-marker").count(), Number(truth));
    assert.equal(await page.locator(".viterbi-path").count(), Number(viterbi));
    if (!truth)
      assert.equal(
        await text("journey-status"),
        "Linden Town · 60-second trip",
      );
    assert.equal(
      await page.locator(".map-revision, #revision-status").count(),
      0,
    );
    assert.equal(await text("time"), "7");
    assert.equal(await page.locator("#map").getAttribute("viewBox"), view);
  }
  assert.equal(await drawing(), beforeNoise);
  console.log(
    "PASS all visibility combinations, repeatable noise scaling, and fixed map framing",
  );

  const town = makeTown();
  const overlays = () =>
    page
      .locator(".truth-path, .viterbi-path, .gps-observations, .car-marker")
      .evaluateAll((nodes) => nodes.map((node) => node.outerHTML));
  const beforeView = await overlays();
  await page.locator("#view-chain").click();
  assert.equal(await page.locator(".town-art").count(), 0);
  assert.equal(await page.locator(".chain-state").count(), town.cells.length);
  assert.equal(await page.locator(".chain-loop").count(), town.cells.length);
  assert.equal(
    await page.locator(".chain-edge").count(),
    (town.outgoing.flat().length - town.cells.length) / 2,
  );
  assert.equal(
    await page.locator("#view-chain").getAttribute("aria-pressed"),
    "true",
  );
  assert.deepEqual(await overlays(), beforeView);
  for (const [x, y, choices] of [
    [0, 6, 2],
    [3, 3, 3],
    [4, 3, 4],
    [6, 3, 5],
    [10, 3, 3],
  ]) {
    const id = town.cells.findIndex((p) => p.x === x && p.y === y);
    const node = page.locator(`[data-state="${id}"]`);
    await node.click();
    // After pointer selection, focus remains even when the cursor leaves.
    // Chrome's default SVG focus outline would cover a large part of the map.
    await page.mouse.move(10, 10);
    assert.deepEqual(
      await node.evaluate((element) => ({
        focused: document.activeElement === element,
        hovered: element.matches(":hover"),
        outline: getComputedStyle(element).outlineStyle,
      })),
      { focused: true, hovered: false, outline: "none" },
    );
    assert.equal(await page.locator(".selected-transition").count(), choices);
    assert.ok((await text("chain-state-info")).includes(`1/${choices} each`));
    const targets = await page
      .locator(".selected-transition")
      .evaluateAll((edges) =>
        edges.map((edge) => ({
          to: Number(edge.dataset.to),
          p: Number(edge.dataset.probability),
        })),
      );
    assert.deepEqual(
      targets.map((edge) => edge.to),
      town.outgoing[id],
    );
    assert.ok(targets.every((edge) => edge.p === 1 / choices));
    await node.click();
    assert.equal(await node.getAttribute("aria-pressed"), "false");
    assert.equal(
      await page.locator('.chain-state[aria-pressed="true"]').count(),
      0,
    );
    assert.equal(await page.locator(".chain-selection > *").count(), 0);
    assert.equal(await page.locator("#chain-state-info").isVisible(), false);
    assert.deepEqual(await overlays(), beforeView);
    assert.equal(await page.locator(".path-initial-probability").count(), 1);
    assert.equal(await page.locator(".path-emission-weight").count(), 8);
    await node.click();
    assert.equal(await node.getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator(".selected-transition").count(), choices);
  }
  const firstNode = page.locator('[data-state="0"]');
  await firstNode.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert.deepEqual(
    await firstNode.evaluate((element) => ({
      visible: element.matches(":focus-visible"),
      stroke: getComputedStyle(element).stroke,
    })),
    { visible: true, stroke: "rgb(139, 125, 224)" },
  );
  await page.keyboard.press("Enter");
  assert.equal(await firstNode.getAttribute("aria-pressed"), "true");
  await page.keyboard.press("Space");
  assert.equal(await firstNode.getAttribute("aria-pressed"), "false");
  assert.equal(await page.locator(".selected-transition").count(), 0);
  await page.keyboard.press("Enter");
  assert.equal(await firstNode.getAttribute("aria-pressed"), "true");
  assert.equal(
    await page.locator("#play").getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(await text("time"), "7");
  await page.locator("#next").click();
  assert.equal(await text("time"), "8");
  await slider("history", 7);
  await page.locator("#view-map").click();
  assert.equal(await page.locator(".chain-art").count(), 0);
  assert.equal(await page.locator("#chain-info").isVisible(), false);
  assert.equal(await drawing(), beforeNoise);
  console.log(
    "PASS exact chain topology, self-loops, source-dependent probabilities, keyboard selection and unchanged evidence",
  );

  await page.locator("#view-chain").click();
  for (const [time, sigma] of [
    [0, 2],
    [17, 2],
    [17, 0.3],
    [60, 2],
    [60, 3],
  ]) {
    await slider("history", time);
    await slider("sigma", sigma);
    const experiment = new Experiment({ sigma }),
      path = experiment.inference(time);
    assert.equal(
      await page.locator(".path-initial-probability text").textContent(),
      "1/93",
    );
    const steps = await page
      .locator(".path-transition-probability")
      .evaluateAll((nodes) =>
        nodes
          .flatMap((node) =>
            node.dataset.times.split(",").map((t) => ({
              time: Number(t),
              from: Number(node.dataset.from),
              to: Number(node.dataset.to),
              probability: Number(node.dataset.probability),
            })),
          )
          .sort((a, b) => a.time - b.time),
      );
    assert.equal(steps.length, time);
    for (const [i, step] of steps.entries()) {
      assert.equal(step.time, i + 1);
      assert.equal(step.from, path[i]);
      assert.equal(step.to, path[i + 1]);
      assert.equal(
        step.probability,
        1 / experiment.grid.outgoing[path[i]].length,
      );
    }
    const emissions = await page
      .locator(".path-emission-weight")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          time: Number(node.dataset.time),
          scaled: Number(node.dataset.scaledDistance),
        })),
      );
    assert.equal(emissions.length, time + 1);
    for (const emission of emissions) {
      const p = experiment.grid.cells[path[emission.time]],
        o = experiment.observations[emission.time];
      assert.ok(
        Math.abs(emission.scaled - Math.hypot(p.x - o.x, p.y - o.y) / sigma) <
          1e-12,
      );
    }
    const connectors = await page
      .locator(".gps-association")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          time: Number(node.dataset.time),
          x1: Number(node.getAttribute("x1")),
          y1: Number(node.getAttribute("y1")),
          x2: Number(node.getAttribute("x2")),
          y2: Number(node.getAttribute("y2")),
        })),
      );
    const blue = await page
      .locator(".viterbi-path circle:not(.viterbi-endpoint)")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          x: Number(node.getAttribute("cx")),
          y: Number(node.getAttribute("cy")),
        })),
      );
    assert.equal(connectors.length, time + 1);
    for (const link of connectors) {
      assert.deepEqual({ x: link.x1, y: link.y1 }, blue[link.time]);
      const observation = experiment.observations[link.time];
      assert.ok(Math.abs(link.x2 - observation.x) < 1e-12);
      assert.ok(Math.abs(link.y2 - observation.y) < 1e-12);
    }
    if (sigma === 2 && time > 0) {
      const overlaps = await page
        .locator(".path-factor-label text")
        .evaluateAll((nodes) => {
          const boxes = nodes.map((node) => node.getBBox());
          return boxes.flatMap((a, i) =>
            boxes
              .slice(i + 1)
              .filter(
                (b) =>
                  Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) &&
                  Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y),
              ),
          );
        });
      assert.equal(overlaps.length, 0, `Factor text overlaps at ${time} s`);
    }
    if (time === 17 && sigma === 2)
      await page.screenshot({
        path: "/tmp/hmm-factors-desktop.png",
        fullPage: true,
      });
  }
  await page.locator("#show-gps").uncheck();
  assert.equal(
    await page.locator(".gps-association, .path-emission-weight").count(),
    0,
  );
  assert.equal(await page.locator(".path-initial-probability").count(), 1);
  await page.locator("#show-viterbi").uncheck();
  assert.equal(await page.locator(".path-factors").count(), 0);
  assert.equal(await page.locator("#path-factor-info").isVisible(), false);
  await page.locator("#show-gps").check();
  await page.locator("#show-viterbi").check();
  await page.locator("#view-map").click();
  assert.equal(await page.locator(".path-factors, .path-evidence").count(), 0);
  await slider("sigma", 2);
  await slider("history", 7);
  assert.equal(await drawing(), beforeNoise);
  console.log(
    "PASS path priors, directed transition factors, same-time Gaussian weights, noise changes and layer visibility",
  );

  const hoverPoint = async (selector) => {
    const point = page.locator(selector).first();
    await point.scrollIntoViewIfNeeded();
    const box = await point.boundingBox();
    // Real pointer movement, even when a transparent MC button overlays a dot.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  };
  const linkedTimes = () =>
    page.locator(".pair-highlight").getAttribute("data-times");
  for (const mode of ["map", "chain"]) {
    await slider("history", 17);
    await page.locator(`#view-${mode}`).click();
    await page.mouse.move(10, 10);
    const unhovered = await drawing();
    const selected =
      mode === "chain"
        ? await page
            .locator('.chain-state[aria-pressed="true"]')
            .getAttribute("data-state")
        : null;
    await hoverPoint('.gps-point[data-time="0"]');
    assert.equal(await linkedTimes(), "0");
    assert.equal(
      await page.locator('.viterbi-point[data-time="0"].is-linked').count(),
      1,
    );
    assert.equal(await page.locator(".gps-point.is-linked").count(), 1);
    assert.equal(
      await page.locator('.pair-connector[data-time="0"]').count(),
      1,
    );
    assert.equal(
      await page.locator(".path-emission-weight.is-linked").count(),
      mode === "chain" ? 1 : 0,
    );
    if (mode === "chain")
      assert.equal(
        await page
          .locator('.chain-state[aria-pressed="true"]')
          .getAttribute("data-state"),
        selected,
      );
    await page.mouse.move(10, 10);
    assert.equal(await drawing(), unhovered);
    assert.equal(await page.locator("#pair-status").isVisible(), false);

    const repeatedTimes = await page
      .locator(".viterbi-point")
      .evaluateAll((nodes) => {
        const groups = new Map();
        for (const node of nodes) {
          const key = `${node.getAttribute("cx")},${node.getAttribute("cy")}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(Number(node.dataset.time));
        }
        return [...groups.values()].find((times) => times.length > 1);
      });
    assert.ok(
      repeatedTimes,
      "The test prefix must have a revisited/stationary blue point",
    );
    await hoverPoint(`.viterbi-point[data-time="${repeatedTimes[0]}"]`);
    assert.equal(await linkedTimes(), repeatedTimes.join(","));
    assert.deepEqual(
      await page
        .locator(".gps-point.is-linked")
        .evaluateAll((nodes) => nodes.map((n) => Number(n.dataset.time))),
      repeatedTimes,
    );
    assert.equal(
      await page.locator(".pair-connector").count(),
      repeatedTimes.length,
    );
    assert.equal(await page.locator(".viterbi-halo").count(), 1);
    if (mode === "chain")
      await page.screenshot({
        path: "/tmp/hmm-hover-chain.png",
        fullPage: true,
      });

    // A redraw under a stationary cursor must never retain old time indices.
    await slider("history", 1);
    assert.ok(
      (await linkedTimes())
        .split(",")
        .filter(Boolean)
        .every((t) => Number(t) <= 1),
    );
    await page.mouse.move(10, 10);
  }
  await page.locator("#show-viterbi").uncheck();
  await hoverPoint('.gps-point[data-time="0"]');
  assert.equal(await linkedTimes(), "0");
  assert.equal(await page.locator(".pair-connector, .viterbi-halo").count(), 0);
  await page.locator("#show-viterbi").check();
  await page.locator("#show-gps").uncheck();
  await hoverPoint('.viterbi-point[data-time="0"]');
  assert.equal(await page.locator(".viterbi-halo").count(), 1);
  assert.equal(await page.locator(".pair-connector, .gps-halo").count(), 0);
  await page.locator("#show-gps").check();
  await page.locator("#view-map").click();
  await slider("history", 7);
  await page.mouse.move(10, 10);
  assert.equal(await drawing(), beforeNoise);
  console.log(
    "PASS bidirectional hover, coincident blue points, linked factors, hidden layers, redraw and pointer leave",
  );

  await slider("history", 58);
  await page.locator("#play").click();
  await page.waitForFunction(
    () => document.getElementById("time").textContent === "60",
  );
  assert.equal(
    await page.locator("#play").getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(await page.locator("#play").isDisabled(), true);
  assert.equal(await page.locator("#next").isDisabled(), true);
  assert.equal(
    await page.locator(".gps-observations circle title").count(),
    61,
  );
  assert.equal(await text("journey-status"), "Trip complete · Library");
  // The final road segment goes south: right of travel is west of x = 4.
  const endPoints = await page
    .locator(".truth-path polyline")
    .getAttribute("points");
  const [endX, endY] = endPoints
    .trim()
    .split(" ")
    .at(-1)
    .split(",")
    .map(Number);
  assert.equal(endX, 3.89);
  assert.equal(endY, 12);
  assert.ok(
    (await page.locator(".car-marker").getAttribute("transform")).startsWith(
      "translate(3.89 12)",
    ),
  );
  await slider("sigma", 3);
  assert.equal(await page.locator("#outside-status").count(), 0);
  assert.ok(
    await page.locator("#map").evaluate((svg) => {
      const v = svg.viewBox.baseVal;
      return [...svg.querySelectorAll(".gps-point")].every((point) => {
        const x = point.cx.baseVal.value,
          y = point.cy.baseVal.value;
        return (
          x - 0.34 >= v.x &&
          x + 0.34 <= v.x + v.width &&
          y - 0.34 >= v.y &&
          y + 0.34 <= v.y + v.height
        );
      });
    }),
    "Every GPS point and its ring must fit at maximum noise",
  );
  await slider("sigma", 2);
  const full = await drawing();
  await page.locator("#restart").click();
  assert.equal(await drawing(), initial);
  await slider("history", 60);
  assert.equal(await drawing(), full);
  await slider("history", 7);
  assert.equal(await drawing(), history[7]);
  await page.locator("#show-truth").uncheck();
  await page.locator("#restart").click();
  assert.equal(await page.locator("#show-truth").isChecked(), false);
  await page.locator("#show-truth").check();
  await page.locator("#play").click();
  await page.waitForFunction(
    () => Number(document.getElementById("time").textContent) >= 2,
  );
  await page.locator("#play").click();
  const paused = await text("time");
  await page.waitForTimeout(1100);
  assert.equal(await text("time"), paused);
  console.log(
    "PASS 60-second endpoint, playback/pause, reset, preserved visibility and replay",
  );

  await slider("history", 60);
  for (const width of [1440, 900, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}`,
    );
    const map = await page.locator(".town-art").boundingBox();
    assert.ok(map.width > (width === 1440 ? 850 : width >= 768 ? 600 : 300));
    assert.equal(await page.locator("#next").isVisible(), true);
    assert.equal(await page.locator("#sigma").isVisible(), true);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `/tmp/hmm-simple-${width === 1440 ? "desktop" : "mobile"}.png`,
        fullPage: true,
      });
    await page.locator("#view-chain").click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Chain overflow at ${width}`,
    );
    assert.equal(await page.locator(".chain-state").count(), 93);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `/tmp/hmm-chain-${width === 1440 ? "desktop" : "mobile"}.png`,
        fullPage: true,
      });
    await page.locator("#view-map").click();
  }
  await page.reload();
  await page.locator(".car-marker").waitFor();
  assert.equal(await drawing(), initial);
  assert.deepEqual(errors, []);
  console.log(
    "PASS larger map, responsive layouts, deterministic reload and no browser errors",
  );
} finally {
  await browser.close();
}
