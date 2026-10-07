import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  workers: 1,
  use: {
    viewport: {width:412,height:915},
    baseURL: "http://localhost:8081",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
      args: ["--autoplay-policy=no-user-gesture-required"],
    },
  },
  webServer: {
    command:
      "EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 CI=1 npm run dev -- --web --localhost --port 8081 --max-workers 2",
    url: "http://localhost:8081/",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
