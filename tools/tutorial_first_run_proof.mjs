#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROOF_ROOT = path.join(ROOT, "docs", "visual-proof-screenshots", "tutorial-coach-marks");
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
  [3, "mode-hand"],
  [5, "difficulty-hand"],
  [8, "controls-hand"],
  [10, "character-hand"],
  [13, "start-hand"]
]);

const feedbackCaptures = new Map([
  [1, "settings-explanation"],
  [3, "worlds-explanation"],
  [6, "score-explanation"],
  [8, "movement-explanation"],
  [9, "character-explanation"],
  [13, "goal-explanation"]
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
  const previousDir = path.join(ROOT, "docs", "visual-proof-screenshots", "tutorial-first-run", "after");
  for (const viewport of viewports) {
    const source = path.join(previousDir, `tutorial-step1-goal-${viewport.name}.png`);
    const target = path.join(BEFORE_DIR, `full-screen-slide-${viewport.name}.png`);
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
      action: rectangle("#tutorial-action-pill"),
      status: rectangle("#tutorial-coach-status"),
      speech: rectangle("#tutorial-speech-bubble")
    };
  });
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
  const artifacts = [];
  const layouts = [];
  const framesDir = viewport.mobile ? path.join(OUTPUT_DIR, `.video-frames-${Date.now()}`) : null;
  const frameCounter = { value: 0 };
  if (framesDir) await mkdir(framesDir, { recursive: true });

  page.on("pageerror", (error) => runtimeErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.removeItem("kaflulArcadeSave");
    localStorage.removeItem("kaflulFirstRunTutorialV1");
  });

  await page.goto(`${baseUrl}/?tutorial=1`, { waitUntil: "domcontentloaded" });
  await page.locator("#first-run-tutorial").waitFor({ state: "visible", timeout: 10_000 });
  await waitForTutorialState(page, 1, "awaiting");

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

  for (let step = 1; step <= 13; step += 1) {
    await waitForTutorialState(page, step, "awaiting");
    const awaitingLayout = await coachLayout(page);
    awaitingLayout.phase = "awaiting";
    awaitingLayout.step = step;
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
    layouts.push(feedbackLayout);

    if (feedbackCaptures.has(step)) {
      await capture(page, `coach-${String(step).padStart(2, "0")}-${feedbackCaptures.get(step)}-${viewport.name}`, artifacts);
    }
    if (framesDir) {
      await captureVideoFrames(page, framesDir, frameCounter, step === 13 ? 16 : 10);
    }

    if (step < 13) {
      await waitForTutorialState(page, step + 1, "awaiting");
    }
  }

  await page.locator("#first-run-tutorial").waitFor({ state: "hidden", timeout: 6_000 });
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
        || !insideViewport(layout.action, layout.viewport)
      ))
      || (speechRequired && !insideViewport(layout.speech, layout.viewport));
  });

  const expectedPersistence = persisted.tutorial === "complete"
    && persisted.mode === "adventure"
    && persisted.difficulty === "beginner"
    && persisted.character === "nabatick"
    && persisted.control === "joystick";
  if (runtimeErrors.length || invalidLayouts.length || !wrongClickBlocked || !expectedPersistence) {
    throw new Error(JSON.stringify({
      viewport: viewport.name,
      runtimeErrors,
      invalidLayouts,
      wrongClickBlocked,
      persisted
    }, null, 2));
  }

  report.viewports.push({
    name: viewport.name,
    wrongClickBlocked,
    layouts,
    persisted,
    runtimeErrors,
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
  interactionModel: "Only the highlighted real control accepts input; every click opens a short speech bubble.",
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
