const { test, expect } = require("@playwright/test");

function collectRuntimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function getVisibleRectAudit(page, selectors) {
  return page.evaluate((selectorList) => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight
    };

    const rects = selectorList.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return { selector, missing: true };
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible = box.width > 0
        && box.height > 0
        && style.display !== "none"
        && style.visibility !== "hidden";
      return {
        selector,
        missing: false,
        visible,
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        right: Math.round(box.right),
        bottom: Math.round(box.bottom),
        clipped: visible && (
          box.x < -1
          || box.y < -1
          || box.right > window.innerWidth + 1
          || box.bottom > window.innerHeight + 1
        )
      };
    });

    return {
      viewport,
      rects,
      missing: rects.filter((rect) => rect.missing).map((rect) => rect.selector),
      clipped: rects.filter((rect) => rect.clipped).map((rect) => rect.selector)
    };
  }, selectors);
}

async function getTapTargetAudit(page, selectors) {
  return page.evaluate((selectorList) => selectorList.map((selector) => {
    const element = document.querySelector(selector);
    if (!element) return { selector, missing: true };
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const visible = box.width > 0
      && box.height > 0
      && style.display !== "none"
      && style.visibility !== "hidden";
    return {
      selector,
      missing: false,
      visible,
      width: Math.round(box.width),
      height: Math.round(box.height),
      tooSmall: visible && (box.width < 40 || box.height < 40)
    };
  }), selectors);
}

async function getCanvasPixelProbe(page) {
  return page.locator("#game-canvas").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const sample = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    let bright = 0;

    for (let index = 0; index < sample.length; index += 4 * 173) {
      const alpha = sample[index + 3];
      const light = sample[index] + sample[index + 1] + sample[index + 2];
      if (alpha > 0 && light > 8) painted += 1;
      if (alpha > 0 && light > 240) bright += 1;
    }

    return {
      width: canvas.width,
      height: canvas.height,
      painted,
      bright
    };
  });
}

async function enterAnswerWithKeypad(page, answer) {
  for (const digit of String(answer)) {
    await page.locator(`[data-keypad-digit="${digit}"]`).click();
  }
  await page.locator('[data-keypad-action="submit"]').click();
}

test("phase 1 mobile vertical slice keeps home and first gameplay view playable", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!testInfo.project.name.includes("mobile"), "Phase 1 vertical slice gate is mobile-first.");
  const errors = collectRuntimeErrors(page);

  await page.goto("/?verify=phase1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();
  await page.waitForTimeout(350);

  const appShell = await page.evaluate(async () => {
    const manifestLink = document.querySelector("link[rel='manifest']");
    const appleIcon = document.querySelector("link[rel='apple-touch-icon']");
    const applicationName = document.querySelector("meta[name='application-name']");
    const manifestHref = manifestLink?.getAttribute("href") || "";
    const response = await fetch(manifestHref, { cache: "no-store" });
    const manifest = await response.json();
    return {
      applicationName: applicationName?.getAttribute("content") || "",
      appleIcon: appleIcon?.getAttribute("href") || "",
      manifestHref,
      manifestOk: response.ok,
      manifest
    };
  });
  expect(appShell.applicationName).toBe("כפלול");
  expect(appShell.appleIcon).toBe("assets/bifly-player.png");
  expect(appShell.manifestHref).toContain("app.webmanifest");
  expect(appShell.manifestOk).toBe(true);
  expect(appShell.manifest.display).toBe("fullscreen");
  expect(appShell.manifest.orientation).toBe("portrait-primary");
  expect(appShell.manifest.start_url).toBe("/?source=app");
  expect(appShell.manifest.scope).toBe("/");
  expect(appShell.manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true);

  const homeAudit = await getVisibleRectAudit(page, [
    "#start-screen",
    ".home-player-bar",
    ".menu-actions",
    ".menu-logo",
    ".home-hero-scene",
    ".menu-character-options",
    "#start-button",
    ".home-bottom-nav"
  ]);
  expect(homeAudit.viewport.scrollWidth).toBeLessThanOrEqual(homeAudit.viewport.width + 1);
  expect(homeAudit.missing).toEqual([]);
  expect(homeAudit.clipped).toEqual([]);

  const tapTargets = await getTapTargetAudit(page, [
    "#menu-sound-button",
    "#menu-settings-button",
    "#start-button",
    "#character-control-button",
    "#mode-control-button",
    "#difficulty-control-button",
    "#home-nav-game",
    "#home-nav-progress",
    "#home-nav-champions"
  ]);
  expect(tapTargets.filter((target) => target.missing).map((target) => target.selector)).toEqual([]);
  expect(tapTargets.filter((target) => target.tooSmall).map((target) => target.selector)).toEqual([]);

  const characterImages = await page.locator(".character-card img").evaluateAll((images) =>
    images.map((image) => ({
      src: image.getAttribute("src"),
      loaded: image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    }))
  );
  expect(characterImages.every((image) => image.loaded)).toBe(true);

  await page.locator("#menu-settings-button").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await expect(page.locator("input[name='control-mode'][value='swipe']")).toBeChecked();
  await expect(page.locator("input[name='control-mode'][value='joystick']")).not.toBeChecked();
  await page.locator("#settings-panel [data-close-panel]").click();
  await expect(page.locator("#settings-panel")).toBeHidden();

  await page.locator("#start-button").click();
  await expect(page.locator("#start-screen")).toBeHidden();
  await expect(page.locator("#game-canvas")).toBeVisible();
  await page.waitForFunction(() => window.__mathMazeRuntime?.getPlayerSnapshot?.()?.phase === "playing");
  await expect(page.locator("html")).toHaveClass(/control-swipe/);
  await expect(page.locator("#movement-joystick")).toBeHidden();

  const swipeSnapshot = await page.evaluate(() => {
    const stageElement = document.querySelector(".stage");
    if (!stageElement) return null;
    const box = stageElement.getBoundingClientRect();
    const startX = box.left + box.width * 0.58;
    const y = box.top + box.height * 0.58;
    const endX = startX - 96;
    const init = { bubbles: true, cancelable: true, pointerId: 91, pointerType: "touch" };
    stageElement.dispatchEvent(new PointerEvent("pointerdown", { ...init, clientX: startX, clientY: y }));
    stageElement.dispatchEvent(new PointerEvent("pointermove", { ...init, clientX: endX, clientY: y }));
    stageElement.dispatchEvent(new PointerEvent("pointerup", { ...init, clientX: endX, clientY: y }));
    return window.__mathMazeRuntime?.getPlayerSnapshot?.() || null;
  });
  expect(swipeSnapshot?.phase).toBe("playing");
  expect(swipeSnapshot?.controlMode).toBe("swipe");
  expect(swipeSnapshot?.desiredDirection).toBe("left");
  await page.waitForTimeout(650);

  const gameplayAudit = await getVisibleRectAudit(page, [
    ".hud",
    ".stage",
    "#game-canvas",
    "#pause-button",
    "#sound-button",
    "#pause-button .ui-icon",
    "#sound-button .ui-icon"
  ]);
  expect(gameplayAudit.viewport.scrollWidth).toBeLessThanOrEqual(gameplayAudit.viewport.width + 1);
  expect(gameplayAudit.missing).toEqual([]);
  expect(gameplayAudit.clipped).toEqual([]);
  await expect(page.locator("html")).toHaveClass(/control-swipe/);
  await expect(page.locator("#movement-joystick")).toBeHidden();

  const gameplayTapTargets = await getTapTargetAudit(page, [
    "#pause-button",
    "#sound-button"
  ]);
  expect(gameplayTapTargets.filter((target) => target.missing).map((target) => target.selector)).toEqual([]);
  expect(gameplayTapTargets.filter((target) => target.tooSmall).map((target) => target.selector)).toEqual([]);

  const mobileControls = await page.evaluate(() => {
    const selectors = ["#pause-button .ui-icon", "#sound-button .ui-icon"];
    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      const style = element ? getComputedStyle(element) : null;
      return {
        selector,
        visible: Boolean(element) && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
        color: style?.color || "",
        opacity: style?.opacity || ""
      };
    });
  });
  expect(mobileControls.every((control) => control.visible)).toBe(true);
  expect(mobileControls.map((control) => control.color)).not.toContain("rgba(0, 0, 0, 0)");
  expect(mobileControls.map((control) => control.opacity)).not.toContain("0");

  const canvasBox = gameplayAudit.rects.find((rect) => rect.selector === "#game-canvas");
  expect(canvasBox.width).toBeGreaterThan(300);
  expect(canvasBox.height).toBeGreaterThan(300);

  const canvasProbe = await getCanvasPixelProbe(page);
  expect(canvasProbe.width).toBeGreaterThan(300);
  expect(canvasProbe.height).toBeGreaterThan(300);
  expect(canvasProbe.painted).toBeGreaterThan(100);
  expect(canvasProbe.bright).toBeGreaterThan(10);

  await page.evaluate(() => window.__mathMazeRuntime?.extendQuestionFeedbackDelayForVerification?.(1200));

  const firstQuestion = await page.evaluate(() => window.__mathMazeRuntime?.openQuestionForVerification?.());
  expect(typeof firstQuestion?.answer).toBe("number");
  await expect(page.locator("#question-dialog")).toBeVisible();
  await expect(page.locator("#movement-joystick")).toBeHidden();

  await enterAnswerWithKeypad(page, firstQuestion.answer);
  const correctFeedback = await page.evaluate(() => ({
    result: window.__mathMazeRuntime?.questionFeedbackResult ?? null,
    dialogResult: document.querySelector("#question-dialog")?.getAttribute("data-answer-result") ?? null,
    text: document.querySelector("#question-feedback")?.textContent?.trim() || ""
  }));
  expect(correctFeedback.result).toBe("correct");
  expect(correctFeedback.dialogResult).toBe("correct");
  expect(correctFeedback.text.length).toBeGreaterThan(0);

  const correctFeedbackAudit = await getVisibleRectAudit(page, [
    "#question-dialog",
    "#question-dialog .dialog-inner",
    "#question-feedback"
  ]);
  expect(correctFeedbackAudit.missing).toEqual([]);
  expect(correctFeedbackAudit.clipped).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.__mathMazeRuntime?.questionFeedbackResult ?? null))
    .toBe(null);
  expect(await page.locator("#question-dialog").getAttribute("data-answer-result")).toBe(null);
  await expect(page.locator("#movement-joystick")).toBeHidden();

  const secondQuestion = await page.evaluate(() => window.__mathMazeRuntime?.openQuestionForVerification?.());
  expect(typeof secondQuestion?.answer).toBe("number");
  const wrongAnswer = secondQuestion.answer === 1 ? 2 : 1;

  await expect(page.locator("#question-dialog")).toBeVisible();
  await enterAnswerWithKeypad(page, wrongAnswer);
  const wrongFeedback = await page.evaluate(() => ({
    result: window.__mathMazeRuntime?.questionFeedbackResult ?? null,
    dialogResult: document.querySelector("#question-dialog")?.getAttribute("data-answer-result") ?? null,
    text: document.querySelector("#question-feedback")?.textContent?.trim() || ""
  }));
  expect(wrongFeedback.result).toBe("wrong");
  expect(wrongFeedback.dialogResult).toBe("wrong");
  expect(wrongFeedback.text).toContain(String(secondQuestion.answer));
  await expect
    .poll(() => page.evaluate(() => window.__mathMazeRuntime?.questionFeedbackResult ?? null))
    .toBe(null);
  expect(await page.locator("#question-dialog").getAttribute("data-answer-result")).toBe(null);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#start-screen")).toBeVisible();
  await page.locator("#menu-settings-button").click();
  await page.locator("#settings-panel label", { hasText: "ג׳ויסטיק" }).click();
  await expect(page.locator("input[name='control-mode'][value='joystick']")).toBeChecked();
  await page.locator("#settings-panel [data-close-panel]").click();
  await page.locator("#start-button").click();
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/control-joystick/);
  await expect(page.locator("#movement-joystick")).toBeVisible();

  const runtimeErrors = await page.evaluate(() => window.__mathMazeRuntime?.errors || []);
  expect(runtimeErrors).toEqual([]);
  expect(errors).toEqual([]);
});
