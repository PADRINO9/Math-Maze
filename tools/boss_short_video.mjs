#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.KAFLUL_BASE_URL || "http://127.0.0.1:4178";
const outputPath = path.resolve(
  process.env.KAFLUL_BOSS_VIDEO_OUTPUT
    || "docs/visual-proof-screenshots/boss-encounter/kaflul-boss-walk-polished.webm"
);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "he-IL"
});
await context.addInitScript(() => {
  localStorage.setItem("mathMazeCharacter", "bifly");
  localStorage.setItem("mathMazeWorld1Concept", "sun-garden");
  localStorage.setItem("mathMazeTimeLimit", "off");
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await page.exposeFunction("saveBossVideo", async (base64) => {
  await writeFile(outputPath, Buffer.from(base64, "base64"));
});

try {
  await page.goto(`${baseUrl}/?verify=boss-short-video`, { waitUntil: "domcontentloaded" });
  await page.locator("#app-loading-screen").waitFor({ state: "hidden", timeout: 15_000 });
  await page.waitForFunction(() => window.__mathMazeRuntime?.gameReady);
  await page.locator("#start-button").click();
  await page.locator("#start-screen").waitFor({ state: "hidden" });

  const report = await page.evaluate(async () => {
    const runtime = window.__mathMazeRuntime;
    runtime.forceLevelForVerification(0);
    runtime.setBossQuestionFeedbackDelayForVerification(120);
    runtime.forceBossChallenge();
    runtime.completeBossCinematicForVerification();
    runtime.setPlayerCellForVerification(34, 23);
    runtime.setBossCellForVerification(20, 23);
    runtime.setPlayerDirectionForVerification("right");
    await new Promise((resolve) => setTimeout(resolve, 450));

    const canvas = document.querySelector("#game-canvas");
    const camera = runtime.getBossCameraSnapshotForVerification();
    const cropWidth = camera?.projectionWidth || canvas.width;
    const cropX = Math.max(0, (canvas.width - cropWidth) / 2);
    const portraitCanvas = document.createElement("canvas");
    portraitCanvas.width = 432;
    portraitCanvas.height = 848;
    const portraitContext = portraitCanvas.getContext("2d", { alpha: false });
    let copyingFrames = true;
    const copyFrame = () => {
      portraitContext.drawImage(
        canvas,
        cropX,
        0,
        cropWidth,
        canvas.height,
        0,
        0,
        portraitCanvas.width,
        portraitCanvas.height
      );
      if (copyingFrames) requestAnimationFrame(copyFrame);
    };
    copyFrame();
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const stream = portraitCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_500_000
    });
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    const stopped = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));

    const before = runtime.getBossEncounterSnapshot();
    recorder.start(180);
    await new Promise((resolve) => setTimeout(resolve, 2600));
    const chaseEnd = runtime.getBossEncounterSnapshot();
    const contact = chaseEnd.phase === "question"
      ? { question: { status: document.querySelector("#question-status")?.textContent || "" } }
      : runtime.forceBossContactForVerification();
    await new Promise((resolve) => setTimeout(resolve, 650));
    runtime.answerCurrentQuestionForVerification(undefined, true);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    recorder.stop();
    await stopped;
    copyingFrames = false;

    const after = runtime.getBossEncounterSnapshot();
    const blob = new Blob(chunks, { type: mimeType });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const stride = 0x8000;
    for (let index = 0; index < bytes.length; index += stride) {
      binary += String.fromCharCode(...bytes.subarray(index, index + stride));
    }
    await window.saveBossVideo(btoa(binary));
    stream.getTracks().forEach((track) => track.stop());
    return {
      before,
      chaseEnd,
      contactStatus: contact.question?.status,
      after,
      mimeType,
      byteLength: bytes.length
    };
  });

  const passed = errors.length === 0
    && report.before?.boss?.healthRemaining === 3
    && report.contactStatus?.includes("פגיעה")
    && report.after?.boss?.healthRemaining === 2
    && report.byteLength > 100_000;
  console.log(JSON.stringify({ passed, outputPath, errors, report }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
