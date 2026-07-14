import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const args = new Set(process.argv.slice(2));
const quick = args.has("--quick");
const skipBrowser = args.has("--skip-browser");
const startedAt = new Date();

const node = process.execPath;
const playwrightCli = join(rootDir, "node_modules", "@playwright", "test", "cli.js");
const playwrightSpecs = [
  "tests/game.spec.js",
  "tests/phase1_vertical_slice.spec.js"
];

const syntaxFiles = [
  "kaflul-systems.js",
  "game.js",
  "mobile-enhancements.js",
  "poster-loader.js",
  "ui/assets/asset-manifest.js",
  "ui/character-animation-adapter.js",
  "ui/motion/motion-system.js",
  "ui/sounds/ui-sound-controller.js",
  "tools/android_webdir_gate.mjs",
  "tools/android_webdir_smoke.mjs",
  "tools/phase1_visual_regression.mjs",
  "tools/phase2_home_verification.mjs",
  "tools/phase3_hero_verification.mjs",
  "tools/phase4_hud_verification.mjs",
  "tools/phase5_secondary_verification.mjs",
  "tools/phase6_motion_audio_verification.mjs",
  "tools/phase7_final_qa_verification.mjs",
  "tools/world1_collision_proof.mjs",
  "tools/release_gate.mjs",
  "tests/phase1_vertical_slice.spec.js"
];

const steps = [
  ...syntaxFiles.map((file) => ({
    name: `syntax:${file}`,
    command: node,
    args: ["--check", file]
  })),
  {
    name: "unit:kaflul-systems",
    command: node,
    args: ["--test", "tests/kaflul-systems.test.js"]
  },
  {
    name: "android:webdir",
    command: node,
    args: ["tools/android_webdir_gate.mjs"]
  }
];

if (!skipBrowser) {
  steps.push({
    name: "proof:world1-collision",
    command: node,
    args: ["tools/world1_collision_proof.mjs"]
  });

  steps.push({
    name: "android:smoke",
    command: node,
    args: ["tools/android_webdir_smoke.mjs"]
  });

  steps.push({
    name: "playwright:mobile",
    command: node,
    args: [playwrightCli, "test", ...playwrightSpecs, "--project=mobile-chromium"]
  });

  if (!quick) {
    steps.push({
      name: "playwright:desktop",
      command: node,
      args: [playwrightCli, "test", ...playwrightSpecs, "--project=desktop-chromium"]
    });
  }
}

const results = [];
let failed = false;

console.log(`Kaflul release gate started (${quick ? "quick" : "full"})`);

for (const step of steps) {
  const start = Date.now();
  console.log(`\n[gate] ${step.name}`);
  const result = spawnSync(step.command, step.args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe"
  });

  const durationMs = Date.now() - start;
  const passed = result.status === 0;
  results.push({
    name: step.name,
    passed,
    status: result.status,
    durationMs
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (!passed) {
    failed = true;
    console.error(`[gate] failed: ${step.name}`);
    break;
  }
}

const finishedAt = new Date();
const report = {
  mode: quick ? "quick" : "full",
  skipBrowser,
  passed: !failed,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  results
};

const reportDir = join(rootDir, "docs", "release-gates");
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(`\nKaflul release gate ${failed ? "FAILED" : "PASSED"}`);
console.log("Report: docs/release-gates/latest.json");

process.exit(failed ? 1 : 0);
