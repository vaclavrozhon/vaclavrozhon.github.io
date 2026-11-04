import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.DEMO_URL || "http://127.0.0.1:8766/";
const text = (id) => page.getByTestId(id).innerText();
const iteration = async () =>
  Number((await text("house-iterations")).replaceAll(",", ""));
const checkZeroStart = async () => {
  assert.equal(await iteration(), 0);
  assert.equal(await text("house-national"), "+0.0 pp");
  assert.deepEqual(
    await page.locator("[data-latent] b").allTextContents(),
    Array(435).fill("+0.0"),
  );
  assert.equal(
    await page
      .locator("[data-district]")
      .evaluateAll(
        (nodes) => new Set(nodes.map((node) => node.getAttribute("fill"))).size,
      ),
    1,
  );
  assert.equal(await text("house-dem-seats"), "—");
  assert.equal(await text("house-rep-seats"), "—");
  assert.equal(await text("house-retained"), "0");
};
try {
  await page.goto(url);
  await page.locator("#house-run:not([disabled])").waitFor();
  assert.equal(
    await page.title(),
    "Who will control the House? · Metropolis Lab",
  );
  assert.equal(await page.locator("[data-district]").count(), 435);
  assert.equal(await text("house-retained"), "0");
  assert.equal(page.workers().length, 1);
  assert.equal(await page.locator(".house-controls button").count(), 3);
  assert.equal(
    await page
      .locator('select,input[type="range"],input[type="checkbox"]')
      .count(),
    0,
  );
  assert.equal(await page.locator("details[open]").count(), 0);
  await checkZeroStart();
  await page.locator("#house-step").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="house-iterations"]').textContent ===
      "500",
  );
  assert.equal(await text("house-retained"), "0");
  assert.notEqual(await text("house-acceptance"), "—");
  assert.ok(
    (await page.locator("[data-latent] b").allTextContents()).some(
      (value) => value !== "+0.0",
    ),
  );
  await page.locator('[data-district="SD-AL"]').click();
  assert.equal(await page.locator(".map-hover-card b").innerText(), "SD-AL");
  await page.locator('[data-district="SD-AL"]').dblclick();
  assert.notEqual(
    await page.locator(".district-map-tools span").innerText(),
    "1.0×",
  );
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.locator("#house-run").click();
  // Inspect and zoom while full-vector proposals run in the worker.
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector('[data-testid="house-iterations"]')
          .textContent.replaceAll(",", ""),
      ) >= 25000,
    {},
    { timeout: 60000 },
  );
  await page.locator("#house-run").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#house-run").textContent === "Start Metropolis",
  );
  const paused = await iteration();
  await page.waitForTimeout(250);
  assert.equal(await iteration(), paused);
  assert.equal(
    Number((await text("house-retained")).replaceAll(",", "")),
    Math.floor((paused - 20000) / 100),
  );
  const probabilities = await Promise.all(
    ["house-dem", "house-rep", "house-independent"].map(text),
  );
  assert.ok(
    Math.abs(probabilities.reduce((sum, p) => sum + parseFloat(p), 0) - 100) <
      0.2,
  );
  await page.locator("#house-step").click();
  await page.waitForFunction(
    (expected) =>
      Number(
        document
          .querySelector('[data-testid="house-iterations"]')
          .textContent.replaceAll(",", ""),
      ) === expected,
    paused + 500,
  );
  assert.ok((await page.locator(".recharts-bar-rectangle").count()) > 0);
  assert.equal(await page.locator(".house-error").count(), 0);
  console.log(
    "PASS simple controls, worker sampling, warm-up/thinning, majority probabilities, and map zoom",
  );

  await page.locator("#house-latents summary").click();
  assert.equal(await page.locator("[data-latent]").count(), 435);
  await page.locator('[data-latent="PA-07"]').click();
  assert.equal(
    await page.locator('[data-latent="PA-07"]').getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#house-latents summary").click();
  await page.locator("#house-model summary").click();
  assert.equal(await page.locator(".katex-error").count(), 0);
  assert.ok(
    (await page.locator(".house-model-copy").innerText()).includes(
      "Only the 435",
    ),
  );
  await page.locator("#house-model summary").click();
  await page.locator("#house-data summary").click();
  const tables = page.locator(".house-data-scroll tbody");
  for (const [i, count] of [435, 60, 31].entries())
    assert.equal(await tables.nth(i).locator("tr").count(), count);
  for (const filename of [
    "house-polls-2026.csv",
    "national-polls-2026.csv",
    "house-baselines-2026.csv",
    "house-districts-2026.geojson",
  ])
    assert.equal(
      (
        await page.request.get(new URL("./data/" + filename, url).href)
      ).status(),
      200,
    );
  await page.locator("#house-data summary").click();
  await page.screenshot({
    path: "/tmp/house-simple-desktop.png",
    fullPage: true,
  });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Overflow at ${width}`,
    );
    assert.equal(await page.locator("#house-run").isVisible(), true);
    await page.locator("#house-model summary").click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Model overflow at ${width}`,
    );
    await page.locator("#house-model summary").click();
  }
  await page.screenshot({
    path: "/tmp/house-simple-mobile.png",
    fullPage: true,
  });
  console.log(
    "PASS latent variables, Bayesian formulas, source tables/downloads and responsive layouts",
  );

  await page.locator("#house-run").click();
  await page.locator("#house-reset").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="house-iterations"]').textContent ===
        "0" && !document.querySelector("#house-run").disabled,
  );
  await page.waitForTimeout(200);
  await checkZeroStart();
  await page.locator('a[href="#senate"]').click();
  await page
    .getByRole("heading", { name: "Who will control the Senate?" })
    .waitFor();
  assert.equal(page.workers().length, 0);
  await page.locator('a[href="#house"]').click();
  await page.locator("#house-run:not([disabled])").waitFor();
  await checkZeroStart();
  await page.goto(
    "http://127.0.0.1:8765/teaching/us-election-demo/build/#house",
  );
  await page.locator("#house-run:not([disabled])").waitFor();
  await page.locator("#house-step").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="house-iterations"]').textContent ===
      "500",
  );
  assert.equal(await page.locator(".house-error").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS reset during sampling, House/Senate navigation, worker cleanup and nested hosting",
  );
} finally {
  await browser.close();
}
