#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "phase6-screenshots");
const args = new Set(process.argv.slice(2));
const shouldFail = args.has("--ci");

const viewports = [
  { name: "390x844-portrait", width: 390, height: 844, mobile: true },
  { name: "430x932-portrait", width: 430, height: 932, mobile: true },
  { name: "844x390-landscape", width: 844, height: 390, mobile: true },
  { name: "1280x720-desktop", width: 1280, height: 720, mobile: false },
  { name: "1440x900-desktop", width: 1440, height: 900, mobile: false }
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const resolved = await resolveStaticFile(root, url.pathname);
      const bytes = await readFile(resolved);
      response.writeHead(200, { "content-type": contentType(resolved), "cache-control": "no-store" });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function fetchJson(target) {
  return fetch(new Request(target)).then(async (response) => {
    if (!response.ok) throw new Error(`${target} returned ${response.status}`);
    return response.json();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CDP {
  constructor(wsUrl) {
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Set();
    this.ws = new WebSocket(wsUrl);
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (message) => {
      const payload = JSON.parse(message.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) {
          reject(new Error(`${payload.error.message}${payload.error.data ? `: ${payload.error.data}` : ""}`));
        } else {
          resolve(payload.result || {});
        }
        return;
      }
      for (const handler of this.handlers) handler(payload);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  onEvent(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

async function waitForChrome(port) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      lastError = error;
      await wait(125);
    }
  }
  throw lastError || new Error("Chrome did not expose a debugging endpoint");
}

async function createPage(cdp, viewport) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Log.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  }, sessionId);
  if (viewport.mobile) {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId);
  }
  return { targetId, sessionId };
}

function collectEvents(cdp, sessionId) {
  const events = [];
  const off = cdp.onEvent((payload) => {
    if (payload.sessionId !== sessionId) return;
    if (payload.method === "Runtime.consoleAPICalled" && payload.params.type === "error") {
      events.push({
        type: "console",
        text: (payload.params.args || []).map((arg) => arg.value || arg.description || "").join(" ")
      });
    }
    if (payload.method === "Runtime.exceptionThrown") {
      const details = payload.params.exceptionDetails || {};
      events.push({ type: "exception", text: details.text || details.exception?.description || "Runtime exception" });
    }
    if (payload.method === "Log.entryAdded") {
      const entry = payload.params.entry || {};
      if (entry.level === "error") events.push({ type: "log", text: entry.text });
    }
  });
  return { events, off };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression
  }, sessionId);
  return result.result.value;
}

async function pointForSelector(cdp, sessionId, selector) {
  return evaluate(cdp, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  })()`);
}

async function clickSelector(cdp, sessionId, selector) {
  const point = await pointForSelector(cdp, sessionId, selector);
  if (!point) throw new Error(`Missing selector for click: ${selector}`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 }, sessionId);
  await wait(180);
}

async function tapSelector(cdp, sessionId, selector) {
  const point = await pointForSelector(cdp, sessionId, selector);
  if (!point) throw new Error(`Missing selector for tap: ${selector}`);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 4, radiusY: 4, force: 1 }]
  }, sessionId);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
  await wait(200);
}

async function activateSelector(cdp, sessionId, viewport, selector) {
  if (viewport.mobile) {
    await tapSelector(cdp, sessionId, selector);
  } else {
    await clickSelector(cdp, sessionId, selector);
  }
}

async function navigateSeeded(cdp, sessionId, appPort, viewport) {
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase6=${viewport.name}` }, sessionId);
  await wait(850);
  await evaluate(cdp, sessionId, "localStorage.clear(); true;");
  await evaluate(cdp, sessionId, `(() => {
    const systems = window.KaflulSystems;
    const save = systems.createDefaultSave();
    const playerId = "phase6-player";
    save.player.nickname = "בודק תנועה";
    save.settings.selectedCharacter = "nabatick";
    save.settings.selectedMode = "arcade";
    save.settings.selectedDifficulty = "normal";
    systems.addLocalLeaderboardEntry(save, systems.createLeaderboardEntry({
      id: "phase6-current",
      playerId,
      nickname: save.player.nickname,
      score: 48250,
      mode: "arcade",
      difficulty: "normal",
      reachedStage: 12,
      maxCombo: 18,
      accuracy: 91,
      selectedCharacter: "nabatick"
    }));
    systems.recordPersonalBest(save, {
      mode: "arcade",
      difficulty: "normal",
      score: 48250,
      reachedStage: 12,
      maxCombo: 18,
      accuracy: 91
    });
    systems.persistSave(localStorage, save);
    localStorage.setItem("mathMazeNickname", save.player.nickname);
    localStorage.setItem("mathMazeCharacter", "nabatick");
    localStorage.setItem("mathMazeMode", "arcade");
    localStorage.setItem("mathMazeDifficulty", "normal");
    localStorage.setItem("mathMazePlayerId", playerId);
    localStorage.setItem("mathMazeSound", "on");
    return true;
  })()`);
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await wait(viewport.mobile ? 1100 : 900);
}

async function capture(cdp, sessionId, viewport) {
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  }, sessionId);
  const file = path.join(outputDir, `phase6-motion-audio-${viewport.name}.png`);
  await writeFile(file, Buffer.from(screenshot.data, "base64"));
  return path.relative(root, file);
}

async function inspectMotionState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const hiddenAnimations = document.getAnimations()
      .map((animation) => animation.effect?.target)
      .filter((target) => target instanceof Element && target.closest("[hidden]"))
      .length;
    const runningAnimations = document.getAnimations()
      .filter((animation) => animation.playState === "running")
      .length;
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      motion: window.KaflulMotionSystem?.getDiagnostics?.() || null,
      sound: window.KaflulUiSound?.getDiagnostics?.() || null,
      controllers: {
        motion: Boolean(window.KaflulMotionSystem),
        sound: Boolean(window.KaflulUiSound),
        adapter: Boolean(window.KaflulCharacterAnimationAdapter)
      },
      hiddenAnimations,
      runningAnimations,
      documentOverflow: {
        x: document.documentElement.scrollWidth > window.innerWidth + 1,
        y: document.documentElement.scrollHeight > window.innerHeight + 1
      },
      runtimeErrors: window.__mathMazeRuntime?.errors || []
    };
  })()`);
}

async function profileMotion(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => new Promise((resolve) => {
    const motion = window.KaflulMotionSystem;
    const target = document.getElementById("start-button");
    const start = performance.now();
    let last = start;
    const intervals = [];
    let triggered = false;
    function frame(now) {
      intervals.push(now - last);
      last = now;
      if (!triggered && now - start > 80) {
        triggered = true;
        motion?.play?.(target, "reward", { particles: { count: 12 } });
      }
      if (now - start >= 900) {
        const usable = intervals.slice(1);
        const total = usable.reduce((sum, value) => sum + value, 0) || 1;
        const avgFrameMs = total / Math.max(1, usable.length);
        resolve({
          frames: usable.length,
          avgFrameMs,
          avgFps: 1000 / avgFrameMs,
          longFramesOver50ms: usable.filter((value) => value > 50).length,
          motion: motion?.getDiagnostics?.() || null
        });
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }))()`);
}

async function runViewport(cdp, appPort, viewport) {
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId);
  await navigateSeeded(cdp, sessionId, appPort, viewport);

  const autoplayBeforeGesture = await evaluate(cdp, sessionId, "window.KaflulUiSound?.play('buttonPress') || null");
  await activateSelector(cdp, sessionId, viewport, "#pregame-open-button");
  const pregameMotion = await inspectMotionState(cdp, sessionId);
  const screenshot = await capture(cdp, sessionId, viewport);
  await activateSelector(cdp, sessionId, viewport, "#pregame-panel [data-close-panel]");

  await activateSelector(cdp, sessionId, viewport, "#mode-control-button");
  await activateSelector(cdp, sessionId, viewport, "#mode-panel input[value='adventure'] + span");
  await activateSelector(cdp, sessionId, viewport, "#difficulty-control-button");
  await activateSelector(cdp, sessionId, viewport, "#difficulty-panel input[value='legendary'] + span");
  const lockedState = await inspectMotionState(cdp, sessionId);
  await activateSelector(cdp, sessionId, viewport, "#difficulty-panel [data-close-panel]");

  await activateSelector(cdp, sessionId, viewport, "#character-control-button");
  await activateSelector(cdp, sessionId, viewport, "#hero-gallery-art-button");
  await activateSelector(cdp, sessionId, viewport, "#hero-gallery-select");
  const characterState = await inspectMotionState(cdp, sessionId);
  await activateSelector(cdp, sessionId, viewport, "#hero-gallery-back");

  await activateSelector(cdp, sessionId, viewport, "#menu-sound-button");
  const mutedPlayResult = await evaluate(cdp, sessionId, "window.KaflulUiSound?.play('buttonPress', { fromGesture: true }) || null");
  const mutedState = await inspectMotionState(cdp, sessionId);
  await activateSelector(cdp, sessionId, viewport, "#menu-sound-button");

  const profile = await profileMotion(cdp, sessionId);
  const postProfile = await inspectMotionState(cdp, sessionId);

  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  }, sessionId);
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await wait(viewport.mobile ? 900 : 750);
  const reducedState = await evaluate(cdp, sessionId, `(() => {
    const motion = window.KaflulMotionSystem;
    const before = motion?.getDiagnostics?.().particlesCreated || 0;
    const emitted = motion?.emitParticles?.(document.getElementById("start-button"), { count: 10 }) || 0;
    const after = motion?.getDiagnostics?.().particlesCreated || 0;
    return {
      mediaMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
      classPresent: document.documentElement.classList.contains("kf-reduced-motion"),
      reduced: motion?.isReducedMotion?.() || false,
      emitted,
      particleDelta: after - before,
      diagnostics: motion?.getDiagnostics?.() || null
    };
  })()`);

  off();
  await cdp.send("Target.closeTarget", { targetId });

  return {
    ...viewport,
    events,
    screenshot,
    autoplayBeforeGesture,
    pregameMotion,
    lockedState,
    characterState,
    mutedPlayResult,
    mutedState,
    profile,
    postProfile,
    reducedState
  };
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("No Chrome or Chromium executable found. Set CHROME_PATH to run Phase 6 motion/audio verification.");
  }

  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const appPort = server.address().port;
  const cdpPort = 11500 + Math.floor(Math.random() * 500);
  const userDataDir = path.join("/private/tmp", `kaflul-phase6-motion-${process.pid}`);
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  try {
    const version = await waitForChrome(cdpPort);
    const cdp = new CDP(version.webSocketDebuggerUrl);
    await cdp.ready;
    const results = [];
    for (const viewport of viewports) {
      results.push(await runViewport(cdp, appPort, viewport));
    }

    const failures = [];
    for (const result of results) {
      if (result.events.length) failures.push(`${result.name}: console/log errors`);
      if (result.pregameMotion.lang !== "he" || result.pregameMotion.dir !== "rtl") failures.push(`${result.name}: RTL/lang mismatch`);
      if (!result.pregameMotion.controllers.motion || !result.pregameMotion.controllers.sound) failures.push(`${result.name}: missing motion/audio controller`);
      if (result.autoplayBeforeGesture?.reason !== "not-unlocked") failures.push(`${result.name}: UI audio autoplay was not blocked before gesture`);
      if (result.mutedPlayResult?.reason !== "muted") failures.push(`${result.name}: UI audio did not respect mute`);
      if (result.pregameMotion.hiddenAnimations || result.lockedState.hiddenAnimations || result.postProfile.hiddenAnimations) failures.push(`${result.name}: hidden screen animation detected`);
      if (result.postProfile.motion?.activeParticles > result.postProfile.motion?.maxParticleLimit) failures.push(`${result.name}: active DOM particles exceeded cap`);
      if (result.profile.avgFps < 30) failures.push(`${result.name}: motion profiling FPS below safety floor`);
      if (result.reducedState.mediaMatches !== true || result.reducedState.reduced !== true || result.reducedState.emitted !== 0 || result.reducedState.particleDelta !== 0) {
        failures.push(`${result.name}: reduced-motion behavior failed`);
      }
      if (result.postProfile.documentOverflow.x || result.postProfile.documentOverflow.y) failures.push(`${result.name}: document overflow`);
      if (result.postProfile.runtimeErrors.length) failures.push(`${result.name}: runtime errors`);
    }

    const report = {
      phase: 6,
      capturedAt: new Date().toISOString(),
      chrome: version.Browser,
      ok: failures.length === 0,
      failures,
      results
    };
    const reportFile = path.join(outputDir, "phase6-motion-audio-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    await cdp.send("Browser.close").catch(() => {});

    const summary = {
      ok: report.ok,
      failures,
      screenshots: results.map((result) => ({ viewport: result.name, file: result.screenshot })),
      profile: results.map((result) => ({
        viewport: result.name,
        avgFps: Number(result.profile.avgFps.toFixed(1)),
        longFramesOver50ms: result.profile.longFramesOver50ms,
        particlesCreated: result.postProfile.motion?.particlesCreated || 0,
        hiddenAnimations: result.postProfile.hiddenAnimations
      })),
      audio: results.map((result) => ({
        viewport: result.name,
        autoplayBeforeGesture: result.autoplayBeforeGesture?.reason,
        mutedPlay: result.mutedPlayResult?.reason,
        played: result.mutedState.sound?.played || 0,
        mutedSkips: result.mutedState.sound?.mutedSkips || 0
      })),
      report: path.relative(root, reportFile)
    };

    if (!report.ok && shouldFail) {
      console.error(JSON.stringify(summary, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    server.close();
    chrome.kill("SIGKILL");
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
