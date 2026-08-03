#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const port = Number(readOption("--port", "9222"));
const sampleCount = Math.max(30, Math.min(600, Number(readOption("--frames", "180"))));
const actorCount = Math.max(0, Math.min(20, Number(readOption("--actors", "5"))));
const outputPath = readOption("--output", "");
const summaryOnly = process.argv.includes("--summary-only");

const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => {
  if (!response.ok) throw new Error(`DevTools target request failed: ${response.status}`);
  return response.json();
});
const target = targets.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
if (!target) throw new Error(`No WebView page target found on port ${port}`);

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send("Runtime.enable");

async function evaluateValue(expression) {
  const evaluation = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return evaluation.result?.value;
}

let runtimeReady = await evaluateValue("Boolean(window.__mathMazeRuntime?.forceLevelForVerification)");
if (!runtimeReady) {
  await send("Page.enable");
  await send("Page.navigate", {
    url: "https://localhost/?verify=android-jank&verifyLevel=0"
  });
  for (let attempt = 0; attempt < 80 && !runtimeReady; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      runtimeReady = await evaluateValue("Boolean(window.__mathMazeRuntime?.forceLevelForVerification)");
    } catch {
      runtimeReady = false;
    }
  }
}
if (!runtimeReady) throw new Error("Timed out waiting for the Math Maze verification runtime");

const expression = `
  (async () => {
    const runtime = window.__mathMazeRuntime;
    if (!runtime?.forceLevelForVerification || !runtime?.getPlayerSnapshot) {
      throw new Error("Math Maze verification runtime is unavailable");
    }

    runtime.forceLevelForVerification(0);
    runtime.setPlayerCellForVerification(2, 23);
    runtime.setPlayerDirectionForVerification("none");
    runtime.spawnEnemiesForVerification?.(${actorCount});
    runtime.resumeLiveGameplayForVerification?.();

    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (let index = 0; index < 12; index += 1) await nextFrame();

    const stage = document.querySelector(".stage");
    if (!stage) throw new Error("Gameplay stage is unavailable");
    const rect = stage.getBoundingClientRect();
    const startX = rect.left + rect.width * 0.46;
    const startY = rect.top + rect.height * 0.54;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      pointerId: 73,
      pointerType: "touch",
      isPrimary: true,
      buttons: 1
    };
    stage.dispatchEvent(new PointerEvent("pointerdown", {
      ...eventInit,
      clientX: startX,
      clientY: startY
    }));
    stage.dispatchEvent(new PointerEvent("pointermove", {
      ...eventInit,
      clientX: startX + 84,
      clientY: startY
    }));
    stage.dispatchEvent(new PointerEvent("pointerup", {
      ...eventInit,
      buttons: 0,
      clientX: startX + 84,
      clientY: startY
    }));

    const samples = [];
    let previousTime = await nextFrame();
    let previousPlayer = runtime.getPlayerSnapshot();
    for (let index = 0; index < ${sampleCount}; index += 1) {
      const now = await nextFrame();
      const player = runtime.getPlayerSnapshot();
      samples.push({
        index,
        deltaMs: now - previousTime,
        stepPx: Math.hypot(player.x - previousPlayer.x, player.y - previousPlayer.y),
        x: player.x,
        y: player.y,
        direction: player.direction
      });
      previousTime = now;
      previousPlayer = player;
    }
    runtime.setPlayerDirectionForVerification("none");

    const percentile = (values, ratio) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
    };
    const deltas = samples.map((sample) => sample.deltaMs);
    const steps = samples.map((sample) => sample.stepPx);
    const totalMs = deltas.reduce((sum, value) => sum + value, 0);
    const movedSamples = samples.filter((sample) => sample.stepPx > 0.01);

    return {
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      sampleCount: samples.length,
      actorCount: ${actorCount},
      effectiveFps: totalMs > 0 ? 1000 * samples.length / totalMs : 0,
      frameMs: {
        median: percentile(deltas, 0.5),
        p90: percentile(deltas, 0.9),
        p95: percentile(deltas, 0.95),
        p99: percentile(deltas, 0.99),
        max: Math.max(...deltas),
        over20: deltas.filter((value) => value > 20).length,
        over33: deltas.filter((value) => value > 33.4).length,
        over50: deltas.filter((value) => value > 50).length
      },
      renderedMovement: {
        movingFrameCount: movedSamples.length,
        medianStepPx: percentile(steps, 0.5),
        p95StepPx: percentile(steps, 0.95),
        maxStepPx: Math.max(...steps),
        jumpsOver6Px: steps.filter((value) => value > 6.2).length,
        jumpsOver10Px: steps.filter((value) => value > 10).length
      },
      finalPlayer: runtime.getPlayerSnapshot(),
      renderProfile: runtime.profileRenderForVerification?.(16) || null,
      samples
    };
  })()
`;

const evaluation = await send("Runtime.evaluate", {
  expression,
  awaitPromise: true,
  returnByValue: true,
  userGesture: true
});
socket.close();

if (evaluation.exceptionDetails) {
  throw new Error(evaluation.exceptionDetails.exception?.description
    || evaluation.exceptionDetails.text
    || "WebView evaluation failed");
}

const result = evaluation.result?.value;
if (!result) throw new Error("WebView probe returned no result");
const output = `${JSON.stringify(result, null, 2)}\n`;
if (outputPath) await writeFile(outputPath, output);
process.stdout.write(summaryOnly
  ? `${JSON.stringify({
      actorCount: result.actorCount,
      effectiveFps: result.effectiveFps,
      frameMs: result.frameMs,
      renderedMovement: result.renderedMovement,
      renderProfile: result.renderProfile
    }, null, 2)}\n`
  : output);
