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

async function stopRuntimeAnimationLoop(page) {
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.waitForTimeout(50);
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
    localStorage.setItem("mathMazeFactStats", JSON.stringify({
      "7×8": { correct: 4, wrong: 0, streak: 4, lastAnsweredAt: "2026-06-29T00:00:00.000Z" },
      "6×9": { correct: 1, wrong: 3, streak: 0, lastAnsweredAt: "2026-06-29T00:00:00.000Z" },
      "4×4": { correct: 2, wrong: 0, streak: 2, lastAnsweredAt: "2026-06-29T00:00:00.000Z" }
    }));
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
  await expect(page.locator("#settings-name-error")).toContainText("כתבו כאן כינוי");
  expect(errors).toEqual([]);
});

test("a new player starts without a nickname and must choose a safe one in Settings", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.locator("#player-greeting")).toHaveText("עדיין אין כינוי");
  await expect(page.locator("#player-name-input")).toHaveValue("");
  await expect(page.locator("#start-button .arcade-play-label")).toContainText("בחרו כינוי");

  await page.locator("#start-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await expect(page.locator("#player-name-input")).toBeFocused();
  await expect(page.locator("#settings-name-error")).toContainText("כתבו כאן כינוי");

  await page.locator("#player-name-input").fill("f.u-c_k");
  await page.locator("#settings-save-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await expect(page.locator("#settings-name-error")).toContainText("אינה מתאימה");

  await page.locator("#player-name-input").fill("נועה 7");
  await page.locator("#settings-save-button").click();
  await expect(page.locator("#settings-panel")).toBeHidden();
  await expect(page.locator("#player-greeting")).toHaveText("נועה 7");
  await expect(page.locator("#start-button .arcade-play-label")).toHaveText("שחק עכשיו");

  await page.locator("#start-button").click();
  await expect(page.locator("#start-screen")).toBeHidden();
  await expect(page.locator("#pause-button")).toHaveAttribute("data-icon", "pause");
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

test("every world opens on the full maze then focuses the camera on the player", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__mathMazeRuntime?.forceStageIntroForVerification === "function");
  await stopRuntimeAnimationLoop(page);

  for (const levelIndex of [0, 1, 2, 3]) {
    const overview = await page.evaluate((index) =>
      window.__mathMazeRuntime.forceStageIntroForVerification(index), levelIndex
    );

    expect(overview.active).toBe(true);
    expect(overview.levelIndex).toBe(levelIndex);
    expect(overview.phase).toBe("overview");
    expect(overview.zoom).toBeLessThan(overview.gameplayZoom * 0.9);
    expect(overview.keyCount).toBe(3);
    expect(overview.letterCount).toBe(3);
    await expect(page.locator("html")).toHaveClass(/stage-intro-camera-active/);

    const heldPlayer = { x: overview.playerX, y: overview.playerY };
    await page.keyboard.press("ArrowLeft");
    const focused = await page.evaluate(() => window.__mathMazeRuntime.getStageIntroCameraSnapshot());
    expect(focused.active).toBe(false);
    expect(focused.phase).toBe("gameplay");
    expect(focused.zoom).toBeCloseTo(focused.gameplayZoom, 2);
    expect(focused.playerX).toBeCloseTo(heldPlayer.x, 4);
    expect(focused.playerY).toBeCloseTo(heldPlayer.y, 4);
    await expect(page.locator("html")).not.toHaveClass(/stage-intro-camera-active/);
  }

  expect(errors).toEqual([]);
});

test("all four mazes stay connected and the reported yellow-light pocket is a through-route", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=world1-collision&verifyLevel=0", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() =>
    typeof window.__mathMazeRuntime?.auditAllMazeTopologiesForVerification === "function"
  );

  const result = await page.evaluate(() => {
    const runtime = window.__mathMazeRuntime;
    const allTopologies = runtime.auditAllMazeTopologiesForVerification();
    const perWorldCollision = [];
    for (let levelIndex = 0; levelIndex < 4; levelIndex += 1) {
      runtime.forceLevelForVerification(levelIndex);
      perWorldCollision.push({
        levelIndex,
        topology: runtime.auditCurrentMazeTopologyForVerification(),
        collision: runtime.auditMazeCollisionForVerification(),
        traversal: runtime.auditFullMazeTraversalForVerification()
      });
    }
    runtime.forceLevelForVerification(0);
    const placement = runtime.setPlayerCellForVerification(13, 12);
    const movement = [];
    for (let frame = 0; frame < 42; frame += 1) {
      movement.push(runtime.stepPlayerForVerification("right", 2.2));
    }
    return {
      allTopologies,
      perWorldCollision,
      placement,
      movement,
      finalPlayer: runtime.getPlayerSnapshot(),
      finalCollision: runtime.getMazeCollisionSnapshot()
    };
  });

  expect(result.allTopologies.passed).toBe(true);
  expect(result.allTopologies.levelCount).toBe(4);
  expect(result.allTopologies.disconnectedComponentCount).toBe(0);
  expect(result.allTopologies.isolatedCellCount).toBe(0);
  expect(result.allTopologies.levels.every((level) => level.connectedComponentCount === 1)).toBe(true);
  expect(result.allTopologies.levels[0].reportedPassage.open).toBe(true);
  expect(result.allTopologies.levels[0].reportedPassage.pocketExitCount).toBeGreaterThanOrEqual(2);
  expect(result.perWorldCollision.every((entry) => entry.topology.passed)).toBe(true);
  expect(result.perWorldCollision.every((entry) => entry.collision.passed)).toBe(true);
  expect(result.perWorldCollision.every((entry) => entry.traversal.passed)).toBe(true);
  expect(result.placement.moved).toBe(true);
  expect(result.movement.every((entry) => entry && !entry.collision.playerOverlapsWall)).toBe(true);
  expect(result.finalPlayer.x).toBeGreaterThan(17 * 24);
  expect(result.finalCollision.playerCell.x).toBeGreaterThanOrEqual(17);
  expect(result.finalCollision.playerOverlapsWall).toBe(false);
  expect(errors).toEqual([]);
});

test("world hazards are distinct and burn damage completes before respawn", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() =>
    typeof window.__mathMazeRuntime?.forceEnvironmentHazardHitForVerification === "function"
  );

  const hazards = await page.evaluate(() => {
    return [0, 1, 2, 3].map((levelIndex) => {
      window.__mathMazeRuntime.forceLevelForVerification(levelIndex);
      window.__mathMazeRuntime.forceEnvironmentHazardForVerification();
      return window.__mathMazeRuntime.getEnvironmentHazardSnapshotForVerification();
    });
  });

  expect(hazards.map((snapshot) => snapshot.hazard?.type)).toEqual([
    "ice-slick",
    "lava-spill",
    "rune-trap",
    "crystal-burst"
  ]);
  expect(hazards.every((snapshot) => snapshot.hazard?.active)).toBe(true);
  expect(hazards.every((snapshot) => snapshot.hazard?.cellCount >= 3)).toBe(true);

  const sunImpact = await page.evaluate(() =>
    window.__mathMazeRuntime.forceEnvironmentHazardHitForVerification(0)
  );
  expect(sunImpact.impact.type).toBe("ice-slick");
  expect(sunImpact.impact.effect).toBe("burn");
  expect(sunImpact.impact.lifeCommitted).toBe(false);
  expect(sunImpact.impact.playerAttached).toBe(true);
  await page.evaluate(() =>
    window.__mathMazeRuntime.completeEnvironmentHazardImpactForVerification()
  );

  const impactStart = await page.evaluate(() =>
    window.__mathMazeRuntime.forceEnvironmentHazardHitForVerification(1)
  );
  const livesBefore = impactStart.lives;
  expect(impactStart.impact.type).toBe("lava-spill");
  expect(impactStart.impact.effect).toBe("burn");
  expect(impactStart.impact.lifeCommitted).toBe(false);
  expect(impactStart.impact.playerAttached).toBe(true);
  expect(impactStart.playerReaction.type).toBe("lava-spill");

  const shrinking = await page.evaluate(() =>
    window.__mathMazeRuntime.setEnvironmentHazardImpactProgressForVerification(0.38)
  );
  expect(shrinking.lives).toBe(livesBefore);
  expect(shrinking.impact.lifeCommitted).toBe(false);
  expect(shrinking.impact.playerAttached).toBe(true);

  const heartLoss = await page.evaluate(() =>
    window.__mathMazeRuntime.setEnvironmentHazardImpactProgressForVerification(0.66)
  );
  expect(heartLoss.lives).toBe(livesBefore - 1);
  expect(heartLoss.impact.lifeCommitted).toBe(true);
  expect(heartLoss.livesHudClass).toContain("hud-life-loss");

  const completed = await page.evaluate(() =>
    window.__mathMazeRuntime.completeEnvironmentHazardImpactForVerification()
  );
  expect(completed.impact).toBeNull();
  expect(completed.playerReaction).toBeNull();
  expect(completed.phase).toBe("playing");
  expect(errors).toEqual([]);
});

test("24 correct answers trigger a three-question boss and cinematic next-stage transition", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__mathMazeRuntime?.getBossEncounterSnapshot === "function");
  const entrance = await page.evaluate(() => {
    window.__mathMazeRuntime.forceLevelForVerification(0);
    window.__mathMazeRuntime.setBossQuestionFeedbackDelayForVerification(120);
    window.__mathMazeRuntime.forceBossChallenge();
    // Keep the live chase animation, but cap repaint pressure so state and DOM
    // assertions remain responsive on single-core CI runners.
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 50);
    return {
      ...window.__mathMazeRuntime.getBossEncounterSnapshot(),
      hudStageText: document.getElementById("hud-progress-stage")?.textContent || "",
      targetCorrectText: document.getElementById("target-correct")?.textContent || ""
    };
  });

  expect(entrance.regularCorrect).toBe(24);
  expect(entrance.bossCorrect).toBe(0);
  expect(entrance.boss.configKey).toBe("stage1");
  expect(entrance.boss.definitionId).toBe("sun-garden-warden");
  expect(entrance.boss.name).toBe("שומר-השמש");
  expect(entrance.boss.title).toBe("שומר גן השמש");
  expect(entrance.boss.worldIndex).toBe(0);
  expect(entrance.boss.worldLabel).toBe("גן השמש");
  expect(entrance.boss.actorTheme).toBe("sun-garden");
  expect(entrance.boss.proceduralStyle).toBeNull();
  expect(entrance.boss.chestDistanceTiles).toBeGreaterThanOrEqual(2.5);
  expect(entrance.boss.speedRatio).toBeGreaterThanOrEqual(1.12);
  expect(entrance.boss.healthRemaining).toBe(3);
  expect(entrance.boss.healthTotal).toBe(3);
  expect(entrance.guideText).toContain("תשובה נכונה = פגיעה");
  expect(entrance.cinematic.vanishingEnemyCount).toBeGreaterThanOrEqual(6);
  expect(entrance.hudStageText).toContain("בוס שלב 1");
  expect(entrance.targetCorrectText).toBe("/3");

  await page.evaluate(() => window.__mathMazeRuntime.completeBossCinematicForVerification());
  await page.waitForFunction(() => window.__mathMazeRuntime.getBossEncounterSnapshot().cinematic === null);
  await page.waitForTimeout(900);
  const chaseCamera = await page.evaluate(() => window.__mathMazeRuntime.getBossCameraSnapshotForVerification());
  expect(chaseCamera.player.onScreen).toBe(true);
  expect(chaseCamera.boss.onScreen).toBe(true);
  await page.waitForFunction(() => {
    const boss = window.__mathMazeRuntime.getBossSnapshot();
    return boss?.moving && boss.walkBlend > 0.75 && boss.walkCycle > 0;
  });
  const chaseMotion = await page.evaluate(() => window.__mathMazeRuntime.getBossSnapshot());
  expect(chaseMotion.moving).toBe(true);
  expect(chaseMotion.walkBlend).toBeGreaterThan(0.75);
  expect(chaseMotion.walkCycle).toBeGreaterThan(0);

  // Movement and rendering were verified above. Stop the perpetual animation
  // loop before the state-machine assertions so slow CI runners do not spend
  // the rest of this test repainting the boss arena.
  await stopRuntimeAnimationLoop(page);

  const questions = [];
  for (let index = 0; index < 3; index += 1) {
    const playerBefore = await page.evaluate(() => window.__mathMazeRuntime.getPlayerSnapshot());
    const question = index === 0
      ? await page.evaluate(() => window.__mathMazeRuntime.forceBossContactForVerification().question)
      : await page.evaluate(() => window.__mathMazeRuntime.openBossQuestionForVerification());
    questions.push(question.text);
    expect(question.bossQuestionNumber).toBe(index + 1);
    expect(question.bossQuestionTotal).toBe(3);
    expect(question.status).toContain(`${index + 1} מתוך 3`);
    expect(question.status).toContain("פגיעה");
    const snapshot = await page.evaluate(() => {
      window.__mathMazeRuntime.answerCurrentQuestionForVerification(undefined, true);
      return window.__mathMazeRuntime.getBossEncounterSnapshot();
    });
    expect(snapshot.bossCorrect).toBe(index + 1);
    if (index < 2) {
      expect(snapshot.boss).not.toBeNull();
      expect(snapshot.boss.damageLevel).toBe(index + 1);
      expect(snapshot.boss.healthRemaining).toBe(2 - index);
      const playerAfter = await page.evaluate(() => window.__mathMazeRuntime.getPlayerSnapshot());
      expect(Math.hypot(playerAfter.x - playerBefore.x, playerAfter.y - playerBefore.y)).toBeLessThan(12);
    } else {
      expect(snapshot.boss).toBeNull();
      expect(snapshot.phase).toBe("victory");
      expect(snapshot.defeatTransition).not.toBeNull();
    }
  }
  expect(new Set(questions).size).toBe(3);

  await expect.poll(
    () => page.evaluate(() => {
      const snapshot = window.__mathMazeRuntime.getBossEncounterSnapshot();
      return snapshot.levelIndex === 1 && snapshot.stageIntro;
    }),
    { timeout: 10_000 }
  ).toBe(true);
  const nextStage = await page.evaluate(() => window.__mathMazeRuntime.getBossEncounterSnapshot());
  expect(nextStage.levelIndex).toBe(1);
  expect(nextStage.stageCorrect).toBe(0);
  expect(nextStage.stageIntro).toBe(true);
  expect(errors).toEqual([]);
});

test("one correct collision answer blasts every nearby ghost and awards each defeat", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__mathMazeRuntime?.forceGhostBlastQuestionForVerification === "function");

  const before = await page.evaluate(() => {
    window.__mathMazeRuntime.setGhostBlastEffectDurationForVerification(3);
    return window.__mathMazeRuntime.forceGhostBlastQuestionForVerification(4, 1);
  });
  expect(before.phase).toBe("question");
  expect(before.enemyCount).toBe(4);
  expect(before.capturedEnemyIds).toHaveLength(4);
  expect(before.question.status).toContain("4 רוחות");

  const after = await page.evaluate(() => {
    window.__mathMazeRuntime.answerCurrentQuestionForVerification(undefined, true);
    return window.__mathMazeRuntime.getGhostBlastSnapshotForVerification();
  });
  expect(after.phase).toBe("playing");
  expect(after.enemyCount).toBe(0);
  expect(after.pendingSpawnCount).toBeGreaterThanOrEqual(4);
  expect(after.effect).not.toBeNull();
  expect(after.effect.count).toBe(4);
  expect(after.effect.perGhostAward).toBeGreaterThan(0);
  expect(after.effect.totalAward).toBe(after.effect.perGhostAward * 4);
  expect(after.effect.bonusAward).toBe(after.effect.perGhostAward * 3);
  expect(after.effect.emittedParticleCount).toBeGreaterThan(0);
  if (after.effect.mobileOptimized) {
    expect(after.effect.particleBudget).toBe(96);
    expect(after.effect.emittedParticleCount).toBeLessThanOrEqual(after.effect.particleBudget);
    expect(after.activeParticleCount).toBeLessThanOrEqual(after.effect.particleBudget);
  }
  expect(after.score - before.score).toBe(after.effect.totalAward);

  const maximumBlast = await page.evaluate(() => {
    window.__mathMazeRuntime.forceGhostBlastQuestionForVerification(6, 1);
    window.__mathMazeRuntime.answerCurrentQuestionForVerification(undefined, true);
    return window.__mathMazeRuntime.getGhostBlastSnapshotForVerification();
  });
  expect(maximumBlast.effect.count).toBe(6);
  if (maximumBlast.effect.mobileOptimized) {
    expect(maximumBlast.effect.emittedParticleCount).toBeLessThanOrEqual(maximumBlast.effect.particleBudget);
    expect(maximumBlast.activeParticleCount).toBeLessThanOrEqual(maximumBlast.effect.particleBudget);
  }
  expect(errors).toEqual([]);
});

test("each world uses its matching boss identity and actor style", async ({ page }) => {
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__mathMazeRuntime?.forceBossChallenge === "function");
  const bosses = await page.evaluate(() => {
    const identities = [];
    for (let levelIndex = 0; levelIndex < 4; levelIndex += 1) {
      window.__mathMazeRuntime.forceLevelForVerification(levelIndex);
      window.__mathMazeRuntime.forceBossChallenge();
      const boss = window.__mathMazeRuntime.getBossSnapshot();
      identities.push({
        levelIndex,
        configKey: boss?.configKey,
        definitionId: boss?.definitionId,
        name: boss?.name,
        title: boss?.title,
        worldIndex: boss?.worldIndex,
        worldLabel: boss?.worldLabel,
        actorRow: boss?.actorRow,
        actorTheme: boss?.actorTheme,
        proceduralStyle: boss?.proceduralStyle,
        actorFacing: boss?.actorFacing,
        directionalFacing: ["down", "right", "up", "left"].map((direction) => {
          const pose = window.__mathMazeRuntime.setBossWalkPoseForVerification(Math.PI / 2, direction, 0.4);
          return { direction: pose?.direction, actorFacing: pose?.actorFacing };
        })
      });
    }
    return identities;
  });

  expect(bosses).toEqual([
    ...[
      {
        levelIndex: 0,
        configKey: "stage1",
        definitionId: "sun-garden-warden",
        name: "שומר-השמש",
        title: "שומר גן השמש",
        worldIndex: 0,
        worldLabel: "גן השמש",
        actorRow: 1,
        actorTheme: "sun-garden",
        proceduralStyle: null
      },
      {
        levelIndex: 1,
        configKey: "stage2",
        definitionId: "magma-bastion",
        name: "לבת-הר",
        title: "שליט עולם הלבה",
        worldIndex: 1,
        worldLabel: "עולם הלבה",
        actorRow: 0,
        actorTheme: null,
        proceduralStyle: null
      },
      {
        levelIndex: 2,
        configKey: "stage3",
        definitionId: "ancient-rune-sentinel",
        name: "שומר-הרונים",
        title: "מגן עולם העתיקות",
        worldIndex: 2,
        worldLabel: "עולם העתיקות",
        actorRow: 2,
        actorTheme: null,
        proceduralStyle: null
      },
      {
        levelIndex: 3,
        configKey: "stage4",
        definitionId: "diamond-monarch",
        name: "מלך-היהלום",
        title: "שליט עולם היהלומים",
        worldIndex: 3,
        worldLabel: "עולם היהלומים",
        actorRow: 3,
        actorTheme: null,
        proceduralStyle: null
      }
    ].map((boss) => ({
      ...boss,
      actorFacing: "down",
      directionalFacing: ["down", "right", "up", "left"].map((direction) => ({ direction, actorFacing: direction }))
    }))
  ]);
});

for (const mode of ["adventure", "arcade"]) {
  test(`the fourth boss ends ${mode} with a persisted trophy instead of restarting world one`, async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await page.route("**/api/champions**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configured: false, entries: [] })
    }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.__mathMazeRuntime?.forceFinalBossQuestionForVerification === "function");

    const finalQuestion = await page.evaluate(({ playerName, gameMode }) => {
      window.__mathMazeRuntime.setBossQuestionFeedbackDelayForVerification(80);
      return window.__mathMazeRuntime.forceFinalBossQuestionForVerification(playerName, gameMode);
    }, { playerName: `אלוף ${mode}`, gameMode: mode });
    expect(finalQuestion.levelIndex).toBe(3);
    expect(finalQuestion.correctAnswers).toBe(107);

    await page.evaluate(() => {
      window.__mathMazeRuntime.answerCurrentQuestionForVerification(undefined, true);
    });
    await expect(page.locator("#end-screen")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1200);

    const result = await page.evaluate(() => ({
      encounter: window.__mathMazeRuntime.getBossEncounterSnapshot(),
      finalResult: window.__mathMazeRuntime.getFinalResultForVerification(),
      trophyVisible: !document.getElementById("winner-trophy").hidden,
      shareVisible: !document.getElementById("trophy-share-button").hidden,
      persistedSave: JSON.parse(localStorage.getItem("kaflulArcadeSave"))
    }));

    expect(result.encounter.phase).toBe("ended");
    expect(result.encounter.levelIndex).toBe(3);
    expect(result.encounter.finalBossDefeated).toBe(true);
    expect(result.finalResult.mode).toBe(mode);
    expect(result.finalResult.champion).toBe(true);
    expect(result.finalResult.reachedStage).toBe(4);
    expect(result.trophyVisible).toBe(true);
    expect(result.shareVisible).toBe(true);
    expect(result.persistedSave.completedLevels[`${mode}:normal`].won).toBe(true);
    expect(result.persistedSave.achievementProgress.championTrophy.earned).toBe(true);
    expect(result.persistedSave.achievementProgress.championTrophy.totalWins).toBe(1);
    expect(result.persistedSave.achievementProgress.championTrophy.modes[mode]).toBe(1);
    expect(errors).toEqual([]);
  });
}

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
    await expect(page.locator("#pause-summary")).toContainText("בינוני");
  }
  expect(errors).toEqual([]);
});

test("arcade collection slots light independently and three keys reveal chest guidance", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__mathMazeRuntime?.forceArcadeCollectionProgressForVerification === "function");
  await stopRuntimeAnimationLoop(page);

  await page.evaluate(() => window.__mathMazeRuntime.forceArcadeCollectionProgressForVerification({
    keysCollected: 0,
    collectedLetters: []
  }));
  await page.evaluate(() => window.__mathMazeRuntime.collectArcadeBonusItemForVerification("letter", "ל"));
  const partial = await page.evaluate(() => window.__mathMazeRuntime.collectArcadeBonusItemForVerification("key"));
  expect(partial.keysCollected).toBe(1);
  expect(partial.collectedLetters).toEqual(["ל"]);
  await expect(page.locator(".arcade-key-slot.is-collected")).toHaveCount(1);
  await expect(page.locator('.arcade-letter-slot[data-bonus-letter="ל"]')).toHaveClass(/is-collected/);
  await expect(page.locator('.arcade-letter-slot[data-bonus-letter="כ"]')).not.toHaveClass(/is-collected/);
  await expect(page.locator("#chest-ready-guidance")).toBeHidden();

  await page.evaluate(() => window.__mathMazeRuntime.collectArcadeBonusItemForVerification("letter", "פ"));
  await page.evaluate(() => window.__mathMazeRuntime.collectArcadeBonusItemForVerification("letter", "כ"));
  await page.evaluate(() => window.__mathMazeRuntime.collectArcadeBonusItemForVerification("key"));
  const complete = await page.evaluate(() => window.__mathMazeRuntime.collectArcadeBonusItemForVerification("key"));
  expect(complete.chestReadyVisible).toBe(true);
  await expect(page.locator(".arcade-key-slot.is-collected")).toHaveCount(3);
  await expect(page.locator(".arcade-letter-slot.is-collected")).toHaveCount(3);
  await expect(page.locator("#chest-ready-guidance")).toBeVisible();
  await expect(page.locator("#chest-ready-title")).toHaveText("שלושת המפתחות בידיך!");
  await expect(page.locator("#chest-ready-message")).toHaveText("גש לתיבה ופתח את האוצר");
  expect(errors).toEqual([]);
});

test("mobile uses the in-game numeric keypad and starts without a stale overlay", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only assertion");
  const errors = collectRuntimeErrors(page);
  await startGame(page, "נייד");

  await expect(page.locator("#game-number-pad")).toHaveCount(1);
  await expect(page.locator("#answer-input")).toHaveAttribute("readonly", "");
  await expect(page.locator("#answer-input")).toHaveAttribute("inputmode", "none");
  await expect(page.locator("#game-number-pad [data-keypad-digit]")).toHaveCount(10);
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
    const requestUrl = new URL(route.request().url());
    if (route.request().method() === "POST") {
      postCount += 1;
    } else {
      getCount += 1;
    }
    if (requestUrl.searchParams.get("capability") === "1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          publicAvailable: false,
          publicSubmissionsAvailable: false,
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
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.locator("#leaderboard-copy")).toContainText("השיא שמור במכשיר");

  await page.locator("#leaderboard-open").click();
  await expect(page.locator("#leaderboard-dialog")).toBeVisible();
  await expect(page.locator("#leaderboard-public-chip")).toContainText("לא זמין");
  await expect(page.locator("#leaderboard-list")).toContainText("שיא מקומי");
  await expect(page.locator("#leaderboard-status")).toContainText("גיבוי");

  await page.locator("#leaderboard-refresh").click();
  await expect(page.locator("#leaderboard-list")).toContainText("12,345");
  expect(postCount).toBe(0);
  expect(getCount).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("leaderboard retries immediately when Android starts before the network is ready", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  let capabilityCount = 0;
  await page.route("**/api/champions**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.searchParams.get("capability") === "1") {
      capabilityCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(capabilityCount === 1
          ? { publicAvailable: false, publicSubmissionsAvailable: false }
          : { publicAvailable: true, publicSubmissionsAvailable: true, automaticSync: true })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "global",
        scores: [],
        player: { rank: null, totalPlayers: 0, score: 0, scoreToNextRank: null }
      })
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#leaderboard-public-chip")).toContainText("לא זמין");
  await page.locator("#leaderboard-open").click();
  await expect(page.locator("#leaderboard-dialog")).toBeVisible();
  await expect(page.locator("#leaderboard-public-chip")).toContainText("דירוג עולמי מחובר");
  await expect(page.locator("#leaderboard-total-players")).toHaveText("0");
  expect(capabilityCount).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("global champion table shows personal best and exact world rank on home and dialog", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  const playerId = "74d8f8db-3d41-4f4d-84e1-09b2f8bbbfc2";
  await page.addInitScript(({ stablePlayerId }) => {
    localStorage.setItem("mathMazePlayerId", stablePlayerId);
    localStorage.setItem("mathMazeBest", "18500");
  }, { stablePlayerId: playerId });

  await page.route("**/api/champions**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.searchParams.get("capability") === "1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          publicAvailable: true,
          publicSubmissionsAvailable: true,
          automaticSync: true,
          minimumCorrectAnswers: 1
        })
      });
      return;
    }
    if (route.request().method() === "POST" && requestUrl.searchParams.get("action") === "session") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessionToken: "test.session", expiresAt: Date.now() + 60_000 })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "global",
        player: {
          rank: 42,
          totalPlayers: 1200,
          score: 18500,
          scoreToNextRank: 175,
          playerName: "אלוף 7"
        },
        scores: [
          {
            playerName: "מלכת הכפל",
            score: 99000,
            correctAnswers: 108,
            levelReached: 4,
            mode: "adventure",
            difficulty: "legendary",
            maxCombo: 36,
            accuracy: 99
          },
          {
            playerName: "אלוף 7",
            score: 18500,
            correctAnswers: 52,
            levelReached: 2,
            mode: "arcade",
            difficulty: "normal",
            maxCombo: 14,
            accuracy: 96,
            isCurrentPlayer: true
          }
        ]
      })
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#leaderboard-public-chip")).toContainText("דירוג עולמי מחובר");
  await expect(page.locator("#best-score")).toHaveText("18,500");
  await expect(page.locator("#menu-rank-value")).toHaveText("#42");
  await expect(page.locator("#leaderboard-open")).toHaveAttribute("aria-label", /מקום 42 בעולם/);

  await page.locator("#leaderboard-open").click();
  await expect(page.locator("#leaderboard-dialog")).toBeVisible();
  await expect(page.locator("#leaderboard-title")).toHaveText("אלוף האלופים");
  await expect(page.locator("#leaderboard-personal-best")).toHaveText("18,500");
  await expect(page.locator("#leaderboard-world-rank")).toHaveText("#42");
  await expect(page.locator("#leaderboard-total-players")).toHaveText("1,200");
  await expect(page.locator("#leaderboard-list")).toContainText("מלכת הכפל");
  await expect(page.locator("#leaderboard-list li.is-current-player")).toContainText("אלוף 7");
  expect(errors).toEqual([]);
});

test("a finished standard game automatically syncs its score and updates world rank", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  const submittedScores = [];
  await page.route("**/api/champions**", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (request.method() === "GET" && requestUrl.searchParams.get("capability") === "1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ publicAvailable: true, publicSubmissionsAvailable: true, automaticSync: true })
      });
      return;
    }
    if (request.method() === "POST" && requestUrl.searchParams.get("action") === "session") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessionToken: "signed.test-session", expiresAt: Date.now() + 60_000 })
      });
      return;
    }
    if (request.method() === "POST") {
      submittedScores.push(request.postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          improved: true,
          player: { rank: 7, totalPlayers: 1200, score: submittedScores[0].score, scoreToNextRank: 240 }
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ scores: [], player: null, scope: "global" })
    });
  });

  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();
  await setNickname(page, "אלוף אוטומטי");
  await page.locator("#start-button").click();
  await expect(page.locator("#start-screen")).toBeHidden();
  await page.waitForFunction(() => Boolean(window.__mathMazeRuntime?.forceChampionTrophyForVerification));
  await page.evaluate(() => window.__mathMazeRuntime.forceChampionTrophyForVerification("אלוף אוטומטי"));

  await expect(page.locator("#end-screen")).toBeVisible();
  await expect(page.locator("#publish-score-status")).toContainText("מקום 7 בעולם");
  await expect(page.locator("#leaderboard-rank")).toHaveText("#7");
  await expect.poll(() => submittedScores.length).toBe(1);
  expect(submittedScores[0]).toMatchObject({
    playerName: "אלוף אוטומטי",
    correctAnswers: 108,
    levelReached: 4,
    mode: "adventure",
    difficulty: "normal",
    operationMode: "multiplication",
    selectedCharacter: "bifly",
    sessionToken: "signed.test-session"
  });
  expect(submittedScores[0].playTimeMs).toBeGreaterThanOrEqual(100);
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
  expect(localOnlyUi.copy).toContain("השיא שמור במכשיר");
  expect(capabilityCount).toBeGreaterThanOrEqual(2);
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
  await expect(page.locator("#progress-panel-copy")).toContainText("צובעת את המפה");
  await expect(page.locator("#mastery-map")).toBeVisible();
  await expect(page.locator("#mastery-map").locator("[role='gridcell']")).toHaveCount(100);
  await expect(page.locator("#mastery-progress-percent")).not.toHaveText("0%");
  await expect(page.locator("#mastery-focus-facts .mastery-focus-fact")).toHaveCount(3);
  await expect(page.locator("#mastery-map .is-mastered")).toHaveCount(2);
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

test("personal daily maze uses a deterministic focus route and records completion", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem("mathMazeFactStats", JSON.stringify({
      "7×8": { correct: 0, wrong: 4, streak: 0 },
      "6×9": { correct: 1, wrong: 3, streak: 0 },
      "4×6": { correct: 1, wrong: 2, streak: 0 }
    }));
  });
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await setNickname(page, "בודק יומי");
  await expect(page.locator("#daily-challenge-open")).toBeVisible();
  await expect(page.locator("#daily-home-status")).toContainText("10");
  const dailyEntryLayout = await page.locator("#daily-challenge-open").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      parentClass: element.parentElement?.className || "",
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });
  expect(dailyEntryLayout.parentClass).toContain("menu-actions");
  expect(dailyEntryLayout.width).toBeLessThanOrEqual(80);
  expect(dailyEntryLayout.height).toBeLessThanOrEqual(80);

  await page.locator("#daily-challenge-open").click();
  await expect(page.locator("#daily-challenge-panel")).toBeVisible();
  await expect(page.locator("#daily-focus-facts .daily-focus-fact")).toHaveCount(3);
  await expect(page.locator("#daily-focus-facts")).toContainText("7×8");
  await page.locator("#daily-challenge-start").click();
  await expect(page.locator("#start-screen")).toBeHidden();
  await stopRuntimeAnimationLoop(page);

  const daily = await page.evaluate(() => window.__mathMazeRuntime.getDailyChallengeSnapshot());
  expect(daily.sessionKind).toBe("daily");
  expect(daily.targetCorrect).toBe(10);
  expect(daily.focusFacts).toEqual(["7×8", "6×9", "4×6"]);
  await expect(page.locator("#hud-progress-stage")).toContainText("יומי");
  await expect(page.locator("#target-correct")).toHaveText("/10");

  const question = await page.evaluate(() => window.__mathMazeRuntime.openQuestionForVerification());
  expect(question).not.toBeNull();
  await page.evaluate(() =>
    window.__mathMazeRuntime.answerCurrentQuestionForVerification(undefined, true)
  );
  await expect.poll(() => page.evaluate(() => window.__mathMazeRuntime.getDailyChallengeSnapshot().correctAnswers)).toBe(1);

  await page.evaluate(() => window.__mathMazeRuntime.forceDailyCompletionForVerification("אלוף יומי"));
  await expect(page.locator("#end-screen")).toBeVisible();
  await expect(page.locator("#end-title")).toContainText("המבוך היומי הושלם");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kaflulArcadeSave")));
  expect(saved.dailyProgress.totalCompleted).toBe(1);
  expect(saved.dailyProgress.streak).toBe(1);
  expect(errors).toEqual([]);
});

test("friend duel shares one private route and records whether the target was beaten", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.addInitScript(() => {
    const dateKey = (() => {
      const now = new Date();
      const pad = (value) => String(value).padStart(2, "0");
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    })();
    localStorage.setItem("kaflulArcadeSave", JSON.stringify({
      schemaVersion: 2,
      player: { nickname: "בודק דו קרב" },
      dailyProgress: {
        currentStreak: 1,
        streak: 1,
        lastCompletedDate: dateKey,
        totalCompleted: 1,
        bestByDate: {
          [dateKey]: {
            score: 4200,
            accuracy: 90,
            correctAnswers: 10,
            seed: 42,
            completedAt: `${dateKey}T09:00:00.000Z`
          }
        }
      }
    }));
  });
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.locator("#daily-challenge-open").click();
  await page.locator("#duel-panel-open").click();
  await expect(page.locator("#duel-panel")).toBeVisible();
  await expect(page.locator("#duel-create-code")).toBeEnabled();

  await page.locator("#duel-create-code").click();
  const code = (await page.locator("#duel-code-output").textContent()).trim();
  expect(code).toMatch(/^KF1-/);
  await page.locator("#duel-code-input").fill(code);
  await page.locator("#duel-validate-code").click();
  await expect(page.locator("#duel-opponent-preview")).toBeVisible();
  await expect(page.locator("#duel-target-score")).toContainText("4,200");
  await page.locator("#duel-start").click();

  const duel = await page.evaluate(() => window.__mathMazeRuntime.getDuelSnapshot());
  expect(duel.sessionKind).toBe("duel");
  expect(duel.targetCorrect).toBe(10);
  expect(duel.targetScore).toBe(4200);
  expect(duel.questions).toHaveLength(10);
  await expect(page.locator("#hud-progress-stage")).toContainText("דו־קרב");
  await expect(page.locator("#target-correct")).toHaveText("/10");

  await page.evaluate(() => window.__mathMazeRuntime.forceDuelCompletionForVerification({
    playerName: "אלוף דו קרב",
    win: true
  }));
  await expect(page.locator("#end-screen")).toBeVisible();
  await expect(page.locator("#end-kicker")).toContainText("ניצחת בדו־קרב");
  await expect(page.locator("#result-mode")).toHaveText("דו־קרב חברים");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kaflulArcadeSave")));
  expect(saved.duelProgress.history).toHaveLength(1);
  expect(saved.duelProgress.history[0].won).toBe(true);
  expect(errors).toEqual([]);
});

test("private weekly league creates an invite and imports anonymous friend results", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.addInitScript(() => {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 12);
    const secondDay = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2, 12);
    const dateKey = (date) => {
      const pad = (value) => String(value).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };
    localStorage.setItem("kaflulArcadeSave", JSON.stringify({
      schemaVersion: 2,
      player: { nickname: "בודק ליגה" },
      dailyProgress: {
        streak: 2,
        totalCompleted: 2,
        lastCompletedDate: dateKey(secondDay),
        bestByDate: {
          [dateKey(monday)]: { score: 3200, accuracy: 85, correctAnswers: 10 },
          [dateKey(secondDay)]: { score: 4100, accuracy: 95, correctAnswers: 10 }
        }
      }
    }));
  });
  await page.goto("/?verify=1", { waitUntil: "domcontentloaded" });
  await page.locator("#daily-challenge-open").click();
  await page.locator("#league-panel-open").click();
  await expect(page.locator("#league-panel")).toBeVisible();
  await page.locator("#league-create").click();
  await expect(page.locator("#league-active")).toBeVisible();
  await expect(page.locator("#league-invite-output")).toContainText("KL1-");
  await expect(page.locator("#league-result-output")).toContainText("KR1-");
  await expect(page.locator("#league-my-points")).toContainText("7,300");
  await expect(page.locator("#league-standings li")).toHaveCount(1);

  const friendCode = await page.evaluate(() => {
    const snapshot = window.__mathMazeRuntime.getLeagueSnapshot();
    return window.KaflulSystems.createWeeklyLeagueResultCode(snapshot.currentLeague, 4567, {
      points: 9600,
      daysPlayed: 4,
      accuracy: 92
    });
  });
  await page.locator("#league-result-input").fill(friendCode);
  await page.locator("#league-import-result").click();
  await expect(page.locator("#league-import-status")).toContainText("נוספה לטבלה");
  await expect(page.locator("#league-standings li")).toHaveCount(2);
  await expect(page.locator("#league-standings li").first()).toContainText("9,600");
  const snapshot = await page.evaluate(() => window.__mathMazeRuntime.getLeagueSnapshot());
  expect(snapshot.standings).toHaveLength(2);
  expect(snapshot.standings[0].points).toBe(9600);
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
  await page.locator("#difficulty-panel label", { hasText: "קשה" }).click();
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
