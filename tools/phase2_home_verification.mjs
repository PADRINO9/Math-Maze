#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "phase2-screenshots");
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
  if (filePath.endsWith(".webp")) return "image/webp";
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

async function waitForExpression(cdp, sessionId, expression, timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(cdp, sessionId, expression)) return true;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function tapSelector(cdp, sessionId, selector) {
  const point = await evaluate(cdp, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  })()`);
  if (!point) throw new Error(`Missing selector for tap: ${selector}`);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 3, radiusY: 3, force: 1 }]
  }, sessionId);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
  await wait(100);
}

async function probeSelector(cdp, sessionId, selector) {
  return evaluate(cdp, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const box = element.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const hit = document.elementFromPoint(x, y);
    const actionable = hit?.closest?.("button, label, input, [role='button']");
    return {
      selector: ${JSON.stringify(selector)},
      point: { x: Math.round(x), y: Math.round(y) },
      hitTag: hit?.tagName || null,
      hitId: hit?.id || null,
      hitClass: hit?.className || null,
      actionableId: actionable?.id || null,
      actionableClass: actionable?.className || null
    };
  })()`);
}

async function inspectHome(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const selectors = [
      "#start-screen",
      ".home-player-bar",
      ".home-player-card",
      ".menu-best-card",
      "#leaderboard-open",
      ".menu-actions",
      "#menu-sound-button",
      "#menu-settings-button",
      ".menu-logo",
      ".home-hero-scene",
      ".home-progress-card",
      "#start-button",
      ".home-pregame-summary",
      ".home-bottom-nav"
    ];
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const rects = Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [selector, null];
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return [selector, {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        visible: box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none"
      }];
    }));
    const outOfBounds = Object.entries(rects)
      .filter(([, rect]) => rect?.visible)
      .filter(([, rect]) => (
        rect.x < -1
        || rect.y < -1
        || rect.x + rect.width > viewport.width + 1
        || rect.y + rect.height > viewport.height + 1
      ))
      .map(([selector, rect]) => ({ selector, rect }));
    const textSelectors = [
      ".home-player-card strong",
      ".menu-best-copy strong",
      ".home-rank-button strong",
      ".menu-control-button strong",
      ".home-nav-button strong",
      "#start-button .arcade-play-label",
      "#menu-selection-summary",
      ".world-ribbon span"
    ];
    const overflowingText = [];
    for (const selector of textSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 2) {
          overflowingText.push({
            selector,
            text: element.textContent.trim(),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight
          });
        }
      }
    }
    return {
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      selectedCharacter: document.querySelector("input[name='character']:checked")?.value || null,
      selectedMode: document.querySelector("input[name='game-mode']:checked")?.value || null,
      selectedDifficulty: document.querySelector("input[name='difficulty']:checked")?.value || null,
      soundIcon: document.getElementById("menu-sound-button")?.dataset.icon || null,
      manifestLoaded: Boolean(window.KAFLUL_ASSET_MANIFEST?.iconSprite),
      runtimeErrors: window.__mathMazeRuntime?.errors || [],
      scroll: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        xOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        yOverflow: document.documentElement.scrollHeight > window.innerHeight + 1
      },
      rects,
      outOfBounds,
      overflowingText
    };
  })()`);
}

async function runAcceptance(cdp, appPort) {
  const { targetId, sessionId } = await createPage(cdp, { width: 430, height: 932, mobile: true });
  const { events, off } = collectEvents(cdp, sessionId);
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase2-acceptance=1` }, sessionId);
  await waitForExpression(cdp, sessionId, "document.getElementById('app-loading-screen')?.hidden === true");
  await evaluate(cdp, sessionId, "localStorage.clear(); location.reload(); true;");
  await waitForExpression(cdp, sessionId, "document.getElementById('app-loading-screen')?.hidden === true");

  await tapSelector(cdp, sessionId, ".menu-character-nabatick");
  const afterCharacter = await evaluate(cdp, sessionId, `(() => ({
    checked: document.querySelector("input[name='character'][value='nabatick']")?.checked,
    label: document.getElementById("selected-character-label")?.textContent || ""
  }))()`);

  await tapSelector(cdp, sessionId, "#mode-control-button");
  const modeSheetOpened = await evaluate(cdp, sessionId, "!document.getElementById('mode-panel').hidden");
  await evaluate(cdp, sessionId, `(() => {
    document.querySelector("input[name='game-mode'][value='adventure']")?.closest("label")?.click();
    return document.querySelector("input[name='game-mode'][value='adventure']")?.checked;
  })()`);
  await evaluate(cdp, sessionId, "document.querySelector('#mode-panel [data-close-panel]')?.click(); true;");
  await wait(100);

  await tapSelector(cdp, sessionId, "#difficulty-control-button");
  const difficultySheetOpened = await evaluate(cdp, sessionId, "!document.getElementById('difficulty-panel').hidden");
  await evaluate(cdp, sessionId, `(() => {
    document.querySelector("input[name='difficulty'][value='advanced']")?.closest("label")?.click();
    return document.querySelector("input[name='difficulty'][value='advanced']")?.checked;
  })()`);
  await evaluate(cdp, sessionId, "document.querySelector('#difficulty-panel [data-close-panel]')?.click(); true;");
  await wait(100);

  const settingsProbe = await probeSelector(cdp, sessionId, "#menu-settings-button");
  await tapSelector(cdp, sessionId, "#menu-settings-button");
  const settingsOpened = await evaluate(cdp, sessionId, "!document.getElementById('settings-panel').hidden");
  const settingsClosed = await evaluate(cdp, sessionId, `(() => {
    const input = document.getElementById("player-name-input");
    input.value = "בודק בית";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("settings-save-button").click();
    return document.getElementById("settings-panel").hidden;
  })()`);

  const soundProbe = await probeSelector(cdp, sessionId, "#menu-sound-button");
  await tapSelector(cdp, sessionId, "#menu-sound-button");
  const soundOff = await evaluate(cdp, sessionId, "document.getElementById('menu-sound-button')?.dataset.icon === 'sound-off'");

  await tapSelector(cdp, sessionId, "#home-nav-progress");
  const progressFocused = await evaluate(cdp, sessionId, "document.activeElement?.classList.contains('home-progress-card')");

  await tapSelector(cdp, sessionId, "#home-nav-characters");
  const characterGalleryOpened = await evaluate(cdp, sessionId, `(() => {
    const gallery = document.getElementById("hero-gallery");
    return Boolean(gallery && !gallery.hidden && document.activeElement?.id === "hero-gallery-select");
  })()`);
  await evaluate(cdp, sessionId, "document.getElementById('hero-gallery-back')?.click(); true;");
  await wait(100);

  await tapSelector(cdp, sessionId, "#home-nav-game");
  const gameFocused = await evaluate(cdp, sessionId, "document.activeElement?.id === 'start-button'");

  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
  const keyboardReachedControl = await evaluate(cdp, sessionId, "Boolean(document.activeElement && document.activeElement !== document.body)");

  await tapSelector(cdp, sessionId, "#home-nav-champions");
  const leaderboardOpened = await evaluate(cdp, sessionId, "!document.getElementById('leaderboard-dialog').hidden");
  await evaluate(cdp, sessionId, "document.getElementById('leaderboard-close').click(); true;");

  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await wait(900);
  const persisted = await evaluate(cdp, sessionId, `(() => ({
    character: document.querySelector("input[name='character']:checked")?.value,
    mode: document.querySelector("input[name='game-mode']:checked")?.value,
    difficulty: document.querySelector("input[name='difficulty']:checked")?.value,
    nickname: document.getElementById("player-name-input")?.value,
    soundIcon: document.getElementById("menu-sound-button")?.dataset.icon
  }))()`);

  await tapSelector(cdp, sessionId, "#start-button");
  await wait(250);
  const gameStarted = await evaluate(cdp, sessionId, "document.getElementById('start-screen').hidden === true");
  await evaluate(cdp, sessionId, "document.getElementById('restart-button').click(); true;");
  await wait(200);
  const returnedToMenu = await evaluate(cdp, sessionId, "document.getElementById('start-screen').hidden === false");
  const runtimeErrors = await evaluate(cdp, sessionId, "window.__mathMazeRuntime?.errors || []");

  off();
  await cdp.send("Target.closeTarget", { targetId });

  const checks = {
    characterSelected: afterCharacter.checked === true && afterCharacter.label.includes("נבטיק"),
    modeSheetOpened,
    difficultySheetOpened,
    settingsOpened,
    settingsClosed,
    soundPersistedBeforeReload: soundOff,
    progressFocused,
    characterGalleryOpened,
    gameFocused,
    keyboardReachedControl,
    leaderboardOpened,
    persistedCharacter: persisted.character === "nabatick",
    persistedMode: persisted.mode === "adventure",
    persistedDifficulty: persisted.difficulty === "advanced",
    persistedNickname: persisted.nickname === "בודק בית",
    persistedSound: persisted.soundIcon === "sound-off",
    gameStarted,
    returnedToMenu,
    noRuntimeErrors: runtimeErrors.length === 0,
    noConsoleErrors: events.length === 0
  };

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    persisted,
    probes: { settingsProbe, soundProbe },
    events,
    runtimeErrors
  };
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("No Chrome or Chromium executable found. Set CHROME_PATH to run Phase 2 home verification.");
  }

  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const appPort = server.address().port;
  const cdpPort = 9600 + Math.floor(Math.random() * 400);
  const userDataDir = path.join("/private/tmp", `kaflul-phase2-home-${process.pid}`);
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
      const { targetId, sessionId } = await createPage(cdp, viewport);
      const { events, off } = collectEvents(cdp, sessionId);
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase2=${viewport.name}` }, sessionId);
      await wait(1400);
      const evaluation = await inspectHome(cdp, sessionId);
      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
      }, sessionId);
      const file = path.join(outputDir, `phase2-home-${viewport.name}.png`);
      await writeFile(file, Buffer.from(screenshot.data, "base64"));
      off();
      await cdp.send("Target.closeTarget", { targetId });

      results.push({
        ...viewport,
        file: path.relative(root, file),
        events,
        evaluation
      });
    }

    const acceptance = await runAcceptance(cdp, appPort);
    const failures = results.filter((result) => (
      result.events.length > 0
      || result.evaluation.runtimeErrors.length > 0
      || result.evaluation.scroll.xOverflow
      || result.evaluation.scroll.yOverflow
      || result.evaluation.outOfBounds.length > 0
      || result.evaluation.overflowingText.length > 0
      || result.evaluation.lang !== "he"
      || result.evaluation.dir !== "rtl"
      || !result.evaluation.manifestLoaded
    ));
    const report = {
      phase: 2,
      capturedAt: new Date().toISOString(),
      chrome: version.Browser,
      ok: failures.length === 0 && acceptance.ok,
      results,
      acceptance
    };
    const reportFile = path.join(outputDir, "phase2-home-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));

    await cdp.send("Browser.close").catch(() => {});

    const summary = {
      ok: report.ok,
      screenshots: results.map((result) => ({
        name: result.name,
        file: result.file,
        consoleErrors: result.events.length,
        runtimeErrors: result.evaluation.runtimeErrors.length,
        overflow: result.evaluation.scroll,
        outOfBounds: result.evaluation.outOfBounds.length,
        overflowingText: result.evaluation.overflowingText.length,
        rtl: result.evaluation.dir === "rtl" && result.evaluation.lang === "he"
      })),
      acceptance: acceptance.checks,
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
