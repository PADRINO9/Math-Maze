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

async function stopRuntimeAnimationLoop(page) {
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.waitForTimeout(50);
}

async function coachAlignmentError(page) {
  return page.evaluate(() => {
    const target = document.querySelector(".kf-coach-active-target");
    const ring = document.getElementById("tutorial-target-ring");
    if (!(target instanceof HTMLElement) || !(ring instanceof HTMLElement)) {
      return Number.POSITIVE_INFINITY;
    }
    const targetRect = target.getBoundingClientRect();
    const ringRect = ring.getBoundingClientRect();
    const padding = innerWidth <= 600 ? 6 : 9;
    const expected = {
      left: Math.max(0, targetRect.left - padding),
      top: Math.max(0, targetRect.top - padding),
      right: Math.min(innerWidth, targetRect.right + padding),
      bottom: Math.min(innerHeight, targetRect.bottom + padding)
    };
    return Math.max(
      Math.abs(ringRect.left - expected.left),
      Math.abs(ringRect.top - expected.top),
      Math.abs(ringRect.right - expected.right),
      Math.abs(ringRect.bottom - expected.bottom)
    );
  });
}

async function expectCoachAligned(page) {
  await expect.poll(() => coachAlignmentError(page), { timeout: 2_000 }).toBeLessThanOrEqual(1);
  const initialCardRect = await page.locator("#tutorial-coach-card").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  });
  await page.waitForTimeout(220);
  expect(await coachAlignmentError(page)).toBeLessThanOrEqual(1);
  const renderHealth = await page.evaluate(() => {
    const target = document.querySelector(".kf-coach-active-target");
    const card = document.getElementById("tutorial-coach-card");
    const dimLayer = document.getElementById("tutorial-dim-layer");
    if (
      !(target instanceof HTMLElement) || !(card instanceof HTMLElement)
      || !(dimLayer instanceof HTMLCanvasElement)
    ) {
      return null;
    }
    const context = dimLayer.getContext("2d");
    if (!context) return null;
    const targetRect = target.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const dimRect = dimLayer.getBoundingClientRect();
    const targetStyle = getComputedStyle(target);
    const cardStyle = getComputedStyle(card);
    const sampleAlpha = (x, y) => context.getImageData(
      Math.max(0, Math.min(dimLayer.width - 1, Math.round(x))),
      Math.max(0, Math.min(dimLayer.height - 1, Math.round(y))),
      1,
      1
    ).data[3];
    const corners = [
      { x: 1, y: 1 },
      { x: innerWidth - 2, y: 1 },
      { x: 1, y: innerHeight - 2 },
      { x: innerWidth - 2, y: innerHeight - 2 }
    ];
    const outside = corners.sort((a, b) => {
      const distanceA = Math.hypot(a.x - targetRect.x, a.y - targetRect.y);
      const distanceB = Math.hypot(b.x - targetRect.x, b.y - targetRect.y);
      return distanceB - distanceA;
    })[0];
    const holePadding = innerWidth <= 600 ? 6 : 9;
    const holeLeft = targetRect.left - holePadding;
    const holeRight = targetRect.right + holePadding;
    const rowOutsideAlphas = [];
    for (let x = 2; x < innerWidth - 2; x += 8) {
      if (x < holeLeft - 2 || x > holeRight + 2) {
        rowOutsideAlphas.push(sampleAlpha(x, targetRect.top + targetRect.height / 2));
      }
    }
    const centerElement = document.elementFromPoint(
      targetRect.left + targetRect.width / 2,
      targetRect.top + targetRect.height / 2
    );
    return {
      targetFilter: targetStyle.filter,
      targetBackdrop: targetStyle.backdropFilter,
      targetLabel: target.innerText.trim()
        || target.getAttribute("aria-label")?.trim()
        || target.getAttribute("title")?.trim()
        || "",
      centerHitsTarget: Boolean(centerElement && target.contains(centerElement)),
      cardTransform: cardStyle.transform,
      cardTransition: cardStyle.transitionProperty,
      placement: card.dataset.placement,
      dimTargetAlpha: sampleAlpha(
        targetRect.left + targetRect.width / 2,
        targetRect.top + targetRect.height / 2
      ),
      dimOutsideAlpha: sampleAlpha(outside.x, outside.y),
      dimRowOutsideSampleCount: rowOutsideAlphas.length,
      dimRowOutsideAlphaMin: rowOutsideAlphas.length ? Math.min(...rowOutsideAlphas) : null,
      dimRowOutsideAlphaMax: rowOutsideAlphas.length ? Math.max(...rowOutsideAlphas) : null,
      stepId: window.KaflulTutorial?.getState?.().stepId || null,
      dimRect: {
        left: dimRect.left,
        top: dimRect.top,
        width: dimRect.width,
        height: dimRect.height
      },
      dimBacking: { width: dimLayer.width, height: dimLayer.height },
      cardRect: {
        left: cardRect.left,
        top: cardRect.top,
        right: cardRect.right,
        bottom: cardRect.bottom
      },
      proximity: Math.hypot(
        Math.max(targetRect.left - cardRect.right, cardRect.left - targetRect.right, 0),
        Math.max(targetRect.top - cardRect.bottom, cardRect.top - targetRect.bottom, 0)
      ),
      viewport: { width: innerWidth, height: innerHeight }
    };
  });
  expect(renderHealth).not.toBeNull();
  expect(renderHealth.targetFilter).toBe("none");
  expect(renderHealth.targetBackdrop).toBe("none");
  expect(renderHealth.targetLabel.length).toBeGreaterThan(0);
  expect(renderHealth.centerHitsTarget).toBe(true);
  expect(renderHealth.cardTransform).toBe("none");
  expect(renderHealth.cardTransition).toBe("none");
  expect(["above", "below", "left", "right"]).toContain(renderHealth.placement);
  expect(renderHealth.dimTargetAlpha).toBe(0);
  expect(renderHealth.dimOutsideAlpha).toBeGreaterThan(0);
  if (renderHealth.dimRowOutsideSampleCount > 0) {
    expect(renderHealth.dimRowOutsideAlphaMin).toBeGreaterThan(0);
    expect(renderHealth.dimRowOutsideAlphaMax - renderHealth.dimRowOutsideAlphaMin).toBe(0);
  }
  if (renderHealth.stepId === "preview-character") {
    expect(renderHealth.dimRowOutsideSampleCount).toBeGreaterThan(20);
  }
  expect(renderHealth.dimRect).toEqual({
    left: 0,
    top: 0,
    width: renderHealth.viewport.width,
    height: renderHealth.viewport.height
  });
  expect(renderHealth.dimBacking).toEqual({
    width: Math.ceil(renderHealth.viewport.width),
    height: Math.ceil(renderHealth.viewport.height)
  });
  expect(renderHealth.cardRect.left).toBeGreaterThanOrEqual(8);
  expect(renderHealth.cardRect.top).toBeGreaterThanOrEqual(8);
  expect(renderHealth.cardRect.right).toBeLessThanOrEqual(renderHealth.viewport.width - 8);
  expect(renderHealth.cardRect.bottom).toBeLessThanOrEqual(renderHealth.viewport.height - 8);
  expect(renderHealth.proximity).toBeGreaterThanOrEqual(8);
  expect(renderHealth.proximity).toBeLessThanOrEqual(30);
  const stableCardRect = renderHealth.cardRect;
  expect(Math.max(
    Math.abs(stableCardRect.left - initialCardRect.left),
    Math.abs(stableCardRect.top - initialCardRect.top),
    Math.abs(stableCardRect.right - initialCardRect.right),
    Math.abs(stableCardRect.bottom - initialCardRect.bottom)
  )).toBeLessThanOrEqual(1);
}

async function clickRequiredStep(page, step, feedbackText = "") {
  await expect.poll(async () => (await tutorialState(page))?.currentStep).toBe(step);
  await expect.poll(async () => (await tutorialState(page))?.phase).toBe("awaiting");
  const activeState = await tutorialState(page);
  expect(activeState.feedbackDelayMs).toBeGreaterThanOrEqual(1_050);
  expect(activeState.feedbackDelayMs).toBeLessThanOrEqual(1_450);
  const target = page.locator(".kf-coach-active-target");
  await expect(target).toHaveCount(1);
  await expectCoachAligned(page);
  const clickedRect = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  });
  const instructionCardRect = await page.locator("#tutorial-coach-card").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  });
  await target.click();
  const clickedAt = Date.now();
  await expect.poll(async () => (await tutorialState(page))?.phase).toBe("feedback");
  const feedbackState = await tutorialState(page);
  expect(feedbackState.lastFeedbackLatencyMs).toBeLessThan(100);
  await expect(page.locator("#tutorial-speech-bubble")).toBeVisible();
  await expect(page.locator(".kf-coach-active-target")).toHaveCount(0);
  await expect(page.locator("#tutorial-lock-message")).toBeHidden();
  const feedbackGeometry = await page.evaluate(() => {
    const dimLayer = document.getElementById("tutorial-dim-layer");
    const dim = dimLayer?.getBoundingClientRect();
    const context = dimLayer instanceof HTMLCanvasElement ? dimLayer.getContext("2d") : null;
    const card = document.getElementById("tutorial-coach-card")?.getBoundingClientRect();
    return {
      dim: dim && { left: dim.left, top: dim.top, width: dim.width, height: dim.height },
      dimCenterAlpha: context?.getImageData(
        Math.floor(innerWidth / 2),
        Math.floor(innerHeight / 2),
        1,
        1
      ).data[3] || 0,
      legacyShadeCount: document.querySelectorAll("[data-coach-shade]").length,
      card: card && { left: card.left, top: card.top, right: card.right, bottom: card.bottom },
      cardOpacity: card ? getComputedStyle(document.getElementById("tutorial-coach-card")).opacity : null,
      placement: document.getElementById("tutorial-coach-card")?.dataset.placement || null,
      viewport: { width: innerWidth, height: innerHeight }
    };
  });
  expect(feedbackGeometry.dim).toEqual({
    left: 0,
    top: 0,
    width: feedbackGeometry.viewport.width,
    height: feedbackGeometry.viewport.height
  });
  expect(feedbackGeometry.dimCenterAlpha).toBeGreaterThan(0);
  expect(feedbackGeometry.legacyShadeCount).toBe(0);
  expect(feedbackGeometry.card.left).toBeGreaterThanOrEqual(8);
  expect(feedbackGeometry.card.top).toBeGreaterThanOrEqual(8);
  expect(feedbackGeometry.card.right).toBeLessThanOrEqual(feedbackGeometry.viewport.width - 8);
  expect(feedbackGeometry.card.bottom).toBeLessThanOrEqual(feedbackGeometry.viewport.height - 8);
  expect(feedbackGeometry.cardOpacity).toBe("1");
  expect(["above", "below", "left", "right"]).toContain(feedbackGeometry.placement);
  const overlapsClickedTarget = !(
    feedbackGeometry.card.right <= clickedRect.left
    || feedbackGeometry.card.left >= clickedRect.right
    || feedbackGeometry.card.bottom <= clickedRect.top
    || feedbackGeometry.card.top >= clickedRect.bottom
  );
  expect(overlapsClickedTarget).toBe(false);
  const feedbackGap = Math.hypot(
    Math.max(clickedRect.left - feedbackGeometry.card.right, feedbackGeometry.card.left - clickedRect.right, 0),
    Math.max(clickedRect.top - feedbackGeometry.card.bottom, feedbackGeometry.card.top - clickedRect.bottom, 0)
  );
  expect(feedbackGap).toBeGreaterThanOrEqual(8);
  expect(feedbackGap).toBeLessThanOrEqual(30);
  const cardShift = Math.max(
    Math.abs(feedbackGeometry.card.left - instructionCardRect.left),
    Math.abs(feedbackGeometry.card.top - instructionCardRect.top),
    Math.abs(feedbackGeometry.card.right - instructionCardRect.right),
    Math.abs(feedbackGeometry.card.bottom - instructionCardRect.bottom)
  );
  expect(cardShift, JSON.stringify({ clickedRect, instructionCardRect, feedbackGeometry })).toBeLessThanOrEqual(1);
  if (feedbackText) {
    await expect(page.locator("#tutorial-lead")).toContainText(feedbackText);
  }
  return clickedAt;
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
  await expect(page.locator("#tutorial-step-label")).toHaveText("1/10");
  await expect(page.locator("#tutorial-title")).toHaveText("לחצו על גלגל השיניים");
  await expect(page.locator("#tutorial-hand")).toBeVisible();
  await expectCoachAligned(page);

  const renderStatsBeforeNoise = await tutorialState(page).then((value) => value.renderStats);
  await page.evaluate(() => {
    for (let index = 0; index < 12; index += 1) {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }
  });
  await expect.poll(
    async () => (await tutorialState(page))?.renderStats?.skippedRepositions || 0,
    { timeout: 2_000 }
  ).toBeGreaterThan(renderStatsBeforeNoise.skippedRepositions);
  const renderStatsAfterNoise = await tutorialState(page).then((value) => value.renderStats);
  expect(renderStatsAfterNoise.targetPositions - renderStatsBeforeNoise.targetPositions).toBeLessThanOrEqual(1);
  expect(renderStatsAfterNoise.dimPaints - renderStatsBeforeNoise.dimPaints).toBeLessThanOrEqual(1);
  expect(renderStatsAfterNoise.skippedRepositions).toBeGreaterThan(renderStatsBeforeNoise.skippedRepositions);

  const guidanceMotion = await page.evaluate(() => {
    const styleFor = (selector) => getComputedStyle(document.querySelector(selector));
    const handDuration = Number.parseFloat(styleFor("#tutorial-hand").animationDuration) * 1000;
    return {
      ringAnimation: styleFor("#tutorial-target-ring").animationName,
      rippleDisplay: styleFor(".kf-coach-tap-ripple").display,
      actionDotAnimation: styleFor(".kf-coach-action-dot").animationName,
      handDuration
    };
  });
  expect(guidanceMotion.ringAnimation).toBe("none");
  expect(guidanceMotion.rippleDisplay).toBe("none");
  expect(guidanceMotion.actionDotAnimation).toBe("none");
  expect(guidanceMotion.handDuration).toBeGreaterThanOrEqual(1_500);

  const geometryTransitions = await page.evaluate(() => {
    const selectors = [
      "#tutorial-dim-layer",
      "#tutorial-target-ring",
      "#tutorial-hand",
      "#tutorial-coach-card"
    ];
    return selectors.flatMap((selector) => {
      const element = document.querySelector(selector);
      const properties = element ? getComputedStyle(element).transitionProperty.split(",") : [];
      return properties.map((property) => property.trim());
    }).filter((property) => ["top", "right", "bottom", "left", "width", "height", "border-radius"].includes(property));
  });
  expect(geometryTransitions).toEqual([]);

  const initialSelections = await page.evaluate(() => ({
    mode: document.querySelector('input[name="game-mode"]:checked')?.value,
    difficulty: document.querySelector('input[name="difficulty"]:checked')?.value,
    controlMode: document.querySelector('input[name="control-mode"]:checked')?.value,
    character: document.querySelector('input[name="character"]:checked')?.value
  }));

  await page.locator("#start-button").click({ force: true });
  await expect.poll(async () => (await tutorialState(page))?.currentStep).toBe(1);
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.locator("#tutorial-lock-message")).toBeVisible();

  const firstClickAt = await clickRequiredStep(page, 1, "מצב משחק");
  await expect(page.locator("#settings-panel")).toBeVisible();
  await waitForNextStep(page, 2);
  expect(Date.now() - firstClickAt).toBeLessThan(2_100);

  await clickRequiredStep(page, 2, "ארקייד");
  await expect(page.locator("#mode-panel")).toBeVisible();
  await waitForNextStep(page, 3);

  await clickRequiredStep(page, 3, "4 עולמות");
  await expect(page.locator(`input[name="game-mode"][value="${initialSelections.mode}"]`)).toBeChecked();
  await waitForNextStep(page, 4);

  await expect(page.locator("#settings-panel")).toBeVisible();
  await clickRequiredStep(page, 4, "3 חיים");
  await expect(page.locator("#difficulty-panel")).toBeVisible();
  await waitForNextStep(page, 5);

  await clickRequiredStep(page, 5, "קומבו");
  await expect(page.locator(`input[name="difficulty"][value="${initialSelections.difficulty}"]`)).toBeChecked();
  await waitForNextStep(page, 6);

  await expect(page.locator("#settings-panel")).toBeVisible();
  await clickRequiredStep(page, 6, "פותחת תרגיל");
  await expect(page.locator(`input[name="control-mode"][value="${initialSelections.controlMode}"]`)).toBeChecked();
  await waitForNextStep(page, 7);

  await clickRequiredStep(page, 7, "אותו כוח");
  await expect(page.locator("#hero-gallery")).toBeVisible();
  await waitForNextStep(page, 8);

  await clickRequiredStep(page, 8, "שתי דמויות");
  await waitForNextStep(page, 9);

  await clickRequiredStep(page, 9, "אוספים פריטים");
  await expect(page.locator('input[name="character"][value="nabatick"]')).toBeChecked();
  await waitForNextStep(page, 10);

  await expect(page.locator("#hero-gallery")).toBeHidden();
  await clickRequiredStep(page, 10, "4 העולמות");
  await expect(page.locator("#start-screen")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator("#tutorial-speech-bubble")).toBeVisible();
  await expect.poll(
    async () => (await tutorialState(page))?.phase,
    { timeout: 10_000 }
  ).toBe("closed");
  await expect(page.locator("#settings-panel")).toBeVisible();
  await expect(page.locator("#settings-name-error")).toContainText("כתבו כאן כינוי");
  const nicknameEntryGeometry = await page.evaluate(() => {
    const sheet = document.querySelector("#settings-panel .menu-sheet-inner");
    const input = document.getElementById("player-name-input");
    const rect = input?.getBoundingClientRect();
    return {
      scrollTop: sheet?.scrollTop ?? null,
      input: rect && { top: rect.top, bottom: rect.bottom },
      viewportHeight: innerHeight
    };
  });
  expect(nicknameEntryGeometry.scrollTop).toBeLessThanOrEqual(1);
  expect(nicknameEntryGeometry.input.top).toBeGreaterThanOrEqual(0);
  expect(nicknameEntryGeometry.input.bottom).toBeLessThanOrEqual(nicknameEntryGeometry.viewportHeight);
  await page.locator("#player-name-input").fill("שחקן חדש");
  await page.locator("#settings-save-button").click();
  await expect(page.locator("#settings-panel")).toBeHidden();
  await page.locator("#start-button").click();
  await stopRuntimeAnimationLoop(page);
  await expect(page.locator("#start-screen")).toBeHidden();
  await expect(page.locator("#pause-button")).toHaveAttribute("data-icon", "pause");
  await expect(tutorial).toBeHidden();

  const saved = await page.evaluate(() => ({
    tutorialStatus: localStorage.getItem("kaflulFirstRunTutorialV1"),
    save: JSON.parse(localStorage.getItem("kaflulArcadeSave"))
  }));
  expect(saved.tutorialStatus).toBe("complete");
  expect(saved.save.settings.selectedMode).toBe(initialSelections.mode);
  expect(saved.save.settings.selectedDifficulty).toBe(initialSelections.difficulty);
  expect(saved.save.settings.selectedCharacter).toBe("nabatick");
  expect(saved.save.settings.controlMode).toBe(initialSelections.controlMode);
  expect(saved.save.player.nickname).toBe("שחקן חדש");

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
