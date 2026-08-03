import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.KAFLUL_LANDING_URL || "http://127.0.0.1:4179";
const outputDir = resolve("docs/visual-proof-screenshots/landing");
await mkdir(outputDir, { recursive: true });

const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  screenshots: [],
  videos: [],
  audits: [],
  errors: []
};

function watchErrors(page, profile) {
  page.on("pageerror", (error) => report.errors.push(`${profile}: ${String(error)}`));
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(`${profile}: ${message.text()}`);
  });
}

async function waitForLanding(page) {
  await page.goto(`${baseUrl}/landing.html?verify=visual-proof`, { waitUntil: "domcontentloaded" });
  await page.locator('body[data-landing-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(500);
}

async function auditPage(page, profile) {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#worlds")?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(250);
  const audit = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    brokenImages: Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute("src")),
    h1: document.querySelector("h1")?.textContent?.trim() || "",
    activeJourneyStep: window.__kaflulLanding?.getActiveJourneyStep?.() || null,
    ready: window.__kaflulLanding?.ready === true
  }));

  report.audits.push({ profile, ...audit });
  if (audit.pageWidth > audit.viewportWidth + 1) {
    report.errors.push(`${profile}: horizontal overflow ${audit.pageWidth}px > ${audit.viewportWidth}px`);
  }
  if (audit.brokenImages.length > 0) {
    report.errors.push(`${profile}: broken images ${audit.brokenImages.join(", ")}`);
  }
}

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    locale: "he-IL",
    reducedMotion: "no-preference"
  });
  const desktopPage = await desktop.newPage();
  watchErrors(desktopPage, "desktop-1440x960");
  await waitForLanding(desktopPage);

  await desktopPage.mouse.move(360, 460);
  await desktopPage.waitForTimeout(180);
  const desktopHero = resolve(outputDir, "after-landing-hero-desktop-1440x960.png");
  await desktopPage.screenshot({ path: desktopHero, animations: "disabled" });
  report.screenshots.push(desktopHero);

  await desktopPage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector('[data-journey-step="question"]')?.scrollIntoView({ block: "center" });
  });
  await desktopPage.evaluate(() => window.__kaflulLanding.setJourneyStep("question"));
  await desktopPage.waitForTimeout(250);
  const desktopJourney = resolve(outputDir, "after-landing-journey-desktop-1440x960.png");
  await desktopPage.screenshot({ path: desktopJourney, animations: "disabled" });
  report.screenshots.push(desktopJourney);

  await desktopPage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector("#worlds");
    window.scrollTo(0, Math.max((section?.offsetTop || 0) + 70, 0));
  });
  await desktopPage.waitForTimeout(250);
  const desktopWorlds = resolve(outputDir, "after-landing-worlds-desktop-1440x960.png");
  await desktopPage.screenshot({ path: desktopWorlds, animations: "disabled" });
  report.screenshots.push(desktopWorlds);

  await desktopPage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector("#download");
    window.scrollTo(0, Math.max((section?.offsetTop || 0) + 35, 0));
  });
  await desktopPage.waitForTimeout(250);
  const desktopDownload = resolve(outputDir, "after-landing-download-desktop-1440x960.png");
  await desktopPage.screenshot({ path: desktopDownload, animations: "disabled" });
  report.screenshots.push(desktopDownload);

  await auditPage(desktopPage, "desktop-1440x960");
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    reducedMotion: "no-preference"
  });
  const mobilePage = await mobile.newPage();
  watchErrors(mobilePage, "mobile-390x844");
  await waitForLanding(mobilePage);
  const mobileHero = resolve(outputDir, "after-landing-hero-mobile-390x844.png");
  await mobilePage.screenshot({ path: mobileHero, animations: "disabled" });
  report.screenshots.push(mobileHero);

  await mobilePage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const step = document.querySelector('[data-journey-step="question"]');
    if (step) window.scrollTo(0, step.getBoundingClientRect().top + window.scrollY);
  });
  await mobilePage.evaluate(() => window.__kaflulLanding.setJourneyStep("question"));
  await mobilePage.waitForTimeout(300);

  const mobileJourney = resolve(outputDir, "after-landing-journey-mobile-390x844.png");
  await mobilePage.screenshot({ path: mobileJourney, animations: "disabled" });
  report.screenshots.push(mobileJourney);

  await mobilePage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const section = document.querySelector("#download");
    window.scrollTo(0, Math.max((section?.offsetTop || 0) + 20, 0));
  });
  await mobilePage.waitForTimeout(350);
  const mobileDownload = resolve(outputDir, "after-landing-download-mobile-390x844.png");
  await mobilePage.screenshot({ path: mobileDownload, animations: "disabled" });
  report.screenshots.push(mobileDownload);

  await mobilePage.locator(".qr-card").scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(250);
  const mobileQr = resolve(outputDir, "after-landing-qr-mobile-390x844.png");
  await mobilePage.screenshot({ path: mobileQr, animations: "disabled" });
  report.screenshots.push(mobileQr);
  await auditPage(mobilePage, "mobile-390x844");

  await mobile.close();

  const videoContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    reducedMotion: "no-preference",
    recordVideo: {
      dir: outputDir,
      size: { width: 390, height: 844 }
    }
  });
  const videoPage = await videoContext.newPage();
  watchErrors(videoPage, "mobile-scroll-video-390x844");
  await videoPage.goto(`${baseUrl}/landing.html?verify=scroll-video`, { waitUntil: "domcontentloaded" });
  await videoPage.locator('body[data-landing-ready="true"]').waitFor();
  await videoPage.waitForTimeout(220);
  const video = videoPage.video();
  await videoPage.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const journey = document.querySelector("#journey");
    const target = journey ? journey.offsetTop + Math.min(window.innerHeight * 0.7, 590) : 2300;
    const start = window.scrollY;
    const duration = 3800;
    const startedAt = performance.now();
    await new Promise((resolveScroll) => {
      function frame(now) {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(frame);
        else resolveScroll();
      }
      requestAnimationFrame(frame);
    });
  });
  await videoPage.waitForTimeout(450);
  await videoContext.close();
  const rawVideo = await video.path();
  const finalVideo = resolve(outputDir, "after-landing-scroll-mobile-390x844.webm");
  await rename(rawVideo, finalVideo);
  report.videos.push(finalVideo);
} finally {
  await browser.close();
}

const reportPath = resolve(outputDir, "landing-visual-proof-report.json");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (report.errors.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(report, null, 2));
}
