const { test, expect } = require("@playwright/test");

function collectRuntimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function startGame(page, playerName = "בודק") {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();
  if (playerName) {
    await setNickname(page, playerName);
  }
  await page.locator("#start-button").click();
  await expect(page.locator("#start-screen")).toBeHidden();
  await expect(page.locator("#end-screen")).toBeHidden();
  await expect(page.locator("#pause-button")).toHaveAttribute("data-icon", "pause");
}

async function setNickname(page, playerName) {
  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await page.locator("#player-name-input").fill(playerName);
  await page.locator("#settings-save-button").click();
  await expect(page.locator("#settings-panel")).toBeHidden();
}

async function openSettingsPanel(page) {
  if (await page.locator("#settings-panel").isHidden()) {
    await page.locator("#menu-settings-button").click();
  }
  await expect(page.locator("#settings-panel")).toBeVisible();
}

async function openHeroGalleryFromSettings(page) {
  await openSettingsPanel(page);
  await page.locator("#character-control-button").click();
  await expect(page.locator("#hero-gallery")).toBeVisible();
}

async function openModePanelFromSettings(page) {
  await openSettingsPanel(page);
  await page.locator("#mode-control-button").click();
  await expect(page.locator("#mode-panel")).toBeVisible();
}

async function openDifficultyPanelFromSettings(page) {
  await openSettingsPanel(page);
  await page.locator("#difficulty-control-button").click();
  await expect(page.locator("#difficulty-panel")).toBeVisible();
}

async function openPregamePanelFromSettings(page) {
  await openSettingsPanel(page);
  await page.locator("#pregame-open-button").click();
  await expect(page.locator("#pregame-panel")).toBeVisible();
}

async function seedLocalLeaderboard(page) {
  await page.addInitScript(() => {
    localStorage.setItem("kaflulArcadeSave", JSON.stringify({
      schemaVersion: 2,
      gameVersion: "test",
      player: {
        nickname: "שיא מקומי"
      },
      settings: {
        selectedCharacter: "bifly",
        selectedDifficulty: "normal",
        selectedMode: "arcade",
        soundEnabled: true,
        musicEnabled: true,
        timeLimitEnabled: false,
        accessibility: {
          reducedMotion: false
        }
      },
      unlockedDifficulties: ["beginner", "normal", "advanced", "expert"],
      personalBests: {},
      leaderboardEntries: [
        {
          id: "local-best",
          nickname: "שיא מקומי",
          score: 12345,
          mode: "arcade",
          difficulty: "normal",
          reachedStage: 2,
          selectedCharacter: "bifly",
          maxCombo: 7,
          accuracy: 88,
          date: "2026-06-29T00:00:00.000Z",
          gameVersion: "test"
        }
      ],
      completedLevels: {},
      achievementProgress: {},
      recovery: null,
      updatedAt: "2026-06-29T00:00:00.000Z"
    }));
  });
}

async function seedHeroGalleryProgress(page) {
  await page.addInitScript(() => {
    localStorage.setItem("kaflulArcadeSave", JSON.stringify({
      schemaVersion: 2,
      gameVersion: "test",
      player: {
        nickname: "בודק גלריה"
      },
      settings: {
        selectedCharacter: "bifly",
        selectedDifficulty: "normal",
        selectedMode: "arcade",
        soundEnabled: true,
        musicEnabled: true,
        timeLimitEnabled: false,
        accessibility: {
          reducedMotion: false
        }
      },
      unlockedDifficulties: ["beginner", "normal", "advanced"],
      personalBests: {
        "arcade:normal": {
          score: 2100,
          mode: "arcade",
          difficulty: "normal",
          reachedStage: 3,
          maxCombo: 8,
          accuracy: 91,
          date: "2026-06-29T00:00:00.000Z",
          gameVersion: "test"
        },
        "adventure:advanced": {
          score: 3400,
          mode: "adventure",
          difficulty: "advanced",
          reachedStage: 4,
          maxCombo: 11,
          accuracy: 86,
          date: "2026-06-29T00:00:00.000Z",
          gameVersion: "test"
        }
      },
      leaderboardEntries: [
        {
          id: "bifly-best",
          nickname: "בודק גלריה",
          score: 2100,
          mode: "arcade",
          difficulty: "normal",
          reachedStage: 3,
          selectedCharacter: "bifly",
          maxCombo: 8,
          accuracy: 91,
          date: "2026-06-29T00:00:00.000Z",
          gameVersion: "test"
        },
        {
          id: "nabatick-best",
          nickname: "בודק גלריה",
          score: 3400,
          mode: "adventure",
          difficulty: "advanced",
          reachedStage: 4,
          selectedCharacter: "nabatick",
          maxCombo: 11,
          accuracy: 86,
          date: "2026-06-29T00:00:00.000Z",
          gameVersion: "test"
        }
      ],
      completedLevels: {},
      achievementProgress: {},
      recovery: null,
      updatedAt: "2026-06-29T00:00:00.000Z"
    }));
  });
}

async function swipeHeroGallery(page, direction = "next") {
  const stage = page.locator("#hero-gallery-stage");
  const heroName = page.locator("#hero-gallery-name");
  await expect(stage).toBeVisible();
  const previousName = await heroName.innerText();
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();

  const y = box.y + box.height / 2;
  const startX = direction === "next" ? box.x + box.width * 0.75 : box.x + box.width * 0.25;
  const endX = direction === "next" ? box.x + box.width * 0.25 : box.x + box.width * 0.75;

  await stage.evaluate((element, points) => {
    const common = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      clientY: points.y
    };
    const dispatchPointer = (type, clientX, buttons) => {
      element.dispatchEvent(new PointerEvent(type, {
        ...common,
        clientX,
        buttons,
        button: 0
      }));
    };

    dispatchPointer("pointerdown", points.startX, 1);
    dispatchPointer("pointermove", (points.startX + points.endX) / 2, 1);
    dispatchPointer("pointermove", points.endX, 1);
    dispatchPointer("pointerup", points.endX, 0);
  }, { startX, endX, y });

  await expect(heroName).not.toHaveText(previousName, { timeout: 3000 });
}

test("empty player name in settings stays on the start screen", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();
  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await page.locator("#player-name-input").fill("   ");
  await page.locator("#settings-save-button").click();
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await expect(page.locator("#name-error")).toContainText("כינוי קצר");
  expect(errors).toEqual([]);
});

test("start button enters a running game and visible blur does not pause it", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await startGame(page);

  const firstFrame = await page.locator("#game-canvas").evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(450);
  const secondFrame = await page.locator("#game-canvas").evaluate((canvas) => canvas.toDataURL());
  expect(secondFrame).not.toBe(firstFrame);

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(150);
  await expect(page.locator("#pause-button")).toHaveAttribute("data-icon", "pause");

  const runtime = await page.evaluate(() => window.__mathMazeRuntime);
  expect(runtime.startTransitions).toBeGreaterThan(0);
  expect(runtime.errors).toEqual([]);
  expect(errors).toEqual([]);
});

test("gameplay HUD stays streamlined and uses SVG lives", async ({ page }, testInfo) => {
  const errors = collectRuntimeErrors(page);
  await startGame(page);

  const hudMetrics = await page.locator(".hud [data-hud-metric]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-hud-metric"))
  );
  expect(hudMetrics).toEqual(["score", "combo", "lives", "progress", "mission"]);
  await expect(page.locator(".hud [data-hud-secondary]")).toHaveCount(0);
  await expect(page.locator("#level-number")).toHaveCount(0);
  await expect(page.locator("#world-name")).toHaveCount(0);
  await expect(page.locator("#mode-label")).toHaveCount(0);
  await expect(page.locator("#difficulty-label")).toHaveCount(0);
  await expect(page.locator("#lives .hud-life-icon svg use")).toHaveCount(3);

  const lifeIcons = await page.locator("#lives .hud-life-icon svg use").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href"))
  );
  expect(lifeIcons).toEqual(["ui/icons.svg#lives", "ui/icons.svg#lives", "ui/icons.svg#lives"]);
  if (!testInfo.project.name.includes("mobile")) {
    await page.locator("#pause-button").evaluate((button) => button.click());
    await expect(page.locator("#pause-screen")).toBeVisible();
    await expect(page.locator("#pause-summary")).toContainText("ארקייד");
    await expect(page.locator("#pause-summary")).toContainText("רגיל");
  }
  expect(errors).toEqual([]);
});

test("mobile uses one native numeric input and starts without a stale overlay", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only assertion");
  const errors = collectRuntimeErrors(page);
  await startGame(page, "נייד");

  await expect(page.locator(".mobile-number-pad")).toHaveCount(0);
  await expect(page.locator("#answer-input")).not.toHaveAttribute("readonly", "");
  await expect(page.locator("#start-screen")).toBeHidden();

  const hiddenStyle = await page.locator("#start-screen").evaluate((element) => ({
    display: getComputedStyle(element).display,
    visibility: getComputedStyle(element).visibility,
    pointerEvents: getComputedStyle(element).pointerEvents
  }));
  expect(hiddenStyle).toEqual({ display: "none", visibility: "hidden", pointerEvents: "none" });

  await page.waitForTimeout(500);
  await expect(page.locator("#pause-button")).toHaveAttribute("data-icon", "pause");
  expect(await page.evaluate(() => window.__mathMazeRuntime.errors)).toEqual([]);
  expect(errors).toEqual([]);
});

test("the game does not replace native Map methods", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const source = await page.evaluate(() => Function.prototype.toString.call(Map.prototype.set));
  expect(source).toContain("[native code]");
});

test("phase 2 home summary and bottom navigation stay interactive", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();

  await openHeroGalleryFromSettings(page);
  await page.locator("#hero-gallery-back").click();
  await expect(page.locator("#hero-gallery")).toBeHidden();

  await openModePanelFromSettings(page);
  await page.locator("#mode-panel [data-close-panel]").click();
  await expect(page.locator("#mode-panel")).toBeHidden();

  await openDifficultyPanelFromSettings(page);
  await page.locator("#difficulty-panel [data-close-panel]").click();
  await expect(page.locator("#difficulty-panel")).toBeHidden();

  await page.locator("#home-progress-button").click();
  await expect(page.locator("#progress-panel")).toBeVisible();
  await expect(page.locator("#progress-panel [data-close-panel]")).toBeFocused();
  await page.locator("#progress-panel [data-close-panel]").click();
  await expect(page.locator("#progress-panel")).toBeHidden();

  await openPregamePanelFromSettings(page);
  await expect(page.locator("#pregame-panel [data-close-panel]")).toBeFocused();
  await page.locator("#pregame-panel [data-close-panel]").click();
  await expect(page.locator("#pregame-panel")).toBeHidden();

  await page.locator("#leaderboard-open").click();
  await expect(page.locator("#leaderboard-dialog")).toBeVisible();
  await page.locator("#leaderboard-close").click();
  await expect(page.locator("#leaderboard-dialog")).toBeHidden();

  expect(errors).toEqual([]);
});

test("leaderboard remains local-only when public backend is unavailable", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  let getCount = 0;
  let postCount = 0;
  await seedLocalLeaderboard(page);
  await page.route("**/api/champions**", async (route) => {
    if (route.request().method() === "POST") {
      postCount += 1;
    } else {
      getCount += 1;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "leaderboard_not_configured",
        message: "טבלת השיאים עדיין לא הוגדרה."
      })
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.locator("#leaderboard-copy")).toContainText("טבלת השיאים הציבורית עדיין לא פעילה");

  await page.locator("#leaderboard-open").click();
  await expect(page.locator("#leaderboard-dialog")).toBeVisible();
  await expect(page.locator("#leaderboard-public-chip")).toContainText("ציבורי לא פעיל");
  await expect(page.locator("#leaderboard-list")).toContainText("שיא מקומי");
  await expect(page.locator("#leaderboard-status")).toContainText("הטבלה המקומית");

  await page.locator("#leaderboard-refresh").click();
  await expect(page.locator("#leaderboard-list")).toContainText("12,345");
  expect(postCount).toBe(0);
  expect(getCount).toBe(0);
  expect(errors).toEqual([]);
});

test("leaderboard capability check models local-only without browser errors", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  let capabilityCount = 0;
  let postCount = 0;

  await page.route("**/api/champions**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      postCount += 1;
    }

    const requestUrl = new URL(request.url());
    if (request.method() === "GET" && requestUrl.searchParams.get("capability") === "1") {
      capabilityCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          publicAvailable: false,
          code: "leaderboard_not_configured",
          message: "טבלת השיאים עדיין לא הוגדרה."
        })
      });
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "leaderboard_not_configured",
        message: "טבלת השיאים עדיין לא הוגדרה."
      })
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const capability = await page.evaluate(async () => {
    const response = await fetch("/api/champions?capability=1", {
      headers: { Accept: "application/json" }
    });
    return {
      ok: response.ok,
      status: response.status,
      payload: await response.json()
    };
  });
  const localOnlyUi = await page.evaluate(() =>
    window.KaflulSystems.getPublicLeaderboardUiState("localOnly", true)
  );

  expect(capability).toEqual({
    ok: true,
    status: 200,
    payload: {
      publicAvailable: false,
      code: "leaderboard_not_configured",
      message: "טבלת השיאים עדיין לא הוגדרה."
    }
  });
  expect(localOnlyUi.publicAvailable).toBe(false);
  expect(localOnlyUi.buttonDisabled).toBe(true);
  expect(localOnlyUi.copy).toContain("השיא נשמר במכשיר הזה");
  expect(capabilityCount).toBe(1);
  expect(postCount).toBe(0);
  expect(errors).toEqual([]);
});

test("phase 3 hero gallery selects characters and returns to the home hub", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();

  await openHeroGalleryFromSettings(page);
  await expect(page.locator("#hero-gallery-name")).toContainText("ביפלי");

  await page.locator("#hero-gallery-next").click();
  await expect(page.locator("#hero-gallery-name")).toContainText("נבטיק");
  await page.locator("#hero-gallery-select").click();
  await expect(page.locator("input[name='character'][value='nabatick']")).toBeChecked();
  await expect(page.locator("#selected-character-label")).toContainText("נבטיק");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#hero-gallery-name")).toContainText("ביפלי");
  await page.keyboard.press("Enter");
  await expect(page.locator("input[name='character'][value='bifly']")).toBeChecked();

  await page.locator("#hero-gallery-home").click();
  await expect(page.locator("#hero-gallery")).toBeHidden();
  await expect(page.locator("#start-button")).toBeVisible();

  await openHeroGalleryFromSettings(page);
  await page.locator("#hero-gallery-next").click();
  await page.locator("#hero-gallery-select").click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("input[name='character'][value='nabatick']")).toBeChecked();
  await expect(page.locator("#selected-character-label")).toContainText("נבטיק");

  expect(errors).toEqual([]);
});

test("phase 8.8 hero gallery, home navigation and real progress data are complete", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await seedHeroGalleryProgress(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();

  await expect(page.locator("#home-progress-button")).toBeVisible();
  await expect(page.locator("#leaderboard-open")).toBeVisible();
  await expect(page.locator("#menu-settings-button")).toBeVisible();
  await expect(page.locator(".home-bottom-nav")).toBeHidden();

  await openHeroGalleryFromSettings(page);
  await expect(page.locator("#hero-gallery-name")).toHaveText("ביפלי");
  await expect(page.locator("#hero-gallery-description")).toContainText("מבוך");
  await expect(page.locator("#hero-gallery-best")).toContainText("2,100");
  await expect(page.locator("#hero-animation-mount")).toHaveAttribute("data-adapter-kind", "static-png");
  await expect(page.locator("#hero-animation-mount")).toHaveAttribute("data-supported-states", /idle/);

  await swipeHeroGallery(page, "next");
  await expect(page.locator("#hero-gallery-name")).toHaveText("נבטיק");
  await expect(page.locator("#hero-gallery-description")).toContainText("יריבים");
  await expect(page.locator("#hero-gallery-best")).toContainText("3,400");
  await expect(page.locator("#hero-gallery-asset-note")).toContainText("חסרים");
  await page.locator("#hero-gallery-select").click();
  await expect(page.locator("input[name='character'][value='nabatick']")).toBeChecked();
  await expect(page.locator("#selected-character-label")).toContainText("נבטיק");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#hero-gallery-name")).toHaveText("ביפלי");
  await page.keyboard.press("Enter");
  await expect(page.locator("input[name='character'][value='bifly']")).toBeChecked();

  await page.locator("#hero-gallery-home").click();
  await expect(page.locator("#hero-gallery")).toBeHidden();
  await expect(page.locator("#start-button")).toBeVisible();

  await page.locator("#home-progress-button").click();
  await expect(page.locator("#progress-panel")).toBeVisible();
  await expect(page.locator("#progress-panel-copy")).toContainText("שמירה המקומית");
  await expect(page.locator("#progress-best-list")).toContainText("3,400");
  const progressText = await page.locator("#progress-panel").innerText();
  expect(progressText).not.toMatch(/מטבע|פרס|תגמול|הישג/);
  await page.locator("#progress-panel [data-close-panel]").click();
  await expect(page.locator("#progress-panel")).toBeHidden();

  await page.locator("#leaderboard-open").click();
  await expect(page.locator("#leaderboard-dialog")).toBeVisible();
  await page.locator("#leaderboard-close").click();
  await expect(page.locator("#leaderboard-dialog")).toBeHidden();

  await openPregamePanelFromSettings(page);
  await page.locator("#pregame-panel [data-close-panel]").click();
  await expect(page.locator("#pregame-panel")).toBeHidden();

  await openHeroGalleryFromSettings(page);
  await page.locator("#hero-gallery-next").click();
  await page.locator("#hero-gallery-select").click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("input[name='character'][value='nabatick']")).toBeChecked();
  await expect(page.locator("#selected-character-label")).toContainText("נבטיק");

  expect(errors).toEqual([]);
});

test("phase 8.9 motion and UI audio hooks are stable", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();

  const hookInventory = await page.evaluate(() => {
    const motionEvents = new Set(window.KaflulMotionSystem?.events || []);
    const soundEvents = new Set(window.KaflulUiSound?.events || []);
    const declaredSoundHooks = Array.from(document.querySelectorAll("[data-ui-sound]"))
      .map((element) => element.getAttribute("data-ui-sound"))
      .filter((value) => value && value !== "none");
    const requiredMotion = [
      "buttonPress",
      "modalOpen",
      "modalClose",
      "tabChange",
      "characterSelect",
      "lockedFeedback",
      "scoreCountUp",
      "comboMilestone",
      "missionComplete",
      "lifeLost",
      "newRecord"
    ];
    const requiredSounds = [
      "buttonPress",
      "primary-play",
      "panelOpen",
      "panelClose",
      "tabChange",
      "characterSelected",
      "modeSelected",
      "difficultySelected",
      "lockedAction",
      "reward",
      "newRecord"
    ];
    return {
      missingMotion: requiredMotion.filter((eventName) => !motionEvents.has(eventName)),
      missingSounds: requiredSounds.filter((eventName) => !soundEvents.has(eventName)),
      missingDeclaredSounds: declaredSoundHooks.filter((eventName) => !soundEvents.has(eventName))
    };
  });
  expect(hookInventory).toEqual({
    missingMotion: [],
    missingSounds: [],
    missingDeclaredSounds: []
  });

  const autoplayBeforeGesture = await page.evaluate(() => window.KaflulUiSound.play("buttonPress"));
  expect(autoplayBeforeGesture.reason).toBe("not-unlocked");

  await openPregamePanelFromSettings(page);
  await expect
    .poll(() => page.evaluate(() => window.KaflulMotionSystem.getDiagnostics().lastEvent))
    .toBe("sheetOpen");
  await expect
    .poll(() => page.evaluate(() => window.KaflulUiSound.getDiagnostics().lastEvent))
    .toBe("panelOpen");

  await page.locator("#pregame-panel [data-close-panel]").click();
  await expect(page.locator("#pregame-panel")).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.KaflulMotionSystem.getDiagnostics().lastEvent))
    .toBe("sheetClose");
  await expect
    .poll(() => page.evaluate(() => window.KaflulUiSound.getDiagnostics().lastEvent))
    .toBe("panelClose");

  await openModePanelFromSettings(page);
  await page.locator("#mode-panel label", { hasText: "הרפתקה" }).click();
  await expect(page.locator("input[name='game-mode'][value='adventure']")).toBeChecked();
  await expect(page.locator("#mode-panel")).toBeHidden();

  await page.locator(".menu-character-nabatick").click();
  await expect(page.locator("input[name='character'][value='nabatick']")).toBeChecked();
  const characterDiagnostics = await page.evaluate(() => ({
    motion: window.KaflulMotionSystem.getDiagnostics().lastEvent,
    sound: window.KaflulUiSound.getDiagnostics().lastEvent
  }));
  expect(characterDiagnostics).toEqual({ motion: "characterSelect", sound: "characterSelected" });

  const feedbackEvents = await page.evaluate(() => {
    const motion = window.KaflulMotionSystem;
    const target = document.getElementById("start-button");
    return ["scoreCountUp", "comboMilestone", "missionComplete", "lifeLost", "newRecord"].map((eventName) => {
      const result = motion.play(target, eventName);
      return result.event;
    });
  });
  expect(feedbackEvents).toEqual(["scoreCountUp", "comboMilestone", "missionComplete", "lifeLost", "newRecord"]);

  await page.evaluate(() => window.KaflulUiSound.setEnabled(false));
  const mutedPlay = await page.evaluate(() => window.KaflulUiSound.play("primary-play", { fromGesture: true }));
  expect(mutedPlay.reason).toBe("muted");
  await page.evaluate(() => window.KaflulUiSound.setEnabled(true));

  const reducedMotion = await page.evaluate(() => {
    const motion = window.KaflulMotionSystem;
    const target = document.getElementById("start-button");
    motion.setReducedMotionForTest(true);
    const before = motion.getDiagnostics().particlesCreated;
    const emitted = motion.emitParticles(target, { count: 12 });
    const playResult = motion.play(target, "reward", { particles: { count: 12 } });
    const after = motion.getDiagnostics().particlesCreated;
    const state = {
      classPresent: document.documentElement.classList.contains("kf-reduced-motion"),
      reduced: motion.isReducedMotion(),
      emitted,
      particleDelta: after - before,
      duration: playResult.duration,
      reducedFlag: playResult.reducedMotion
    };
    motion.setReducedMotionForTest(null);
    return state;
  });
  expect(reducedMotion).toEqual({
    classPresent: true,
    reduced: true,
    emitted: 0,
    particleDelta: 0,
    duration: 1,
    reducedFlag: true
  });

  expect(errors).toEqual([]);
});

test("menu selections, nickname and sound state persist across reloads", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();

  await page.locator(".menu-character-nabatick").click();
  await expect(page.locator("input[name='character'][value='nabatick']")).toBeChecked();

  await openModePanelFromSettings(page);
  await page.locator("#mode-panel label", { hasText: "הרפתקה" }).click();
  await expect(page.locator("input[name='game-mode'][value='adventure']")).toBeChecked();

  await openDifficultyPanelFromSettings(page);
  await page.locator("#difficulty-panel label", { hasText: "מתקדם" }).click();
  await expect(page.locator("input[name='difficulty'][value='advanced']")).toBeChecked();

  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await page.locator("#player-name-input").fill("שומר");
  await expect(page.locator("input[name='control-mode'][value='swipe']")).toBeChecked();
  await page.locator("#settings-panel label", { hasText: "ג׳ויסטיק" }).click();
  await expect(page.locator("input[name='control-mode'][value='joystick']")).toBeChecked();
  await page.locator("#settings-save-button").click();
  await expect(page.locator("#settings-panel")).toBeHidden();

  await page.locator("#menu-sound-button").click();
  await expect(page.locator("#menu-sound-button")).toHaveAttribute("data-icon", "sound-off");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("input[name='character'][value='nabatick']")).toBeChecked();
  await expect(page.locator("input[name='game-mode'][value='adventure']")).toBeChecked();
  await expect(page.locator("input[name='difficulty'][value='advanced']")).toBeChecked();
  await expect(page.locator("#player-name-input")).toHaveValue("שומר");
  await expect(page.locator("#menu-sound-button")).toHaveAttribute("data-icon", "sound-off");
  await expect(page.locator("input[name='control-mode'][value='joystick']")).toBeChecked();
  expect(errors).toEqual([]);
});
