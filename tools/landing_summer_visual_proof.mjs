import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.KAFLUL_LANDING_URL || "http://127.0.0.1:4179";
const outputDir = resolve("docs/visual-proof-screenshots/landing-summer");
await mkdir(outputDir, { recursive: true });

const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  screenshots: [],
  audits: [],
  interactions: {},
  download: {},
  errors: []
};

function watchErrors(page, profile) {
  page.on("pageerror", (error) => report.errors.push(`${profile}: ${String(error)}`));
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(`${profile}: ${message.text()}`);
  });
}

async function waitForLanding(page) {
  await page.goto(`${baseUrl}/landing.html?verify=summer-proof`, { waitUntil: "domcontentloaded" });
  await page.locator('body[data-landing-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(450);
}

async function captureSection(page, selector, filename, offset = 0) {
  await page.evaluate(({ selector: targetSelector, offset: targetOffset }) => {
    document.documentElement.style.scrollBehavior = "auto";
    const target = document.querySelector(targetSelector);
    if (!target) return;
    window.scrollTo(0, Math.max(target.offsetTop + targetOffset, 0));
  }, { selector, offset });
  await page.waitForTimeout(350);
  const path = resolve(outputDir, filename);
  await page.screenshot({ path, animations: "disabled" });
  report.screenshots.push(path);
}

async function auditPage(page, profile) {
  const audit = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    brokenImages: Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute("src")),
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || "",
    shareButtons: document.querySelectorAll("[data-share]").length,
    apkLinks: Array.from(document.querySelectorAll('a[href$=".apk"]')).map((link) => ({
      href: link.getAttribute("href"),
      download: link.getAttribute("download")
    })),
    ready: window.__kaflulLanding?.ready === true
  }));

  report.audits.push({ profile, ...audit });
  if (audit.pageWidth > audit.viewportWidth + 1) {
    report.errors.push(`${profile}: horizontal overflow ${audit.pageWidth}px > ${audit.viewportWidth}px`);
  }
  if (audit.brokenImages.length > 0) {
    report.errors.push(`${profile}: broken images ${audit.brokenImages.join(", ")}`);
  }
  if (!audit.ready) report.errors.push(`${profile}: landing readiness API missing`);
  if (audit.shareButtons < 3) report.errors.push(`${profile}: expected at least three share actions`);
  if (audit.apkLinks.length < 2) report.errors.push(`${profile}: expected two APK download actions`);
}

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    locale: "he-IL",
    reducedMotion: "no-preference",
    permissions: ["clipboard-read", "clipboard-write"]
  });
  const desktopPage = await desktop.newPage();
  watchErrors(desktopPage, "desktop-1440x960");
  await waitForLanding(desktopPage);

  await desktopPage.mouse.move(360, 460);
  await desktopPage.waitForTimeout(180);
  const desktopHero = resolve(outputDir, "after-summer-hero-desktop-1440x960.png");
  await desktopPage.screenshot({ path: desktopHero, animations: "disabled" });
  report.screenshots.push(desktopHero);

  await captureSection(desktopPage, "#summer", "after-summer-routine-desktop-1440x960.png", 20);
  await captureSection(desktopPage, "#download", "after-summer-download-desktop-1440x960.png", 30);

  await desktopPage.locator(".button-share").click();
  await desktopPage.locator("[data-share-toast]:not([hidden])").waitFor();
  report.interactions.desktopShareMessage = await desktopPage.locator("[data-share-message]").textContent();
  report.interactions.desktopClipboard = await desktopPage.evaluate(() => navigator.clipboard.readText());

  const apkResponse = await desktopPage.request.fetch(`${baseUrl}/dist/kaflul-updated-20260729.apk`, { method: "HEAD" });
  report.download = {
    status: apkResponse.status(),
    ok: apkResponse.ok(),
    contentLength: apkResponse.headers()["content-length"] || null,
    contentType: apkResponse.headers()["content-type"] || null
  };
  if (!apkResponse.ok()) report.errors.push(`apk: server returned ${apkResponse.status()}`);

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

  const mobileHero = resolve(outputDir, "after-summer-hero-mobile-390x844.png");
  await mobilePage.screenshot({ path: mobileHero, animations: "disabled" });
  report.screenshots.push(mobileHero);

  await captureSection(mobilePage, "#summer", "after-summer-routine-mobile-390x844.png", 12);
  await mobilePage.locator(".summer-proof").scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(300);
  const mobileSummerProof = resolve(outputDir, "after-summer-proof-mobile-390x844.png");
  await mobilePage.screenshot({ path: mobileSummerProof, animations: "disabled" });
  report.screenshots.push(mobileSummerProof);
  await captureSection(mobilePage, "#download", "after-summer-download-mobile-390x844.png", 16);
  await auditPage(mobilePage, "mobile-390x844");
  await mobile.close();
} finally {
  await browser.close();
}

if (!String(report.interactions.desktopClipboard || "").includes("math-maze-il.vercel.app/landing.html")) {
  report.errors.push("share: canonical landing URL was not copied to the clipboard");
}

const reportPath = resolve(outputDir, "landing-summer-visual-proof-report.json");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (report.errors.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(report, null, 2));
}
