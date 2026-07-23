const { test, expect } = require("@playwright/test");

function collectRuntimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function tutorialState(page) {
  return page.evaluate(() => window.KaflulTutorial?.getState?.());
}

async function clickRequiredStep(page, step, feedbackText = "") {
  await expect.poll(async () => (await tutorialState(page))?.currentStep).toBe(step);
  await expect.poll(async () => (await tutorialState(page))?.phase).toBe("awaiting");
  const target = page.locator(".kf-coach-active-target");
  await expect(target).toHaveCount(1);
  await target.click();
  await expect.poll(async () => (await tutorialState(page))?.phase).toBe("feedback");
  await expect(page.locator("#tutorial-speech-bubble")).toBeVisible();
  if (feedbackText) {
    await expect(page.locator("#tutorial-lead")).toContainText(feedbackText);
  }
}

async function waitForNextStep(page, step) {
  await expect.poll(async () => (await tutorialState(page))?.currentStep, { timeout: 5_000 }).toBe(step);
  await expect.poll(async () => (await tutorialState(page))?.phase, { timeout: 5_000 }).toBe("awaiting");
}

test("a new player must follow the pointing hand and every required click explains the game", async ({ page }) => {
  test.setTimeout(process.env.CI ? 120_000 : 70_000);
  const errors = collectRuntimeErrors(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("kaflulCoachTutorialTestInitialized") === "yes") {
      return;
    }
    sessionStorage.setItem("kaflulCoachTutorialTestInitialized", "yes");
    localStorage.removeItem("kaflulArcadeSave");
    localStorage.removeItem("kaflulFirstRunTutorialV1");
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const tutorial = page.locator("#first-run-tutorial");
  await expect(tutorial).toBeVisible();
  await expect(page.locator("#tutorial-step-label")).toHaveText("הדרכה 1 מתוך 13");
  await expect(page.locator("#tutorial-title")).toHaveText("לחצו על גלגל השיניים");
  await expect(page.locator("#tutorial-hand")).toBeVisible();

  await page.locator("#start-button").click({ force: true });
  await expect.poll(async () => (await tutorialState(page))?.currentStep).toBe(1);
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.locator("#tutorial-lock-message")).toBeVisible();

  await clickRequiredStep(page, 1, "מצב משחק");
  await expect(page.locator("#settings-panel")).toBeVisible();
  await waitForNextStep(page, 2);

  await clickRequiredStep(page, 2, "ארקייד");
  await expect(page.locator("#mode-panel")).toBeVisible();
  await waitForNextStep(page, 3);

  await clickRequiredStep(page, 3, "108");
  await expect(page.locator('input[name="game-mode"][value="adventure"]')).toBeChecked();
  await waitForNextStep(page, 4);

  await clickRequiredStep(page, 4, "רמה");
  await waitForNextStep(page, 5);

  await clickRequiredStep(page, 5, "מכפיל הניקוד");
  await expect(page.locator("#difficulty-panel")).toBeVisible();
  await waitForNextStep(page, 6);

  await clickRequiredStep(page, 6, "קומבו");
  await expect(page.locator('input[name="difficulty"][value="beginner"]')).toBeChecked();
  await waitForNextStep(page, 7);

  await clickRequiredStep(page, 7, "תנועה");
  await waitForNextStep(page, 8);

  await clickRequiredStep(page, 8, "תרגיל");
  await expect(page.locator('input[name="control-mode"][value="joystick"]')).toBeChecked();
  await waitForNextStep(page, 9);

  await clickRequiredStep(page, 9, "אותו כוח");
  await expect(page.locator("#hero-gallery")).toBeVisible();
  await waitForNextStep(page, 10);

  await clickRequiredStep(page, 10, "הדמות השנייה");
  await waitForNextStep(page, 11);

  await clickRequiredStep(page, 11, "מוכנה למשחק הראשון");
  await expect(page.locator('input[name="character"][value="nabatick"]')).toBeChecked();
  await waitForNextStep(page, 12);

  await clickRequiredStep(page, 12, "הכול מוכן");
  await waitForNextStep(page, 13);

  await clickRequiredStep(page, 13, "המטרה");
  await expect(page.locator("#start-screen")).toBeHidden();
  await expect(page.locator("#pause-button")).toHaveAttribute("data-icon", "pause");
  await expect(tutorial).toBeHidden({ timeout: 5_000 });

  const saved = await page.evaluate(() => ({
    tutorialStatus: localStorage.getItem("kaflulFirstRunTutorialV1"),
    save: JSON.parse(localStorage.getItem("kaflulArcadeSave"))
  }));
  expect(saved.tutorialStatus).toBe("complete");
  expect(saved.save.settings.selectedMode).toBe("adventure");
  expect(saved.save.settings.selectedDifficulty).toBe("beginner");
  expect(saved.save.settings.selectedCharacter).toBe("nabatick");
  expect(saved.save.settings.controlMode).toBe("joystick");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3100);
  await expect(tutorial).toBeHidden();
  expect(errors).toEqual([]);
});

test("an existing player is not interrupted and can replay the coach tutorial from Settings", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.addInitScript(() => {
    localStorage.removeItem("kaflulFirstRunTutorialV1");
    localStorage.setItem("kaflulArcadeSave", JSON.stringify({
      schemaVersion: 2,
      player: { nickname: "שחקן חוזר" },
      settings: {
        selectedCharacter: "nabatick",
        selectedDifficulty: "beginner",
        selectedMode: "adventure",
        operationMode: "multiplication",
        controlMode: "joystick"
      }
    }));
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#app-loading-screen")).toBeHidden();
  await page.waitForTimeout(250);
  await expect(page.locator("#first-run-tutorial")).toBeHidden();

  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await page.locator("#tutorial-replay-button").click();
  await expect(page.locator("#first-run-tutorial")).toBeVisible();
  await expect(page.locator("#tutorial-title")).toHaveText("לחצו על גלגל השיניים");

  await clickRequiredStep(page, 1, "כאן משנים");
  await waitForNextStep(page, 2);
  await page.locator("#tutorial-skip-button").click();
  await expect(page.locator("#first-run-tutorial")).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kaflulFirstRunTutorialV1"))).toBe("complete");
  expect(errors).toEqual([]);
});
