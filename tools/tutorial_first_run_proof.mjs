#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROOF_ROOT = path.join(ROOT, "docs", "visual-proof-screenshots", "tutorial-anchored-flow");
const BEFORE_DIR = path.join(PROOF_ROOT, "before");
const OUTPUT_DIR = path.join(PROOF_ROOT, "after");
const EXTERNAL_URL = process.env.KAFLUL_PROOF_URL || "";
const VIDEO_FPS = 10;

const viewports = [
  { name: "desktop-1280x800", width: 1280, height: 800, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true }
];

const pointerCaptures = new Map([
  [1, "settings-hand"],
  [2, "settings-mode-stable"],
  [3, "mode-hand"],
  [4, "difficulty-hand"],
  [5, "difficulty-choice"],
  [6, "controls-hand"],
  [7, "character-button-stable"],
  [8, "character-hand"],
  [9, "character-confirm"],
  [10, "start-hand"]
]);

const feedbackCaptures = new Map([
  [1, "settings-explanation"],
  [3, "worlds-explanation"],
  [4, "difficulty-explanation"],
  [5, "score-explanation"],
  [6, "movement-explanation"],
  [7, "character-explanation"],
  [9, "maze-explanation"],
  [10, "goal-explanation"]
]);

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".json") || filePath.endsWith(".webmanifest")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".wav")) return "audio/wav";
  if (filePath.endsWith(".m4a")) return "audio/mp4";
  return "application/octet-stream";
}

async function startLocalServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const resolved = await resolveStaticFile(ROOT, url.pathname);
      const bytes = await readFile(resolved);
      response.writeHead(200, {
        "content-type": contentType(resolved),
        "cache-control": "no-store"
      });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function prepareBeforeProof() {
  await mkdir(BEFORE_DIR, { recursive: true });
  const previousDir = path.join(ROOT, "docs", "visual-proof-screenshots", "tutorial-coach-marks", "after");
  for (const viewport of viewports) {
    const source = path.join(previousDir, `coach-01-settings-hand-${viewport.name}.png`);
    const target = path.join(BEFORE_DIR, `coach-01-before-${viewport.name}.png`);
    await copyFile(source, target).catch(() => undefined);
  }
}

async function capture(page, name, artifacts) {
  const target = path.join(OUTPUT_DIR, `${name}.png`);
  await page.waitForTimeout(240);
  await page.screenshot({ path: target, animations: "allow" });
  artifacts.push(path.relative(ROOT, target));
}

function insideViewport(rect, viewport, tolerance = 2) {
  return Boolean(
    rect && rect.width > 0 && rect.height > 0
    && rect.left >= -tolerance && rect.top >= -tolerance
    && rect.right <= viewport.width + tolerance
    && rect.bottom <= viewport.height + tolerance
  );
}

function ringAlignmentError(layout) {
  if (!layout.target || !layout.ring) return Number.POSITIVE_INFINITY;
  const padding = layout.viewport.width <= 600 ? 6 : 9;
  const expected = {
    left: Math.max(0, layout.target.left - padding),
    top: Math.max(0, layout.target.top - padding),
    right: Math.min(layout.viewport.width, layout.target.right + padding),
    bottom: Math.min(layout.viewport.height, layout.target.bottom + padding)
  };
  return Math.max(
    Math.abs(layout.ring.left - expected.left),
    Math.abs(layout.ring.top - expected.top),
    Math.abs(layout.ring.right - expected.right),
    Math.abs(layout.ring.bottom - expected.bottom)
  );
}

function rectangleProximity(first, second) {
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    Math.max(first.left - second.right, second.left - first.right, 0),
    Math.max(first.top - second.bottom, second.top - first.bottom, 0)
  );
}

function rectangleDrift(first, second) {
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return Math.max(
    Math.abs(first.left - second.left),
    Math.abs(first.top - second.top),
    Math.abs(first.right - second.right),
    Math.abs(first.bottom - second.bottom)
  );
}

async function coachLayout(page) {
  return page.evaluate(() => {
    const rectangle = (selector) => {
      const element = document.querySelector(selector);
      if (!element || element.hidden) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    };
    return {
      state: window.KaflulTutorial?.getState?.(),
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      target: rectangle(".kf-coach-active-target"),
      ring: rectangle("#tutorial-target-ring"),
      hand: rectangle("#tutorial-hand"),
      card: rectangle("#tutorial-coach-card"),
      action: rectangle("#tutorial-action-pill"),
      status: rectangle("#tutorial-coach-status"),
      speech: rectangle("#tutorial-speech-bubble"),
      cardOpacity: getComputedStyle(document.getElementById("tutorial-coach-card")).opacity,
      placement: document.getElementById("tutorial-coach-card")?.dataset.placement || null,
      lockVisible: !document.getElementById("tutorial-lock-message")?.hidden
    };
  });
}

async function sampleAwaitingStability(page, sampleCount = 6, intervalMs = 40) {
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const layout = await coachLayout(page);
    samples.push({
      elapsedMs: index * intervalMs,
      target: layout.target,
      ring: layout.ring,
      card: layout.card,
      alignmentError: ringAlignmentError(layout)
    });
    if (index < sampleCount - 1) await page.waitForTimeout(intervalMs);
  }
  return samples;
}

async function waitForTutorialState(page, step, phase) {
  await page.waitForFunction(
    ({ expectedStep, expectedPhase }) => {
      const state = window.KaflulTutorial?.getState?.();
      return state?.currentStep === expectedStep && state?.phase === expectedPhase;
    },
    { expectedStep: step, expectedPhase: phase },
    { timeout: 7_000 }
  );
}

async function finishStageIntro(page) {
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady, null, { timeout: 10_000 });
  await page.evaluate(() => {
    if (window.__mathMazeRuntime?.getStageIntroCameraSnapshot?.().active) {
      window.__mathMazeRuntime.setStageIntroProgressForVerification?.(0.995);
    }
  });
  await page.waitForFunction(
    () => !window.__mathMazeRuntime?.getStageIntroCameraSnapshot?.().active,
    null,
    { timeout: 5_000 }
  ).catch(() => undefined);
  await page.waitForTimeout(380);
}

async function captureVideoFrames(page, framesDir, counter, count, intervalMs = 95) {
  for (let index = 0; index < count; index += 1) {
    const framePath = path.join(framesDir, `frame-${String(counter.value).padStart(5, "0")}.png`);
    await page.screenshot({ path: framePath, animations: "allow" });
    counter.value += 1;
    await page.waitForTimeout(intervalMs);
  }
}

async function encodeVideo(framesDir, outputPath) {
  const encoder = path.join(ROOT, "tools", "encode_png_sequence.swift");
  await new Promise((resolve, reject) => {
    const child = spawn("swift", [encoder, framesDir, outputPath, String(VIDEO_FPS)], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Video encoding failed (${code}): ${stderr || stdout}`));
      }
    });
  });
}

async function runViewport(browser, baseUrl, viewport, report) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  const resourceFailures = [];
  const artifacts = [];
  const layouts = [];
  const framesDir = viewport.mobile ? path.join(OUTPUT_DIR, `.video-frames-${Date.now()}`) : null;
  const frameCounter = { value: 0 };
  if (framesDir) await mkdir(framesDir, { recursive: true });

  page.on("pageerror", (error) => runtimeErrors.push(String(error)));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      resourceFailures.push({ status: response.status(), url: response.url() });
    }
  });
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText || "request failed";
    if (error !== "net::ERR_ABORTED") {
      resourceFailures.push({ error, url: request.url() });
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.route("**/api/champions**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      publicAvailable: false,
      publicSubmissionsAvailable: false,
      code: "leaderboard_not_configured",
      message: "Leaderboard is disabled in the isolated tutorial proof."
    })
  }));
  await page.addInitScript(() => {
    localStorage.removeItem("kaflulArcadeSave");
    localStorage.removeItem("kaflulFirstRunTutorialV1");
  });

  await page.goto(`${baseUrl}/?tutorial=1`, { waitUntil: "domcontentloaded" });
  await page.locator("#first-run-tutorial").waitFor({ state: "visible", timeout: 10_000 });
  await waitForTutorialState(page, 1, "awaiting");
  const tutorialTotal = await page.evaluate(() => window.KaflulTutorial?.getState?.().totalSteps || 0);
  const initialSelections = await page.evaluate(() => ({
    mode: document.querySelector('input[name="game-mode"]:checked')?.value,
    difficulty: document.querySelector('input[name="difficulty"]:checked')?.value,
    character: document.querySelector('input[name="character"]:checked')?.value,
    control: document.querySelector('input[name="control-mode"]:checked')?.value
  }));

  await page.locator("#start-button").click({ force: true });
  await page.waitForTimeout(100);
  const blockedState = await page.evaluate(() => ({
    tutorial: window.KaflulTutorial?.getState?.(),
    startVisible: !document.getElementById("start-screen")?.hidden,
    lockVisible: !document.getElementById("tutorial-lock-message")?.hidden
  }));
  const wrongClickBlocked = blockedState.tutorial?.currentStep === 1
    && blockedState.tutorial?.phase === "awaiting"
    && blockedState.startVisible
    && blockedState.lockVisible;
  await page.waitForTimeout(1300);

  const forbiddenGeometryTransitions = await page.evaluate(() => {
    const selectors = [
      "#tutorial-dim-layer",
      "#tutorial-target-ring",
      "#tutorial-hand",
      "#tutorial-action-pill",
      "#tutorial-coach-status"
    ];
    return selectors.flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [];
      return getComputedStyle(element).transitionProperty
        .split(",")
        .map((property) => ({ selector, property: property.trim() }))
        .filter(({ property }) => ["top", "right", "bottom", "left", "width", "height", "border-radius"].includes(property));
    });
  });

  for (let step = 1; step <= tutorialTotal; step += 1) {
    await waitForTutorialState(page, step, "awaiting");
    const awaitingLayout = await coachLayout(page);
    awaitingLayout.phase = "awaiting";
    awaitingLayout.step = step;
    awaitingLayout.stabilitySamples = await sampleAwaitingStability(page);
    awaitingLayout.maxAlignmentError = Math.max(
      ...awaitingLayout.stabilitySamples.map((sample) => sample.alignmentError)
    );
    awaitingLayout.maxCardDrift = Math.max(
      ...awaitingLayout.stabilitySamples.map((sample) => rectangleDrift(
        awaitingLayout.stabilitySamples[0].card,
        sample.card
      ))
    );
    awaitingLayout.cardProximity = rectangleProximity(awaitingLayout.target, awaitingLayout.card);
    layouts.push(awaitingLayout);

    if (pointerCaptures.has(step)) {
      await capture(page, `coach-${String(step).padStart(2, "0")}-${pointerCaptures.get(step)}-${viewport.name}`, artifacts);
    }
    if (framesDir) {
      await captureVideoFrames(page, framesDir, frameCounter, 6);
    }

    await page.locator(".kf-coach-active-target").click();
    await waitForTutorialState(page, step, "feedback");
    const feedbackLayout = await coachLayout(page);
    feedbackLayout.phase = "feedback";
    feedbackLayout.step = step;
    feedbackLayout.anchor = awaitingLayout.target;
    feedbackLayout.cardProximity = rectangleProximity(feedbackLayout.anchor, feedbackLayout.card);
    feedbackLayout.cardShiftFromInstruction = rectangleDrift(awaitingLayout.card, feedbackLayout.card);
    feedbackLayout.feedbackLatencyMs = feedbackLayout.state?.lastFeedbackLatencyMs ?? Number.POSITIVE_INFINITY;
    layouts.push(feedbackLayout);

    if (feedbackCaptures.has(step)) {
      await capture(page, `coach-${String(step).padStart(2, "0")}-${feedbackCaptures.get(step)}-${viewport.name}`, artifacts);
    }
    if (framesDir) {
      await captureVideoFrames(page, framesDir, frameCounter, step === tutorialTotal ? 16 : 10);
    }

    if (step < tutorialTotal) {
      await waitForTutorialState(page, step + 1, "awaiting");
    }
  }

  await page.locator("#first-run-tutorial").waitFor({ state: "hidden", timeout: 6_000 });
  if (await page.locator("#settings-panel").isVisible()) {
    const nicknameEntryGeometry = await page.evaluate(() => {
      const sheet = document.querySelector("#settings-panel .menu-sheet-inner");
      const input = document.getElementById("player-name-input");
      const rect = input?.getBoundingClientRect();
      return {
        scrollTop: sheet?.scrollTop ?? Number.POSITIVE_INFINITY,
        top: rect?.top ?? -1,
        bottom: rect?.bottom ?? Number.POSITIVE_INFINITY,
        viewportHeight: innerHeight
      };
    });
    if (
      nicknameEntryGeometry.scrollTop > 1
      || nicknameEntryGeometry.top < 0
      || nicknameEntryGeometry.bottom > nicknameEntryGeometry.viewportHeight
    ) {
      throw new Error(`Nickname entry is not visible after tutorial: ${JSON.stringify(nicknameEntryGeometry)}`);
    }
    await page.locator("#player-name-input").fill("בודק מדריך");
    await page.locator("#settings-save-button").click();
    await page.locator("#settings-panel").waitFor({ state: "hidden", timeout: 5_000 });
    await page.locator("#start-button").click();
  }
  await page.locator("#start-screen").waitFor({ state: "hidden", timeout: 5_000 });
  await finishStageIntro(page);
  await capture(page, `first-playable-maze-${viewport.name}`, artifacts);

  const persisted = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("kaflulArcadeSave") || "null");
    return {
      tutorial: localStorage.getItem("kaflulFirstRunTutorialV1"),
      mode: save?.settings?.selectedMode,
      difficulty: save?.settings?.selectedDifficulty,
      character: save?.settings?.selectedCharacter,
      control: save?.settings?.controlMode
    };
  });

  let videoArtifact = null;
  if (framesDir) {
    const videoPath = path.join(OUTPUT_DIR, "tutorial-coach-marks-mobile-390x844.mp4");
    await encodeVideo(framesDir, videoPath);
    videoArtifact = path.relative(ROOT, videoPath);
    await rm(framesDir, { recursive: true, force: true });
  }

  const invalidLayouts = layouts.filter((layout) => {
    const targetRequired = layout.phase === "awaiting";
    const speechRequired = layout.phase === "feedback";
    return layout.documentWidth > layout.viewport.width + 1
      || !insideViewport(layout.status, layout.viewport)
      || (targetRequired && (
        !insideViewport(layout.target, layout.viewport)
        || !insideViewport(layout.ring, layout.viewport)
        || !insideViewport(layout.hand, layout.viewport)
        || !insideViewport(layout.card, layout.viewport)
        || !insideViewport(layout.action, layout.viewport)
        || layout.maxAlignmentError > 1
        || layout.maxCardDrift > 1
        || layout.cardProximity < 8
        || layout.cardProximity > 30
        || layout.cardOpacity !== "1"
        || !["above", "below", "left", "right"].includes(layout.placement)
      ))
      || (speechRequired && (
        !insideViewport(layout.speech, layout.viewport)
        || !insideViewport(layout.card, layout.viewport)
        || layout.cardProximity < 8
        || layout.cardProximity > 30
        || layout.cardShiftFromInstruction > 1
        || layout.feedbackLatencyMs > 500
        || layout.cardOpacity !== "1"
      ));
  });

  const falseLockFeedback = layouts.filter((layout) => layout.phase === "feedback" && layout.lockVisible);

  const expectedPersistence = persisted.tutorial === "complete"
    && persisted.mode === initialSelections.mode
    && persisted.difficulty === initialSelections.difficulty
    && persisted.character === "nabatick"
    && persisted.control === initialSelections.control;
  if (
    runtimeErrors.length || resourceFailures.length || invalidLayouts.length || falseLockFeedback.length
    || forbiddenGeometryTransitions.length
    || !wrongClickBlocked || !expectedPersistence
  ) {
    throw new Error(JSON.stringify({
      viewport: viewport.name,
      runtimeErrors,
      resourceFailures,
      falseLockFeedback,
      invalidLayouts,
      forbiddenGeometryTransitions,
      wrongClickBlocked,
      initialSelections,
      persisted
    }, null, 2));
  }

  report.viewports.push({
    name: viewport.name,
    wrongClickBlocked,
    tutorialTotal,
    forbiddenGeometryTransitions,
    layouts,
    initialSelections,
    persisted,
    runtimeErrors,
    resourceFailures,
    artifacts,
    video: videoArtifact
  });
  await context.close();
}

await mkdir(OUTPUT_DIR, { recursive: true });
await prepareBeforeProof();
const local = EXTERNAL_URL ? { server: null, url: EXTERNAL_URL } : await startLocalServer();
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: local.url,
  interactionModel: "Only the highlighted real control accepts input; a small anchored bubble stays beside it and changes to feedback without jumping.",
  viewports: []
};
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    await runViewport(browser, local.url, viewport, report);
  }
  const reportPath = path.join(OUTPUT_DIR, "tutorial-coach-proof-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path.relative(ROOT, reportPath));
} finally {
  await browser.close();
  await closeServer(local.server);
}
