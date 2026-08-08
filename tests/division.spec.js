const { test, expect } = require("@playwright/test");

async function openReadyGame(page) {
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady);
  await page.locator("#menu-settings-button").click();
  await page.locator("#player-name-input").fill("בודק חילוק");
  await page.locator("#settings-save-button").click();
  await expect(page.locator("#settings-panel")).toBeHidden();
}

async function submitAnswer(page, answer) {
  for (const digit of String(answer)) {
    await page.locator(`[data-keypad-digit="${digit}"]`).click();
  }
  await page.locator('[data-keypad-action="submit"]').click();
}

test("multiplication-only remains the safe default", async ({ page }) => {
  await openReadyGame(page);
  await page.locator("#start-button").click();
  const question = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());

  expect(question.operation).toBe("multiplication");
  expect(question.text).toContain("×");
  expect(question.text).not.toContain("÷");
});

test("mixed mode persists and alternates exact division with multiplication", async ({ page }) => {
  await openReadyGame(page);
  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();

  const mixedInput = page.locator('input[name="operation-mode"][value="mixed"]');
  await page.locator(".settings-operation-mode label", { hasText: "כפל וחילוק" }).click();
  await expect(mixedInput).toBeChecked();
  await expect(page.locator("#settings-selection-summary")).toContainText("כפל וחילוק");

  const savedMode = await page.evaluate(() => (
    JSON.parse(localStorage.getItem("kaflulArcadeSave")).settings.operationMode
  ));
  expect(savedMode).toBe("mixed");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady);
  await page.locator("#menu-settings-button").click();
  await expect(mixedInput).toBeChecked();
  await page.locator("#settings-panel [data-close-panel]").click();

  await page.locator("#start-button").click();
  const division = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());
  expect(division.operation).toBe("division");
  expect(division.text).toContain("÷");
  expect(division.dividend % division.divisor).toBe(0);
  expect(division.dividend / division.divisor).toBe(division.answer);
  await expect(page.locator("#question-dialog")).toHaveAttribute("data-operation", "division");

  await submitAnswer(page, division.answer);
  await expect(page.locator("#question-dialog")).toHaveAttribute("data-answer-result", "correct");
  await expect(page.locator("#question-dialog")).toBeHidden();

  const multiplication = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());
  expect(multiplication.operation).toBe("multiplication");
  expect(multiplication.text).toContain("×");
  expect(multiplication.text).not.toContain("÷");
});
