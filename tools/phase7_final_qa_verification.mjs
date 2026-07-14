#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "phase7-screenshots");
const args = new Set(process.argv.slice(2));
const shouldFail = args.has("--ci");

const viewports = [
  { name: "390x844-portrait", width: 390, height: 844, mobile: true },
  { name: "430x932-portrait", width: 430, height: 932, mobile: true },
  { name: "844x390-landscape", width: 844, height: 390, mobile: true },
  { name: "1280x720-desktop", width: 1280, height: 720, mobile: false },
  { name: "1440x900-desktop", width: 1440, height: 900, mobile: false }
];

const preloadAssets = [
  "assets/kaflul-logo-official.png",
  "assets/bifly-menu.png",
  "assets/bifly-player.png",
  "assets/bifly-eat-prepare.png",
  "assets/bifly-eat.png",
  "assets/nabatick-idle-reference.png",
  "assets/nabatick-eat-prepare-reference.png",
  "assets/nabatick-eat-reference.png",
  "assets/dark-enemy.png",
  "assets/dark-enemy-angry.png",
  "assets/dark-enemy-surprised.png",
  "assets/dark-enemy-sad.png",
  "assets/math-maze-poster.png"
];

const localOnlyCapabilityPayload = {
  publicAvailable: false,
  code: "leaderboard_not_configured",
  message: "טבלת השיאים עדיין לא הוגדרה."
};

const localOnlyUnavailablePayload = {
  code: "leaderboard_not_configured",
  message: "טבלת השיאים עדיין לא הוגדרה."
};

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

function shouldFailAsset(request) {
  const referer = request.headers.referer || "";
  if (!referer.includes("phase7-assets=fail")) return false;
  const url = new URL(request.url || "/", "http://127.0.0.1");
  return url.pathname.endsWith("/assets/nabatick-idle-reference.png")
    || url.pathname.endsWith("/assets/bifly-menu.png");
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function startServer() {
  const leaderboardRequests = [];
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/api/champions") {
        leaderboardRequests.push({
          method: request.method || "GET",
          capability: url.searchParams.get("capability") === "1"
        });
        if (request.method === "GET" && url.searchParams.get("capability") === "1") {
          sendJson(response, 200, localOnlyCapabilityPayload);
          return;
        }
        sendJson(response, 503, localOnlyUnavailablePayload);
        return;
      }

      if (shouldFailAsset(request)) {
        response.writeHead(404, { "cache-control": "no-store" });
        response.end("Phase 7 asset fallback probe");
        return;
      }
      const resolved = await resolveStaticFile(root, url.pathname);
      const bytes = await readFile(resolved);
      response.writeHead(200, { "content-type": contentType(resolved), "cache-control": "no-store" });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  server.leaderboardRequests = leaderboardRequests;

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

function returningPlayerSeedScript() {
  const playerId = "11111111-1111-4111-8111-111111111111";
  const save = {
    schemaVersion: 2,
    gameVersion: "phase7-final-qa",
    player: {
      nickname: "בודק שלב 7"
    },
    settings: {
      selectedCharacter: "nabatick",
      selectedDifficulty: "advanced",
      selectedMode: "adventure",
      soundEnabled: false,
      musicEnabled: true,
      timeLimitEnabled: true,
      accessibility: {
        reducedMotion: false
      }
    },
    unlockedDifficulties: ["beginner", "normal", "advanced", "expert"],
    personalBests: {
      "adventure:advanced": {
        score: 56200,
        mode: "adventure",
        difficulty: "advanced",
        reachedStage: 8,
        maxCombo: 17,
        accuracy: 88,
        date: "2026-06-29T00:00:00.000Z",
        gameVersion: "phase7-final-qa"
      }
    },
    leaderboardEntries: [
      {
        id: "phase7-current",
        playerId,
        nickname: "בודק שלב 7",
        score: 56200,
        mode: "adventure",
        difficulty: "advanced",
        reachedStage: 8,
        selectedCharacter: "nabatick",
        maxCombo: 17,
        accuracy: 88,
        date: "2026-06-29T00:00:00.000Z",
        gameVersion: "phase7-final-qa"
      }
    ],
    completedLevels: {},
    achievementProgress: {},
    recovery: null,
    updatedAt: "2026-06-29T00:00:00.000Z"
  };

  return `
    (() => {
      try {
        localStorage.clear();
        localStorage.setItem("kaflulArcadeSave", ${JSON.stringify(JSON.stringify(save))});
        localStorage.setItem("mathMazeNickname", "בודק שלב 7");
        localStorage.setItem("mathMazeCharacter", "nabatick");
        localStorage.setItem("mathMazeMode", "adventure");
        localStorage.setItem("mathMazeDifficulty", "advanced");
        localStorage.setItem("mathMazeSound", "off");
        localStorage.setItem("mathMazePlayerId", ${JSON.stringify(playerId)});
      } catch {
        window.__phase7SeedFailed = true;
      }
    })();
  `;
}

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

function collectEvents(cdp, sessionId, options = {}) {
  const events = [];
  const off = cdp.onEvent((payload) => {
    if (payload.sessionId !== sessionId) return;
    if (payload.method === "Runtime.consoleAPICalled" && payload.params.type === "error") {
      const text = (payload.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
      if (!options.ignoreResourceErrors || !text.includes("Failed to load resource")) {
        events.push({ type: "console", text });
      }
    }
    if (payload.method === "Runtime.exceptionThrown") {
      const details = payload.params.exceptionDetails || {};
      events.push({ type: "exception", text: details.text || details.exception?.description || "Runtime exception" });
    }
    if (payload.method === "Log.entryAdded") {
      const entry = payload.params.entry || {};
      if (entry.level === "error" && (!options.ignoreResourceErrors || !entry.text.includes("Failed to load resource"))) {
        events.push({ type: "log", text: entry.text });
      }
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

async function sendKey(cdp, sessionId, key, code = key, keyCode = 0) {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode }, sessionId);
  await wait(160);
}

async function waitForAppReady(cdp, sessionId, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const ready = await evaluate(cdp, sessionId, `(() => {
      const loading = document.getElementById("app-loading-screen");
      const loadingHidden = !loading
        || loading.hidden
        || loading.getAttribute("aria-hidden") === "true"
        || getComputedStyle(loading).display === "none"
        || getComputedStyle(loading).visibility === "hidden"
        || Number(getComputedStyle(loading).opacity || 1) <= 0.01;
      return Boolean(window.__mathMazeRuntime?.gameReady && loadingHidden);
    })()`);
    if (ready) {
      await wait(180);
      return true;
    }
    await wait(100);
  }
  throw new Error(`App did not become ready within ${timeoutMs}ms`);
}

async function navigateClean(cdp, sessionId, appPort, search = "phase7=clean") {
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?${search}` }, sessionId);
  await wait(850);
  await evaluate(cdp, sessionId, "localStorage.clear(); true;");
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await waitForAppReady(cdp, sessionId);
}

async function seedReturningPlayer(cdp, sessionId, appPort, search = "phase7=returning") {
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: returningPlayerSeedScript()
  }, sessionId);
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?${search}` }, sessionId);
  await waitForAppReady(cdp, sessionId);
}

async function capture(cdp, sessionId, viewport, name) {
  await wait(180);
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  }, sessionId);
  const file = path.join(outputDir, `phase7-${name}-${viewport.name}.png`);
  await writeFile(file, Buffer.from(screenshot.data, "base64"));
  return path.relative(root, file);
}

async function inspectPage(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const importantSelectors = [
      "#start-screen",
      ".home-player-bar",
      ".menu-logo",
      ".home-hero-scene",
      "#start-button",
      ".home-bottom-nav",
      "#pregame-panel",
      "#hero-gallery",
      "#leaderboard-dialog",
      "#pause-screen",
      "#end-screen",
      ".hud",
      "#game-canvas"
    ];
    const visible = (element) => {
      if (!element || element.hidden || element.closest("[hidden]")) return false;
      const box = element.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return false;
      for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) <= 0.01) {
          return false;
        }
      }
      return true;
    };
    const rects = Object.fromEntries(importantSelectors.map((selector) => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      return [selector, element ? {
        visible: visible(element),
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height)
      } : null];
    }));
    const outOfBounds = Object.entries(rects)
      .filter(([, rect]) => rect?.visible)
      .filter(([, rect]) => rect.x < -1 || rect.y < -1 || rect.x + rect.width > viewport.width + 1 || rect.y + rect.height > viewport.height + 1)
      .map(([selector, rect]) => ({ selector, rect }));
    const overflowingText = [];
    for (const element of document.querySelectorAll("h1,h2,h3,p,span,strong,small,button,label,legend,li,output")) {
      if (!visible(element)) continue;
      const text = element.textContent.trim();
      if (!text) continue;
      const hasVisibleTextChild = Array.from(element.children).some((child) => visible(child) && child.textContent.trim());
      if (hasVisibleTextChild) continue;
      const style = getComputedStyle(element);
      const horizontalOverflow = element.scrollWidth > element.clientWidth + 2;
      const verticalOverflow = element.scrollHeight > element.clientHeight + 10;
      const intentionallyEllipsized = horizontalOverflow
        && !verticalOverflow
        && style.textOverflow === "ellipsis"
        && (style.overflowX === "hidden" || style.overflow === "hidden");
      if ((horizontalOverflow && !intentionallyEllipsized) || verticalOverflow) {
        overflowingText.push({
          text: text.slice(0, 80),
          tag: element.tagName,
          id: element.id || "",
          className: String(element.className || "").slice(0, 80),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight
        });
      }
    }
    const missingNames = [];
    for (const element of document.querySelectorAll("button,[role='button'],a,input,select,textarea")) {
      if (!visible(element)) continue;
      if (element.matches("input[type='radio'], input[type='checkbox']") && element.closest("label")) continue;
      const label = element.getAttribute("aria-label")
        || element.getAttribute("title")
        || element.getAttribute("alt")
        || element.labels?.[0]?.textContent
        || element.textContent;
      if (!String(label || "").trim()) {
        missingNames.push(element.id || element.className || element.tagName);
      }
    }
    const smallTargets = [];
    for (const element of document.querySelectorAll("button,[role='button'],label,.menu-icon-button,.home-nav-button,.menu-control-button")) {
      if (!visible(element)) continue;
      const box = element.getBoundingClientRect();
      if (box.width < 40 || box.height < 40) {
        smallTargets.push({
          id: element.id || "",
          className: String(element.className || "").slice(0, 80),
          width: Math.round(box.width),
          height: Math.round(box.height)
        });
      }
    }
    const distortedImages = [];
    for (const image of document.querySelectorAll("img")) {
      if (!visible(image) || !image.naturalWidth || !image.naturalHeight) continue;
      const box = image.getBoundingClientRect();
      const natural = image.naturalWidth / image.naturalHeight;
      const rendered = box.width / box.height;
      if (Math.abs(natural - rendered) > 0.35) {
        distortedImages.push({
          src: image.getAttribute("src"),
          naturalRatio: Number(natural.toFixed(2)),
          renderedRatio: Number(rendered.toFixed(2))
        });
      }
    }
    const iconIssues = Array.from(document.querySelectorAll("svg.ui-icon"))
      .filter((icon) => visible(icon))
      .map((icon) => {
        const box = icon.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          id: icon.id || "",
          className: String(icon.className?.baseVal || icon.className || "").slice(0, 80),
          href: icon.querySelector("use")?.getAttribute("href") || "",
          parent: icon.parentElement?.id || icon.parentElement?.className || "",
          grandparent: icon.parentElement?.parentElement?.id || icon.parentElement?.parentElement?.className || ""
        };
      })
      .filter((box) => box.width < 12 || box.height < 12 || Math.abs(box.width - box.height) > 10);
    const hiddenAnimations = document.getAnimations()
      .map((animation) => animation.effect?.target)
      .filter((target) => target instanceof Element && target.closest("[hidden]"))
      .length;
    const runningAnimations = document.getAnimations().filter((animation) => animation.playState === "running").length;
    const startButton = document.getElementById("start-button")?.getBoundingClientRect();
    const navButton = document.querySelector(".home-nav-button")?.getBoundingClientRect();
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      viewport,
      rects,
      outOfBounds,
      overflowingText,
      missingNames,
      smallTargets,
      distortedImages,
      iconIssues,
      hiddenAnimations,
      runningAnimations,
      documentOverflow: {
        x: document.documentElement.scrollWidth > window.innerWidth + 1,
        y: document.documentElement.scrollHeight > window.innerHeight + 1
      },
      primaryActionDominant: Boolean(startButton && navButton && startButton.width * startButton.height > navButton.width * navButton.height * 2.2),
      runtimeErrors: window.__mathMazeRuntime?.errors || [],
      motion: window.KaflulMotionSystem?.getDiagnostics?.() || null,
      sound: window.KaflulUiSound?.getDiagnostics?.() || null
    };
  })()`);
}

async function measureFps(cdp, sessionId, durationMs = 900) {
  return evaluate(cdp, sessionId, `(() => new Promise((resolve) => {
    const start = performance.now();
    let last = start;
    const intervals = [];
    function frame(now) {
      intervals.push(now - last);
      last = now;
      if (now - start >= ${Number(durationMs)}) {
        const usable = intervals.slice(1);
        const avg = usable.reduce((sum, value) => sum + value, 0) / Math.max(1, usable.length);
        resolve({
          frames: usable.length,
          avgFrameMs: avg,
          avgFps: 1000 / avg,
          longFramesOver50ms: usable.filter((value) => value > 50).length
        });
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }))()`);
}

async function inspectPerformance(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource")
      .filter((entry) => !entry.name.includes("fonts.googleapis.com") && !entry.name.includes("fonts.gstatic.com"))
      .map((entry) => ({
        name: entry.name.split("/").slice(-2).join("/"),
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        duration: entry.duration || 0
      }));
    const byName = new Map();
    for (const resource of resources) {
      byName.set(resource.name, (byName.get(resource.name) || 0) + 1);
    }
    return {
      navigation: navigation ? {
        domContentLoadedMs: navigation.domContentLoadedEventEnd - navigation.startTime,
        loadMs: navigation.loadEventEnd - navigation.startTime,
        transferSize: navigation.transferSize || 0,
        decodedBodySize: navigation.decodedBodySize || 0
      } : null,
      resourceCount: resources.length,
      totalTransferSize: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
      totalDecodedBodySize: resources.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
      duplicateResources: Array.from(byName.entries()).filter(([, count]) => count > 1),
      largestResources: [...resources].sort((a, b) => b.decodedBodySize - a.decodedBodySize).slice(0, 8),
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null
    };
  })()`);
}

async function assetInventory() {
  const files = await Promise.all(preloadAssets.map(async (asset) => {
    const size = await stat(path.join(root, asset)).then((item) => item.size).catch(() => 0);
    return { asset, size };
  }));
  return {
    files,
    totalBytes: files.reduce((sum, item) => sum + item.size, 0),
    largest: [...files].sort((a, b) => b.size - a.size).slice(0, 5)
  };
}

function parseAnswer(questionText) {
  const numbers = (questionText.match(/\d+/g) || []).map(Number);
  return numbers.length >= 2 ? numbers[0] * numbers[1] : 1;
}

async function submitCurrentAnswer(cdp, sessionId, answer) {
  await evaluate(cdp, sessionId, `(() => {
    const input = document.getElementById("answer-input");
    input.value = ${JSON.stringify(String(answer))};
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("submit-answer").click();
    return true;
  })()`);
  await wait(1200);
}

async function waitForQuestion(cdp, sessionId, timeoutMs = 12000) {
  const start = Date.now();
  let tick = 0;
  while (Date.now() - start < timeoutMs) {
    const visible = await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === false");
    if (visible) return true;
    const directions = [
      ["ArrowRight", "ArrowRight", 39],
      ["ArrowDown", "ArrowDown", 40],
      ["ArrowLeft", "ArrowLeft", 37],
      ["ArrowUp", "ArrowUp", 38]
    ];
    if (tick % 3 === 0) {
      const [key, code, codeNum] = directions[(tick / 3) % directions.length];
      await sendKey(cdp, sessionId, key, code, codeNum);
    }
    tick += 1;
    await wait(250);
  }
  return false;
}

async function answerQuestionIfVisible(cdp, sessionId) {
  const visible = await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === false");
  if (!visible) return false;
  const answer = await evaluate(cdp, sessionId, "document.getElementById('question-title')?.textContent || ''").then(parseAnswer);
  await submitCurrentAnswer(cdp, sessionId, answer);
  return true;
}

async function settleGameplay(cdp, sessionId, attempts = 6) {
  let answered = false;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await wait(attempt === 0 ? 260 : 420);
    const endVisible = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
    if (endVisible) return false;
    if (await answerQuestionIfVisible(cdp, sessionId)) {
      answered = true;
      continue;
    }
    if (answered || attempt >= 2) {
      return await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === true");
    }
  }
  return await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === true");
}

async function pauseGame(cdp, sessionId, viewport) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const alreadyPaused = await evaluate(cdp, sessionId, "document.getElementById('pause-screen')?.hidden === false");
    if (alreadyPaused) return true;
    const endVisible = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
    if (endVisible) return false;
    if (await answerQuestionIfVisible(cdp, sessionId)) {
      continue;
    }
    await activateSelector(cdp, sessionId, viewport, "#pause-button");
    await wait(260);
    const paused = await evaluate(cdp, sessionId, "document.getElementById('pause-screen')?.hidden === false && document.getElementById('pause-button')?.dataset.icon === 'play'");
    if (paused) return true;
  }
  return false;
}

async function returnToMenuFromGame(cdp, sessionId, viewport) {
  if (!(await pauseGame(cdp, sessionId, viewport))) return false;
  await activateSelector(cdp, sessionId, viewport, "#pause-menu-button");
  await wait(620);
  return evaluate(cdp, sessionId, "document.getElementById('start-screen')?.hidden === false");
}

async function runViewport(cdp, appPort, viewport) {
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId);
  await navigateClean(cdp, sessionId, appPort, `phase7-first=${viewport.name}`);
  const firstLoad = await inspectPage(cdp, sessionId);
  const before = await capture(cdp, sessionId, viewport, "before-home");
  const firstPerf = await inspectPerformance(cdp, sessionId);
  const homeFps = await measureFps(cdp, sessionId);

  await seedReturningPlayer(cdp, sessionId, appPort, `phase7-returning=${viewport.name}`);
  const returning = await evaluate(cdp, sessionId, `(() => ({
    nickname: document.getElementById("player-name-input")?.value,
    character: document.querySelector("input[name='character']:checked")?.value,
    mode: document.querySelector("input[name='game-mode']:checked")?.value,
    difficulty: document.querySelector("input[name='difficulty']:checked")?.value,
    soundIcon: document.getElementById("menu-sound-button")?.dataset.icon,
    startVisible: document.getElementById("start-button")?.offsetParent !== null
  }))()`);

  await activateSelector(cdp, sessionId, viewport, "#difficulty-control-button");
  const lockedDifficulty = await evaluate(cdp, sessionId, `(() => ({
    legendaryDisabled: document.querySelector("input[value='legendary']")?.disabled === true,
    copy: document.querySelector(".difficulty-lock-copy")?.textContent.trim() || ""
  }))()`);
  await sendKey(cdp, sessionId, "Escape", "Escape", 27);

  await activateSelector(cdp, sessionId, viewport, "#pregame-open-button");
  const pregameFocus = await evaluate(cdp, sessionId, `(() => {
    const panel = document.getElementById("pregame-panel");
    return Boolean(panel && panel.contains(document.activeElement));
  })()`);
  const after = await capture(cdp, sessionId, viewport, "after-pregame");
  const afterInspection = await inspectPage(cdp, sessionId);
  await sendKey(cdp, sessionId, "Escape", "Escape", 27);
  const pregameClosed = await evaluate(cdp, sessionId, "document.getElementById('pregame-panel')?.hidden === true");

  if (viewport.mobile) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.height,
      height: viewport.width,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: viewport.height,
      screenHeight: viewport.width
    }, sessionId);
    await wait(420);
    const orientation = await inspectPage(cdp, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: viewport.width,
      screenHeight: viewport.height
    }, sessionId);
    await wait(240);
    off();
    await cdp.send("Target.closeTarget", { targetId });
    return {
      ...viewport,
      events,
      screenshots: { before, after },
      firstLoad,
      returning,
      lockedDifficulty,
      pregameFocus,
      pregameClosed,
      afterInspection,
      firstPerf,
      homeFps,
      orientation
    };
  }

  off();
  await cdp.send("Target.closeTarget", { targetId });
  return {
    ...viewport,
    events,
    screenshots: { before, after },
    firstLoad,
    returning,
    lockedDifficulty,
    pregameFocus,
    pregameClosed,
    afterInspection,
    firstPerf,
    homeFps,
    orientation: null
  };
}

async function runFunctionalFlow(cdp, appPort) {
  const viewport = { name: "430x932-portrait", width: 430, height: 932, mobile: true };
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId);
  await navigateClean(cdp, sessionId, appPort, "phase7-functional=1");
  await evaluate(cdp, sessionId, `(() => {
    localStorage.setItem("mathMazeDifficulty", "expert");
    localStorage.setItem("mathMazeSound", "on");
    return true;
  })()`);
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await waitForAppReady(cdp, sessionId);
  await activateSelector(cdp, sessionId, viewport, "#start-button");
  await wait(260);
  await answerQuestionIfVisible(cdp, sessionId);
  await wait(180);
  const started = await evaluate(cdp, sessionId, "document.getElementById('start-screen')?.hidden === true && document.getElementById('pause-button')?.dataset.icon === 'pause'");
  const gameplayShot = await capture(cdp, sessionId, viewport, "gameplay");
  const gameplayFps = await measureFps(cdp, sessionId);

  const paused = await pauseGame(cdp, sessionId, viewport);
  await sendKey(cdp, sessionId, "Escape", "Escape", 27);
  await wait(220);
  const resumed = await evaluate(cdp, sessionId, "document.getElementById('pause-screen')?.hidden === true && document.getElementById('pause-button')?.dataset.icon === 'pause'");

  const questionSeen = await waitForQuestion(cdp, sessionId, 14000);
  const questionShot = questionSeen ? await capture(cdp, sessionId, viewport, "question") : null;
  let correctAnswer = false;
  if (questionSeen) {
    const answer = await evaluate(cdp, sessionId, "document.getElementById('question-title')?.textContent || ''").then(parseAnswer);
    const beforeScore = await evaluate(cdp, sessionId, "Number(document.getElementById('score')?.textContent.replace(/[^0-9]/g, '') || 0)");
    await submitCurrentAnswer(cdp, sessionId, answer);
    const afterScore = await evaluate(cdp, sessionId, "Number(document.getElementById('score')?.textContent.replace(/[^0-9]/g, '') || 0)");
    correctAnswer = afterScore > beforeScore;
  }

  let wrongAnswer = false;
  if (await waitForQuestion(cdp, sessionId, 14000)) {
    const beforeLives = await evaluate(cdp, sessionId, "document.getElementById('lives')?.getAttribute('aria-label') || ''");
    await submitCurrentAnswer(cdp, sessionId, 9999);
    const afterLives = await evaluate(cdp, sessionId, "document.getElementById('lives')?.getAttribute('aria-label') || ''");
    wrongAnswer = beforeLives !== afterLives;
  }

  let timeoutObserved = false;
  if (await waitForQuestion(cdp, sessionId, 14000)) {
    await wait(17500);
    timeoutObserved = await evaluate(cdp, sessionId, `(() => {
      const feedback = document.getElementById("question-feedback")?.textContent || "";
      return feedback.includes("נגמר הזמן") || document.getElementById("question-dialog")?.hidden === true;
    })()`);
    await wait(1400);
  }

  let gameOver = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
  for (let attempt = 0; !gameOver && attempt < 4; attempt += 1) {
    if (!(await waitForQuestion(cdp, sessionId, 12000))) break;
    await submitCurrentAnswer(cdp, sessionId, 9999);
    gameOver = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
  }
  const gameOverShot = gameOver ? await capture(cdp, sessionId, viewport, "gameover") : null;

  await activateSelector(cdp, sessionId, viewport, "#retry-button");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const endHidden = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === true");
    if (endHidden) break;
    await wait(120);
  }
  const retryStarted = await evaluate(cdp, sessionId, "document.getElementById('start-screen')?.hidden === true && document.getElementById('pause-button')?.dataset.icon === 'pause'");
  let returnedMenu = await returnToMenuFromGame(cdp, sessionId, viewport);
  if (!returnedMenu) {
    const resultsVisible = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
    if (resultsVisible) {
      await activateSelector(cdp, sessionId, viewport, "#restart-button");
      await wait(520);
      returnedMenu = await evaluate(cdp, sessionId, "document.getElementById('start-screen')?.hidden === false");
    }
  }
  let leaderboard = false;
  if (returnedMenu) {
    await activateSelector(cdp, sessionId, viewport, "#leaderboard-open");
    leaderboard = await evaluate(cdp, sessionId, "document.getElementById('leaderboard-dialog')?.hidden === false");
  }

  const postRun = await inspectPage(cdp, sessionId);
  off();
  await cdp.send("Target.closeTarget", { targetId });
  return {
    events,
    screenshots: { gameplayShot, questionShot, gameOverShot },
    gameplayFps,
    checks: {
      started,
      paused,
      resumed,
      questionSeen,
      correctAnswer,
      wrongAnswer,
      timeoutObserved,
      gameOver,
      retryStarted,
      returnedMenu,
      leaderboard
    },
    postRun
  };
}

async function runVictoryProbe(cdp, appPort) {
  const viewport = { name: "430x932-portrait", width: 430, height: 932, mobile: true };
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      (() => {
        let systemsValue;
        Object.defineProperty(window, "KaflulSystems", {
          configurable: true,
          get() { return systemsValue; },
          set(value) {
            if (value && !value.__phase7VictoryPatched) {
              const original = value.recordMathAnswer;
              value.recordMathAnswer = function phase7RecordMathAnswer(stats, answer) {
                const result = original.call(this, stats, answer);
                if (answer?.correct) {
                  stats.correctAnswers = Math.max(stats.correctAnswers, 100);
                  stats.totalQuestions = Math.max(stats.totalQuestions, stats.correctAnswers);
                  stats.maxStreak = Math.max(stats.maxStreak || 0, stats.correctAnswers);
                }
                return result;
              };
              Object.defineProperty(value, "__phase7VictoryPatched", { value: true });
            }
            systemsValue = value;
          }
        });
      })();
    `
  }, sessionId);
  await navigateClean(cdp, sessionId, appPort, "phase7-victory=1");
  await activateSelector(cdp, sessionId, viewport, "#mode-control-button");
  await activateSelector(cdp, sessionId, viewport, "#mode-panel input[value='adventure'] + span");
  await activateSelector(cdp, sessionId, viewport, "#start-button");
  const question = await waitForQuestion(cdp, sessionId, 14000);
  if (question) {
    const answer = await evaluate(cdp, sessionId, "document.getElementById('question-title')?.textContent || ''").then(parseAnswer);
    await submitCurrentAnswer(cdp, sessionId, answer);
  }
  const victory = await evaluate(cdp, sessionId, `(() => ({
    visible: document.getElementById("end-screen")?.hidden === false,
    title: document.getElementById("end-title")?.textContent || "",
    mode: document.getElementById("result-mode")?.textContent || ""
  }))()`);
  const screenshot = victory.visible ? await capture(cdp, sessionId, viewport, "victory") : null;
  off();
  await cdp.send("Target.closeTarget", { targetId });
  return { events, question, victory, screenshot };
}

async function runReducedMotionProbe(cdp, appPort) {
  const viewport = { name: "390x844-portrait", width: 390, height: 844, mobile: true };
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  }, sessionId);
  await navigateClean(cdp, sessionId, appPort, "phase7-reduced=1");
  const reduced = await evaluate(cdp, sessionId, `(() => {
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
      runningAnimations: document.getAnimations().filter((animation) => animation.playState === "running").length,
      hiddenAnimations: document.getAnimations().map((animation) => animation.effect?.target).filter((target) => target instanceof Element && target.closest("[hidden]")).length
    };
  })()`);
  off();
  await cdp.send("Target.closeTarget", { targetId });
  return { events, reduced };
}

async function runAssetFallbackProbe(cdp, appPort) {
  const viewport = { name: "390x844-portrait", width: 390, height: 844, mobile: true };
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId, { ignoreResourceErrors: true });
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?phase7-assets=fail` }, sessionId);
  await waitForAppReady(cdp, sessionId);
  const result = await evaluate(cdp, sessionId, `(() => ({
    startVisible: document.getElementById("start-screen")?.hidden === false,
    startButtonVisible: document.getElementById("start-button")?.offsetParent !== null,
    runtimeErrors: window.__mathMazeRuntime?.errors || [],
    brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute("src")),
    overflow: {
      x: document.documentElement.scrollWidth > window.innerWidth + 1,
      y: document.documentElement.scrollHeight > window.innerHeight + 1
    }
  }))()`);
  const screenshot = await capture(cdp, sessionId, viewport, "asset-fallback");
  off();
  await cdp.send("Target.closeTarget", { targetId });
  return { events, result, screenshot };
}

async function runMemoryProbe(cdp, appPort) {
  const viewport = { name: "1280x720-desktop", width: 1280, height: 720, mobile: false };
  const { targetId, sessionId } = await createPage(cdp, viewport);
  const { events, off } = collectEvents(cdp, sessionId);
  await seedReturningPlayer(cdp, sessionId, appPort, "phase7-memory=1");
  const before = await evaluate(cdp, sessionId, `(() => ({
    nodes: document.querySelectorAll("*").length,
    heap: performance.memory?.usedJSHeapSize || null
  }))()`);
  for (let index = 0; index < 12; index += 1) {
    await clickSelector(cdp, sessionId, "#pregame-open-button");
    await sendKey(cdp, sessionId, "Escape", "Escape", 27);
    await clickSelector(cdp, sessionId, "#leaderboard-open");
    await clickSelector(cdp, sessionId, "#leaderboard-close");
  }
  await wait(700);
  const after = await evaluate(cdp, sessionId, `(() => ({
    nodes: document.querySelectorAll("*").length,
    heap: performance.memory?.usedJSHeapSize || null,
    particles: document.querySelectorAll(".kf-motion-particle").length,
    hiddenAnimations: document.getAnimations().map((animation) => animation.effect?.target).filter((target) => target instanceof Element && target.closest("[hidden]")).length
  }))()`);
  off();
  await cdp.send("Target.closeTarget", { targetId });
  return { events, before, after };
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("No Chrome or Chromium executable found. Set CHROME_PATH to run Phase 7 final QA verification.");
  }

  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const appPort = server.address().port;
  const cdpPort = 12000 + Math.floor(Math.random() * 500);
  const userDataDir = path.join("/private/tmp", `kaflul-phase7-final-${process.pid}`);
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

    const viewportResults = [];
    for (const viewport of viewports) {
      viewportResults.push(await runViewport(cdp, appPort, viewport));
    }

    const functional = await runFunctionalFlow(cdp, appPort);
    const victory = await runVictoryProbe(cdp, appPort);
    const reducedMotion = await runReducedMotionProbe(cdp, appPort);
    const assetFallback = await runAssetFallbackProbe(cdp, appPort);
    const memory = await runMemoryProbe(cdp, appPort);
    const assets = await assetInventory();

    const failures = [];
    const warnings = [];

    for (const result of viewportResults) {
      if (result.events.length) failures.push(`${result.name}: console/runtime error during responsive pass`);
      for (const [label, inspection] of [["first", result.firstLoad], ["after", result.afterInspection]]) {
        if (inspection.lang !== "he" || inspection.dir !== "rtl") failures.push(`${result.name}/${label}: RTL mismatch`);
        if (inspection.documentOverflow.x || inspection.documentOverflow.y) failures.push(`${result.name}/${label}: document overflow`);
        if (inspection.outOfBounds.length) failures.push(`${result.name}/${label}: visible element out of bounds`);
        if (inspection.overflowingText.length) failures.push(`${result.name}/${label}: Hebrew/text overflow`);
        if (inspection.missingNames.length) failures.push(`${result.name}/${label}: missing accessible names`);
        if (inspection.iconIssues.length) failures.push(`${result.name}/${label}: icon alignment issue`);
        if (inspection.distortedImages.length) failures.push(`${result.name}/${label}: image distortion`);
        if (inspection.hiddenAnimations) failures.push(`${result.name}/${label}: hidden animations running`);
        if (inspection.runtimeErrors.length) failures.push(`${result.name}/${label}: runtime errors`);
      }
      if (result.firstLoad.smallTargets.length) warnings.push(`${result.name}: small visible touch targets: ${result.firstLoad.smallTargets.length}`);
      if (!result.firstLoad.primaryActionDominant) failures.push(`${result.name}: primary action hierarchy is weak`);
      if (result.returning.nickname !== "בודק שלב 7") failures.push(`${result.name}: nickname persistence failed`);
      if (result.returning.character !== "nabatick") failures.push(`${result.name}: character persistence failed`);
      if (result.returning.mode !== "adventure") failures.push(`${result.name}: mode persistence failed`);
      if (result.returning.difficulty !== "advanced") failures.push(`${result.name}: difficulty persistence failed`);
      if (result.returning.soundIcon !== "sound-off") failures.push(`${result.name}: sound persistence failed`);
      if (!result.lockedDifficulty.legendaryDisabled || !result.lockedDifficulty.copy) failures.push(`${result.name}: locked Legendary state missing`);
      if (!result.pregameFocus || !result.pregameClosed) failures.push(`${result.name}: pre-game focus/Escape behavior failed`);
      if (result.homeFps.avgFps < 30) failures.push(`${result.name}: home FPS below threshold`);
      if (result.orientation && (result.orientation.documentOverflow.x || result.orientation.documentOverflow.y || result.orientation.outOfBounds.length)) {
        failures.push(`${result.name}: orientation-change layout failed`);
      }
    }

    for (const [name, ok] of Object.entries(functional.checks)) {
      if (!ok) failures.push(`functional: ${name} failed`);
    }
    if (functional.events.length) failures.push("functional: console/runtime errors");
    if (functional.postRun.runtimeErrors.length) failures.push("functional: app runtime errors");
    if (functional.gameplayFps.avgFps < 30) failures.push("functional: gameplay FPS below threshold");

    if (victory.events.length) failures.push("victory: console/runtime errors");
    if (!victory.question || !victory.victory.visible || !victory.victory.title.includes("ניצח")) {
      failures.push("victory: accelerated adventure victory path failed");
    }

    if (reducedMotion.events.length) failures.push("reduced-motion: console/runtime errors");
    if (!reducedMotion.reduced.mediaMatches || !reducedMotion.reduced.reduced || reducedMotion.reduced.emitted !== 0 || reducedMotion.reduced.particleDelta !== 0) {
      failures.push("reduced-motion: nonessential motion was not reduced");
    }
    if (reducedMotion.reduced.hiddenAnimations) failures.push("reduced-motion: hidden animations detected");

    if (assetFallback.events.length) failures.push("asset-fallback: JS errors beyond expected resource failures");
    if (!assetFallback.result.startVisible || !assetFallback.result.startButtonVisible || assetFallback.result.runtimeErrors.length) {
      failures.push("asset-fallback: app did not remain usable with failed character art");
    }
    if (assetFallback.result.overflow.x || assetFallback.result.overflow.y) failures.push("asset-fallback: layout overflow with failed assets");

    if (memory.events.length) failures.push("memory: console/runtime errors");
    if (memory.after.nodes - memory.before.nodes > 35) failures.push("memory: DOM node count grew after repeated navigation");
    if (memory.after.particles > 0) failures.push("memory: particles remained after repeated navigation");
    if (memory.after.hiddenAnimations) failures.push("memory: hidden animations after repeated navigation");
    if (memory.before.heap && memory.after.heap && memory.after.heap > memory.before.heap * 1.85) {
      warnings.push("memory: JS heap grew by more than 85% during repeated navigation");
    }

    if (assets.totalBytes > 5_600_000) warnings.push("assets: initial preloaded raster budget remains heavy");
    for (const result of viewportResults) {
      if (result.firstPerf.duplicateResources.length) warnings.push(`${result.name}: duplicate resource entries observed`);
    }

    const leaderboardApiRequests = server.leaderboardRequests || [];
    if (leaderboardApiRequests.some((request) => request.method === "POST")) {
      failures.push("leaderboard: public POST occurred while local-only capability was unavailable");
    }
    if (!leaderboardApiRequests.some((request) => request.method === "GET" && request.capability)) {
      warnings.push("leaderboard: final QA did not exercise the public capability check");
    }

    const report = {
      phase: 7,
      capturedAt: new Date().toISOString(),
      chrome: version.Browser,
      localPreviewUrl: `http://127.0.0.1:${appPort}/`,
      ok: failures.length === 0,
      failures,
      warnings,
      assets,
      viewportResults,
      functional,
      victory,
      reducedMotion,
      assetFallback,
      memory,
      leaderboardApiRequests
    };
    const reportFile = path.join(outputDir, "phase7-final-qa-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    await cdp.send("Browser.close").catch(() => {});

    const summary = {
      ok: report.ok,
      failures,
      warnings,
      localPreviewUrl: report.localPreviewUrl,
      screenshots: viewportResults.flatMap((result) => [
        { viewport: result.name, screen: "before-home", file: result.screenshots.before },
        { viewport: result.name, screen: "after-pregame", file: result.screenshots.after }
      ]).concat([
        { viewport: "430x932-portrait", screen: "gameplay", file: functional.screenshots.gameplayShot },
        { viewport: "430x932-portrait", screen: "question", file: functional.screenshots.questionShot },
        { viewport: "430x932-portrait", screen: "gameover", file: functional.screenshots.gameOverShot },
        { viewport: "430x932-portrait", screen: "victory", file: victory.screenshot },
        { viewport: "390x844-portrait", screen: "asset-fallback", file: assetFallback.screenshot }
      ]),
      fps: viewportResults.map((result) => ({
        viewport: result.name,
        home: Number(result.homeFps.avgFps.toFixed(1))
      })).concat([{ viewport: "gameplay", home: Number(functional.gameplayFps.avgFps.toFixed(1)) }]),
      assetBytes: assets.totalBytes,
      leaderboardApiRequests,
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
