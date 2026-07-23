const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kaflulFirstRunTutorialV1", "complete");
  });
});

function collectRuntimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("difficulty selection presents five clear, gradual levels", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });

  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await page.locator("#difficulty-control-button").click();
  await expect(page.locator("#difficulty-panel")).toBeVisible();

  await expect(page.locator("#difficulty-panel-title")).toHaveText("בחרו רמת קושי");
  await expect(page.locator("#difficulty-panel .secondary-kicker")).toHaveText("חוקים אחידים, אתגר עולה");
  await expect(page.locator("#difficulty-panel header p")).toHaveText(
    "בכל הרמות יש 3 חיים ו־25 שניות. הקושי עולה דרך התרגילים ועוצמת המרדף."
  );
  await expect(page.locator("#difficulty-panel legend")).toHaveText("חמש רמות ברורות — מקל ועד אגדי");
  await expect(page.locator("#difficulty-panel .difficulty-options strong")).toHaveText([
    "קל",
    "בינוני",
    "קשה",
    "מומחה",
    "אגדי"
  ]);
  await expect(page.locator("#difficulty-panel .difficulty-options em")).toHaveText([
    "×1",
    "×1.5",
    "×2",
    "×3",
    "×5"
  ]);
  await expect(page.locator("#difficulty-panel .difficulty-options small:not(.difficulty-lock-copy)")).toHaveText([
    "3 חיים, 25 שניות, כפולות 1–5 ו־10, מרדף רגוע.",
    "3 חיים, 25 שניות, כל לוח הכפל 1–10.",
    "3 חיים, 25 שניות, התרגילים המאתגרים עד 10.",
    "3 חיים, 25 שניות, לוח מורחב עד 12.",
    "3 חיים, 25 שניות, תרגילים מאתגרים עד 15×15."
  ]);
  expect(await page.locator("#difficulty-panel .difficulty-options strong").evaluateAll((labels) => (
    labels.map((label) => getComputedStyle(label).whiteSpace)
  ))).toEqual(["nowrap", "nowrap", "nowrap", "nowrap", "nowrap"]);

  const layout = await page.locator("#difficulty-panel .menu-sheet-inner").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    rect: element.getBoundingClientRect().toJSON(),
    viewport: { width: innerWidth, height: innerHeight }
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.rect.left).toBeGreaterThanOrEqual(0);
  expect(layout.rect.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.rect.bottom).toBeLessThanOrEqual(layout.viewport.height);
  expect(errors).toEqual([]);
});

test("question ranges and chase pressure rise without extreme jumps", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => page.evaluate(() => (
    typeof window.__mathMazeRuntime?.getDifficultyBalanceForVerification
  ))).toBe("function");

  const balance = await page.evaluate(() => (
    window.__mathMazeRuntime.getDifficultyBalanceForVerification(160)
  ));
  const allowedFactors = {
    beginner: new Set([1, 2, 3, 4, 5, 10]),
    normal: new Set(Array.from({ length: 10 }, (_, index) => index + 1)),
    advanced: new Set([3, 4, 6, 7, 8, 9]),
    expert: new Set(Array.from({ length: 11 }, (_, index) => index + 2)),
    legendary: new Set([3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15])
  };

  expect(balance.map(({ id, label }) => ({ id, label }))).toEqual([
    { id: "beginner", label: "קל" },
    { id: "normal", label: "בינוני" },
    { id: "advanced", label: "קשה" },
    { id: "expert", label: "מומחה" },
    { id: "legendary", label: "אגדי" }
  ]);
  expect(balance.map((level) => level.answerTimeLimit)).toEqual([25, 25, 25, 25, 25]);
  expect(balance.map((level) => level.initialLives)).toEqual([3, 3, 3, 3, 3]);
  expect(balance.map((level) => level.enemyCount)).toEqual([6, 7, 8, 9, 10]);
  expect(balance.map((level) => level.enemySpeedMultiplier)).toEqual([0.75, 0.84, 0.94, 1.02, 1.1]);

  const maxAnswerByDifficulty = {
    beginner: 100,
    normal: 100,
    advanced: 81,
    expert: 144,
    legendary: 225
  };
  for (const level of balance) {
    for (const question of [...level.samples, ...level.bossQuestions]) {
      expect(allowedFactors[level.id].has(question.a)).toBe(true);
      expect(allowedFactors[level.id].has(question.b)).toBe(true);
      expect(question.answer).toBeLessThanOrEqual(maxAnswerByDifficulty[level.id]);
    }
  }
  expect(balance.find((level) => level.id === "legendary").bossQuestions[0]).toEqual({
    a: 15,
    b: 15,
    answer: 225
  });
  expect(errors).toEqual([]);
});
