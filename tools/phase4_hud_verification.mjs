#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticFile } from "./static-file-security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "phase4-screenshots");
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
  await wait(140);
}

async function clickSelector(cdp, sessionId, selector) {
  const point = await evaluate(cdp, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  })()`);
  if (!point) throw new Error(`Missing selector for click: ${selector}`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 }, sessionId);
  await wait(140);
}

async function sendKey(cdp, sessionId, key, code = key, keyCode = 0) {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode }, sessionId);
  await wait(120);
}

async function swipeCanvas(cdp, sessionId, deltaX, deltaY) {
  const points = await evaluate(cdp, sessionId, `(() => {
    const element = document.getElementById("game-canvas");
    const box = element.getBoundingClientRect();
    return {
      startX: box.x + box.width / 2,
      startY: box.y + box.height / 2,
      endX: box.x + box.width / 2 + ${Number(deltaX)},
      endY: box.y + box.height / 2 + ${Number(deltaY)}
    };
  })()`);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: points.startX, y: points.startY, radiusX: 5, radiusY: 5, force: 1 }]
  }, sessionId);
  await wait(60);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: points.endX, y: points.endY, radiusX: 5, radiusY: 5, force: 1 }]
  }, sessionId);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, sessionId);
  await wait(180);
}

async function startGame(cdp, sessionId, appPort, search = "phase4-hud=1", settleMs = 900) {
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/?${search}` }, sessionId);
  await wait(900);
  await evaluate(cdp, sessionId, "localStorage.clear(); true;");
  await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
  await wait(900);
  await evaluate(cdp, sessionId, "document.getElementById('start-button')?.click(); true;");
  await wait(settleMs);
}

async function inspectHud(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const selectors = [
      ".hud",
      ".hud-group-main",
      ".hud-actions",
      ".metric-score",
      ".metric-combo",
      ".metric-lives",
      ".metric-progress",
      "#mission-card",
      ".progress-wrap",
      "#pause-button",
      "#sound-button",
      ".stage",
      "#game-canvas"
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
        visible: box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden"
      }];
    }));
    const visibleRequired = [".metric-score", ".metric-combo", ".metric-lives", ".metric-progress", "#mission-card", ".progress-wrap", "#pause-button", "#sound-button"]
      .every((selector) => rects[selector]?.visible);
    const secondaryHidden = Array.from(document.querySelectorAll("[data-hud-secondary]"))
      .every((element) => {
        const style = getComputedStyle(element);
        return style.display === "none" || style.visibility === "hidden" || element.getBoundingClientRect().width === 0;
      });
    const outOfBounds = Object.entries(rects)
      .filter(([, rect]) => rect?.visible)
      .filter(([, rect]) => (
        rect.x < -1
        || rect.y < -1
        || rect.x + rect.width > viewport.width + 1
        || rect.y + rect.height > viewport.height + 1
      ))
      .map(([selector, rect]) => ({ selector, rect }));
    const overflowingText = [];
    for (const selector of [".metric-label", ".metric strong", ".mission-progress", ".hud-control-label"]) {
      for (const element of document.querySelectorAll(selector)) {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 3) {
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
    const hud = rects[".hud"];
    const canvas = rects["#game-canvas"];
    const hudElement = document.querySelector(".hud");
    const hudBounds = hudElement?.getBoundingClientRect();
    const visibleHudDescendants = hudElement
      ? Array.from(hudElement.querySelectorAll("*")).map((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
            ? { element, box }
            : null;
        }).filter(Boolean)
      : [];
    const hudDescendantOverflow = hudBounds
      ? visibleHudDescendants.filter(({ box }) => (
          box.left < hudBounds.left - 1
          || box.top < hudBounds.top - 1
          || box.right > hudBounds.right + 1
          || box.bottom > hudBounds.bottom + 1
        )).map(({ element, box }) => ({
          selector: element.id ? "#" + element.id : element.className || element.tagName.toLowerCase(),
          rect: {
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height)
          }
        }))
      : [{ selector: ".hud", rect: null }];
    const hudEffectiveBottomPx = Math.round(Math.max(
      hudBounds?.bottom || 0,
      ...visibleHudDescendants.map(({ box }) => box.bottom)
    ));
    const hudCanvasOverlapWidth = hud && canvas
      ? Math.max(0, Math.min(hud.x + hud.width, canvas.x + canvas.width) - Math.max(hud.x, canvas.x))
      : 0;
    const hudCanvasOverlapHeight = hud && canvas
      ? Math.max(0, Math.min(hud.y + hud.height, canvas.y + canvas.height) - Math.max(hud.y, canvas.y))
      : viewport.height;
    const hudCanvasOverlapPx = hudCanvasOverlapWidth > 1 ? hudCanvasOverlapHeight : 0;
    const canvasAreaRatio = canvas ? (canvas.width * canvas.height) / (viewport.width * viewport.height) : 0;
    const hudHeightRatio = hud ? hud.height / viewport.height : 1;
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      startHidden: document.getElementById("start-screen")?.hidden === true,
      endHidden: document.getElementById("end-screen")?.hidden === true,
      questionHidden: document.getElementById("question-dialog")?.hidden === true,
      runtimeErrors: window.__mathMazeRuntime?.errors || [],
      scroll: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        xOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        yOverflow: document.documentElement.scrollHeight > window.innerHeight + 1
      },
      rects,
      outOfBounds,
      hudDescendantOverflow,
      hudEffectiveBottomPx,
      overflowingText,
      visibleRequired,
      secondaryHidden,
      noUnicodeLives: !document.getElementById("lives")?.textContent.includes("♥"),
      progressRole: document.querySelector(".progress-wrap")?.getAttribute("role"),
      progressNow: document.querySelector(".progress-wrap")?.getAttribute("aria-valuenow"),
      pauseReadable: Boolean(document.querySelector("#pause-button [data-icon-label]")?.textContent.trim()),
      soundReadable: Boolean(document.querySelector("#sound-button [data-icon-label]")?.textContent.trim()),
      hudCanvasOverlapPx,
      canvasAreaRatio,
      hudHeightRatio
    };
  })()`);
}

async function measureFps(cdp, sessionId) {
  return evaluate(cdp, sessionId, `new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    function step(now) {
      frames += 1;
      if (now - start >= 1200) {
        resolve(Math.round(frames * 1000 / (now - start)));
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  })`);
}

function parseAnswer(questionText) {
  const numbers = (questionText.match(/\d+/g) || []).map(Number);
  if (numbers.length < 2) return null;
  return numbers[0] * numbers[1];
}

async function waitForQuestion(cdp, sessionId, timeoutMs = 10000) {
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

async function submitCurrentAnswer(cdp, sessionId, answer) {
  await evaluate(cdp, sessionId, `(() => {
    const input = document.getElementById("answer-input");
    input.value = ${JSON.stringify(String(answer))};
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("submit-answer").click();
    return true;
  })()`);
  await wait(1100);
}

async function answerQuestionIfVisible(cdp, sessionId) {
  const visible = await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === false");
  if (!visible) return false;
  const answer = await evaluate(cdp, sessionId, "document.getElementById('question-title')?.textContent || ''").then(parseAnswer);
  if (answer === null) return false;
  await submitCurrentAnswer(cdp, sessionId, answer);
  return true;
}

async function settleHudScreenshot(cdp, sessionId) {
  let answeredQuestion = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await wait(attempt === 0 ? 320 : 420);
    const visible = await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === false");
    if (visible) {
      answeredQuestion = await answerQuestionIfVisible(cdp, sessionId) || answeredQuestion;
      continue;
    }
    if (answeredQuestion || attempt >= 2) {
      return true;
    }
  }
  return await evaluate(cdp, sessionId, "document.getElementById('question-dialog')?.hidden === true");
}

async function runAcceptance(cdp, appPort) {
  const { targetId, sessionId } = await createPage(cdp, { width: 430, height: 932, mobile: true });
  const { events, off } = collectEvents(cdp, sessionId);
  await startGame(cdp, sessionId, appPort, "phase4-acceptance=1", 260);
  await settleHudScreenshot(cdp, sessionId);

  const started = await evaluate(cdp, sessionId, "document.getElementById('start-screen')?.hidden === true && document.getElementById('pause-button')?.dataset.icon === 'pause'");
  await clickSelector(cdp, sessionId, "#pause-button");
  await wait(220);
  const paused = await evaluate(cdp, sessionId, "document.getElementById('pause-button')?.dataset.icon === 'play'");
  await clickSelector(cdp, sessionId, "#pause-button");
  await wait(220);
  const resumed = await evaluate(cdp, sessionId, "document.getElementById('pause-button')?.dataset.icon === 'pause'");
  await swipeCanvas(cdp, sessionId, -120, 0);
  const mobileSwipeStillPlaying = await evaluate(cdp, sessionId, "document.getElementById('pause-button')?.dataset.icon === 'pause'");

  await clickSelector(cdp, sessionId, "#sound-button");
  const soundToggle = await evaluate(cdp, sessionId, "document.getElementById('sound-button')?.dataset.icon === 'sound-off'");

  const questionSeen = await waitForQuestion(cdp, sessionId, 12000);
  let correctAnswer = false;
  let wrongAnswer = false;
  let timeoutObserved = false;
  let gameOverObserved = false;

  if (questionSeen) {
    const answer = await evaluate(cdp, sessionId, "document.getElementById('question-title')?.textContent || ''").then(parseAnswer);
    const beforeScore = await evaluate(cdp, sessionId, "Number(document.getElementById('score')?.textContent.replace(/[^0-9]/g, '') || 0)");
    const beforeProgress = await evaluate(cdp, sessionId, "Number(document.getElementById('correct-answers')?.textContent.replace(/[^0-9]/g, '') || 0)");
    await submitCurrentAnswer(cdp, sessionId, answer ?? 1);
    const afterScore = await evaluate(cdp, sessionId, "Number(document.getElementById('score')?.textContent.replace(/[^0-9]/g, '') || 0)");
    const afterProgress = await evaluate(cdp, sessionId, "Number(document.getElementById('correct-answers')?.textContent.replace(/[^0-9]/g, '') || 0)");
    correctAnswer = afterScore > beforeScore || afterProgress > beforeProgress;
  }

  if (await waitForQuestion(cdp, sessionId, 12000)) {
    const beforeLives = await evaluate(cdp, sessionId, "document.getElementById('lives')?.getAttribute('aria-label') || ''");
    await submitCurrentAnswer(cdp, sessionId, 9999);
    const afterLives = await evaluate(cdp, sessionId, "document.getElementById('lives')?.getAttribute('aria-label') || ''");
    wrongAnswer = beforeLives !== afterLives;
  }

  if (await waitForQuestion(cdp, sessionId, 12000)) {
    await wait(27000);
    timeoutObserved = await evaluate(cdp, sessionId, `(() => {
      const feedback = document.getElementById("question-feedback")?.textContent || "";
      return feedback.includes("נגמר הזמן") || document.getElementById("question-dialog")?.hidden === true;
    })()`);
    await wait(1400);
    gameOverObserved = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
  }

  if (!gameOverObserved && await waitForQuestion(cdp, sessionId, 12000)) {
    await submitCurrentAnswer(cdp, sessionId, 9999);
    gameOverObserved = await evaluate(cdp, sessionId, "document.getElementById('end-screen')?.hidden === false");
  }

  const runtimeErrors = await evaluate(cdp, sessionId, "window.__mathMazeRuntime?.errors || []");
  off();
  await cdp.send("Target.closeTarget", { targetId });

  const checks = {
    started,
    mobileSwipeStillPlaying,
    paused,
    resumed,
    soundToggle,
    questionDialog: questionSeen,
    correctAnswer,
    wrongAnswer,
    timeoutObserved,
    gameOverObserved,
    noRuntimeErrors: runtimeErrors.length === 0,
    noConsoleErrors: events.length === 0
  };

  return {
    ok: checks.started
      && checks.paused
      && checks.resumed
      && checks.mobileSwipeStillPlaying
      && checks.soundToggle
      && checks.questionDialog
      && checks.correctAnswer
      && checks.wrongAnswer
      && checks.noRuntimeErrors
      && checks.noConsoleErrors,
    checks,
    events,
    runtimeErrors
  };
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("No Chrome or Chromium executable found. Set CHROME_PATH to run Phase 4 HUD verification.");
  }

  await mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const appPort = server.address().port;
  const cdpPort = 10500 + Math.floor(Math.random() * 500);
  const userDataDir = path.join("/private/tmp", `kaflul-phase4-hud-${process.pid}`);
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
      await startGame(cdp, sessionId, appPort, `phase4=${viewport.name}`, 260);
      await settleHudScreenshot(cdp, sessionId);
      const fps = await measureFps(cdp, sessionId);
      await settleHudScreenshot(cdp, sessionId);
      const evaluation = await inspectHud(cdp, sessionId);
      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
      }, sessionId);
      const file = path.join(outputDir, `phase4-hud-${viewport.name}.png`);
      await writeFile(file, Buffer.from(screenshot.data, "base64"));
      off();
      await cdp.send("Target.closeTarget", { targetId });

      results.push({
        ...viewport,
        file: path.relative(root, file),
        events,
        fps,
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
      || result.evaluation.hudDescendantOverflow.length > 0
      || result.evaluation.hudEffectiveBottomPx > 72
      || result.evaluation.overflowingText.length > 0
      || result.evaluation.lang !== "he"
      || result.evaluation.dir !== "rtl"
      || !result.evaluation.startHidden
      || !result.evaluation.endHidden
      || !result.evaluation.questionHidden
      || !result.evaluation.visibleRequired
      || !result.evaluation.secondaryHidden
      || !result.evaluation.noUnicodeLives
      || result.evaluation.progressRole !== "progressbar"
      || !result.evaluation.pauseReadable
      || !result.evaluation.soundReadable
      || result.evaluation.hudCanvasOverlapPx > 1
      || result.evaluation.canvasAreaRatio < 0.72
      || result.evaluation.hudHeightRatio > 0.16
      || result.fps < 30
    ));

    const report = {
      phase: 4,
      capturedAt: new Date().toISOString(),
      chrome: version.Browser,
      ok: failures.length === 0 && acceptance.ok,
      results,
      acceptance
    };
    const reportFile = path.join(outputDir, "phase4-hud-report.json");
    await writeFile(reportFile, JSON.stringify(report, null, 2));

    await cdp.send("Browser.close").catch(() => {});

    const summary = {
      ok: report.ok,
      screenshots: results.map((result) => ({
        name: result.name,
        file: result.file,
        fps: result.fps,
        consoleErrors: result.events.length,
        runtimeErrors: result.evaluation.runtimeErrors.length,
        questionHidden: result.evaluation.questionHidden,
        overflow: result.evaluation.scroll,
        outOfBounds: result.evaluation.outOfBounds.length,
        hudDescendantOverflow: result.evaluation.hudDescendantOverflow.length,
        hudEffectiveBottomPx: result.evaluation.hudEffectiveBottomPx,
        overflowingText: result.evaluation.overflowingText.length,
        visibleRequired: result.evaluation.visibleRequired,
        secondaryHidden: result.evaluation.secondaryHidden,
        hudCanvasOverlapPx: result.evaluation.hudCanvasOverlapPx,
        canvasAreaRatio: result.evaluation.canvasAreaRatio,
        hudHeightRatio: result.evaluation.hudHeightRatio,
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
