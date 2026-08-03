const { defineConfig, devices } = require("@playwright/test");

const testPort = Number(process.env.KAFLUL_PLAYWRIGHT_PORT) || 4173;
const testBaseURL = `http://127.0.0.1:${testPort}`;
const isCI = Boolean(process.env.CI);

module.exports = defineConfig({
  testDir: "./tests",
  timeout: isCI ? 90_000 : 30_000,
  expect: { timeout: isCI ? 20_000 : 8_000 },
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: testBaseURL,
    reducedMotion: isCI ? "reduce" : "no-preference",
    trace: isCI ? "off" : "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ],
  webServer: {
    command: "node tools/playwright_test_server.mjs",
    url: testBaseURL,
    reuseExistingServer: process.env.KAFLUL_PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 15_000
  }
});
