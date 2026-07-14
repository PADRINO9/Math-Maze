const { test, expect } = require("@playwright/test");

async function startAudioGame(page) {
  await page.addInitScript(() => {
    window.__kaflulAudioEvents = [];
    window.addEventListener("kaflul:audio-play", (event) => window.__kaflulAudioEvents.push(event.detail));
    window.addEventListener("kaflul:music-scene", (event) => window.__kaflulAudioEvents.push({ type: "music", ...event.detail }));
  });
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady && window.KaflulAudio);
  await page.locator("#start-button").click();
  await expect(page.locator("#start-screen")).toBeHidden();
  await page.waitForFunction(() => window.KaflulAudio.getDiagnostics().loaded >= 4);
}

test("production audio loads, changes music scene, ducks for a question and plays immediate feedback", async ({ page }) => {
  await startAudioGame(page);
  const gameplay = await page.evaluate(() => window.KaflulAudio.getDiagnostics());
  expect(gameplay.unlocked).toBe(true);
  expect(gameplay.currentScene).toBe("ice");
  expect(gameplay.musicEnabled).toBe(true);
  expect(gameplay.loadErrors).toBe(0);

  const question = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());
  expect(question.answer).toBeGreaterThan(0);
  await expect(page.locator("#question-dialog")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.KaflulAudio.getDiagnostics().questionDucked)).toBe(true);

  for (const digit of String(question.answer)) {
    await page.locator(`[data-keypad-digit="${digit}"]`).click();
  }
  await page.locator('[data-keypad-action="submit"]').click();
  await expect(page.locator("#question-dialog")).toHaveAttribute("data-answer-result", "correct");
  await expect.poll(() => page.evaluate(() => window.__kaflulAudioEvents.some((event) => event.event === "answerCorrect"))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.KaflulAudio.getDiagnostics().questionDucked)).toBe(false);
});

test("audio mixer persists independent levels and headphone safety", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#audio-mixer-title")).toBeVisible();
  await page.locator("#audio-music-volume").fill("28");
  await page.locator("#audio-music-volume").dispatchEvent("change");
  await page.locator("#audio-voices-volume").fill("63");
  await page.locator("#audio-voices-volume").dispatchEvent("change");
  await page.locator("#audio-safety-toggle").click();

  const settings = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("kaflulArcadeSave"));
    return { saved: save.settings, diagnostics: window.KaflulAudio.getDiagnostics() };
  });
  expect(settings.saved.audioVolumes.music).toBeCloseTo(0.28, 2);
  expect(settings.saved.audioVolumes.voices).toBeCloseTo(0.63, 2);
  expect(settings.saved.headphoneSafetyMode).toBe(false);
  expect(settings.diagnostics.volumes.music).toBeCloseTo(0.28, 2);
  expect(settings.diagnostics.volumes.voices).toBeCloseTo(0.63, 2);
});
