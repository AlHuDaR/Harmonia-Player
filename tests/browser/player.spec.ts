import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
for (const [file, type] of [
  ["tone.mp3", "audio/mpeg"],
  ["video.mp4", "video/mp4"],
]) {
  test(`plays, pauses and seeks ${file}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const bytes = readFileSync(resolve("tests/fixtures", file));
    await page.route(`https://media.test/${file}`, (r) => {
      const range = r
        .request()
        .headers()
        .range?.match(/bytes=(\d+)-(\d*)/);
      const start = range ? Number(range[1]) : 0;
      const end = range?.[2] ? Number(range[2]) : bytes.length - 1;
      return r.fulfill({
        status: range ? 206 : 200,
        body: bytes.subarray(start, end + 1),
        contentType: type,
        headers: {
          "access-control-allow-origin": "*",
          "accept-ranges": "bytes",
          ...(range
            ? { "content-range": `bytes ${start}-${end}/${bytes.length}` }
            : {}),
        },
      });
    });
    await page.goto("/library");
    await page.getByRole("button", { name: "Open link", exact: true }).click();
    await page
      .getByLabel("Media URL", { exact: true })
      .fill(`https://media.test/${file}`);
    await page.getByRole("button", { name: "Open URL", exact: true }).click();
    const video = page.locator("video");
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(1);
    await page.getByLabel("Back to browsing", { exact: true }).click();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
      .toBe(false);
    await page.getByLabel("Expand player", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add To", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/player-${file}.png`,
      fullPage: true,
    });
    await page.getByLabel("Pause", { exact: true }).click();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
      .toBe(true);
    await page.getByLabel("Seek forward 10 seconds").click();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(10);
    await page.getByLabel("Favorite", { exact: true }).click();
    await page.getByLabel("Close player", { exact: true }).click();
    await expect(video).toHaveCount(0);
    await page.getByRole("tab", { name: /Library/ }).click();
    await expect(page.getByText(file, { exact: true }).first()).toBeVisible();
    await page.getByLabel("Playlist name").fill("Road trip");
    await page.getByRole("button", { name: "Create playlist" }).click();
    await page.reload();
    await expect(page.getByText("Road trip", { exact: true })).toBeVisible();
    await expect(page.getByText(file, { exact: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("shows actionable search setup and direct URL errors", async ({
  page,
}) => {
  await page.goto("/library");
  await page.getByRole("button", { name: "Open link", exact: true }).click();
  await page
    .getByLabel("Media URL", { exact: true })
    .fill("http://example.com/a.mp3");
  await page.getByRole("button", { name: "Open URL", exact: true }).click();
  await expect(
    page.getByText("Enter a direct HTTPS audio or video URL."),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Search/ }).click();
  await page.getByLabel("Search query").fill("test");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText(
      /YouTube search and streams are available in the Android APK/,
    ),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Downloads/ }).click();
  await expect(page.getByText(/Files are saved privately/)).toBeVisible();
  await page.getByRole("tab", { name: /Settings/ }).click();
  await expect(
    page.getByLabel("Background playback", { exact: true }),
  ).toBeVisible();
});

test("language switches instantly and persists with a clean Home", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Media URL", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: /Settings/ }).click();
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.getByRole("tab", { name: /الرئيسية/ })).toBeVisible();
  await expect(page.getByText("اللغة", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("اللغة", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/settings-ar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByRole("tab", { name: /Home/ })).toBeVisible();
});

test("Downloads Previous and Next follow the saved list", async ({ page }) => {
  const bytes = readFileSync(resolve("tests/fixtures/tone.mp3"));
  await page.route("https://offline.test/**", (r) =>
    r.fulfill({
      status: 200,
      body: bytes,
      contentType: "audio/mpeg",
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.addInitScript(() => {
    const tracks = [1, 2, 3].map((n) => ({
      id: `offline:${n}`,
      title: `Saved ${n}`,
      artist: "Offline library",
      kind: "audio",
      localUri: `https://offline.test/${n}.mp3`,
    }));
    localStorage.setItem(
      "harmonia-library-v1",
      JSON.stringify({
        state: {
          tracks,
          downloads: tracks.map((track) => ({
            track,
            status: "complete",
            progress: 1,
          })),
          favorites: [],
          playlists: [],
          history: [],
          queue: [],
          language: "en",
          settings: { background: true, autoPip: false },
        },
        version: 0,
      }),
    );
  });
  await page.goto("/downloads");
  await page.getByRole("button", { name: "Play all", exact: true }).click();
  const video = page.locator("video");
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentSrc))
    .toContain("/1.mp3");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentSrc))
    .toContain("/2.mp3");
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentSrc))
    .toContain("/1.mp3");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentSrc))
    .toContain("/3.mp3");
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeDisabled();
});
