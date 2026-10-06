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
    await page.goto("/");
    await page
      .getByLabel("Media URL", { exact: true })
      .fill(`https://media.test/${file}`);
    await page.getByRole("button", { name: "Open URL", exact: true }).click();
    const video = page.locator("video");
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(1);
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
    await expect(page.getByText("♥ Saved").first()).toBeVisible();
    await page.getByLabel("Playlist name").fill("Road trip");
    await page.getByRole("button", { name: "Create playlist" }).click();
    await page.reload();
    await expect(page.getByText("Road trip", { exact: true })).toBeVisible();
    await expect(page.getByText("♥ Saved").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("shows actionable search setup and direct URL errors", async ({
  page,
}) => {
  await page.goto("/");
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
  await expect(page.getByText(/YouTube search and streams are available in the Android APK/)).toBeVisible();
  await page.getByRole("tab", { name: /Downloads/ }).click();
  await expect(page.getByText(/Files are saved privately/)).toBeVisible();
  await page.getByRole("tab", { name: /Settings/ }).click();
  await expect(
    page.getByLabel("Background playback", { exact: true }),
  ).toBeVisible();
});
