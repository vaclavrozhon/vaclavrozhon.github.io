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
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const url = process.env.DEMO_URL || "http://127.0.0.1:8766/#senate";
const read = (id) => page.getByTestId(id).innerText();

try {
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Who will control the Senate?" })
    .waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await read("iterations"), "0");
  assert.equal(await read("dem-probability"), "—");
  assert.equal(await page.locator('.us-map path[role="button"]').count(), 35);
  assert.equal(await page.locator(".seat-strip i").count(), 100);
  assert.equal(await page.locator(".katex-error").count(), 0);
  assert.equal(await page.locator("#prior-sd").inputValue(), "5");
  await page.locator("#step").click();
  assert.equal(await read("iterations"), "1");
  assert.equal(await read("retained"), "0 retained draws");
  assert.ok(
    /ACCEPTED|REJECTED/.test(
      await page.locator(".proposal-result").innerText(),
    ),
  );
  await page.locator("#batch").click();
  assert.equal(await read("iterations"), "20,001");
  assert.equal(await read("retained"), "100 retained draws");
  const probabilities = await Promise.all(
    ["dem-probability", "rep-probability", "pivotal-probability"].map(read),
  );
  assert.ok(
    Math.abs(probabilities.reduce((sum, p) => sum + parseFloat(p), 0) - 100) <
      0.2,
  );
  console.log(
    "PASS initial map, 35 races, single proposal, burn-in and posterior sampling",
  );
  await page
    .getByRole("button", { name: "Win probability", exact: true })
    .click();
  await page.locator("#selected-race").selectOption("NE");
  assert.ok(
    (await page.locator(".race-inspector").innerText()).includes("Osborn (I)"),
  );
  await page.locator("#selected-race").selectOption("WY");
  assert.ok(
    (await page.locator(".race-inspector").innerText()).includes("Prior only"),
  );
  await page.getByRole("button", { name: "Current draw", exact: true }).click();
  await page.locator("#selected-race").selectOption("TX");
  await page.locator('.us-map path[aria-label^="Alaska:"]').click();
  assert.equal(await page.locator("#selected-race").inputValue(), "AK");
  await page.getByLabel("Shared polling error", { exact: false }).uncheck();
  assert.equal(await read("iterations"), "0");
  assert.equal(await read("dem-probability"), "—");
  assert.ok((await page.locator(".dimensions").innerText()).includes("133"));
  await page.getByLabel("Shared polling error", { exact: false }).check();
  // Native keyboard interaction exercises React's controlled range event handling.
  await page.locator("#prior-sd").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#prior-sd").inputValue(), "5.5");
  await page.keyboard.press("ArrowLeft");
  await page.locator("#caucus").selectOption("dem");
  assert.equal(await read("iterations"), "0");
  await page.locator("#caucus").selectOption("unaligned");
  await page.locator("#run").click();
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector('[data-testid="iterations"]')
          .textContent.replaceAll(",", ""),
      ) >= 5000,
  );
  await page.locator("#run").click();
  const stopped = await read("iterations");
  await page.waitForTimeout(300);
  assert.equal(await read("iterations"), stopped);
  await page.locator("#reset").click();
  assert.equal(await read("iterations"), "0");
  console.log(
    "PASS model toggles reset estimates, prior SD, independent scenarios, map and pause/reset",
  );
  for (const name of [
    "State Senate polls",
    "National generic-ballot polls",
    "2024 baseline and all 35 races",
  ]) {
    await page.locator("summary").filter({ hasText: name }).click();
  }
  assert.equal(await page.locator(".data-card table tbody tr").count(), 266);
  for (const file of [
    "senate-polls-2026.csv",
    "national-polls-2026.csv",
    "race-baselines-2024.csv",
  ]) {
    const response = await page.request.get(
      new URL(`./data/${file}`, url).href,
    );
    assert.equal(response.status(), 200);
    assert.ok(
      (await response.text()).includes("state") || file.startsWith("national"),
    );
  }
  await page
    .getByRole("button", { name: "Show all current latent variables" })
    .click();
  assert.equal(await page.locator(".latent-grid>div").count(), 134);
  await page
    .getByRole("button", { name: "Hide all current latent variables" })
    .click();
  while (await page.locator(".data-card details[open] summary").count())
    await page.locator(".data-card details[open] summary").first().click();
  console.log(
    "PASS source tables, complete latent inspector and all CSV downloads",
  );
  await page.locator("#batch").click();
  await page.locator("#selected-race").selectOption("TX");
  await page.screenshot({
    path: "/tmp/senate-metropolis-desktop.png",
    fullPage: true,
  });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Page overflow at ${width}px`,
    );
    assert.ok(await page.locator("#run").isVisible());
  }
  await page.screenshot({
    path: "/tmp/senate-metropolis-mobile.png",
    fullPage: true,
  });
  // The repository-root preview exercises the actual nested GitHub Pages path.
  const nested =
    "http://127.0.0.1:8765/teaching/us-election-demo/build/#senate";
  await page.goto(nested);
  await page
    .getByRole("heading", { name: "Who will control the Senate?" })
    .waitFor();
  await page.locator("#step").click();
  assert.equal(await read("iterations"), "1");
  assert.equal(
    (
      await page.request.get(
        new URL("./data/senate-polls-2026.csv", nested).href,
      )
    ).status(),
    200,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS desktop/tablet/mobile, nested deployment path, and no browser exceptions",
  );
} finally {
  await browser.close();
}
