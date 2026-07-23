const { defineConfig, devices } = require("@playwright/test");

const testPort = Number(process.env.KAFLUL_PLAYWRIGHT_PORT) || 4173;
const testBaseURL = `http://127.0.0.1:${testPort}`;

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: testBaseURL,
    trace: "retain-on-failure",
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
    command: `python3 -m http.server ${testPort} --bind 127.0.0.1`,
    url: testBaseURL,
    reuseExistingServer: process.env.KAFLUL_PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 15_000
  }
});
