import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
for (const language of ["en", "ar"] as const) {
  test(`clear search preserves focus, filter and bilingual editing (${language})`, async ({
    page,
  }) => {
    await page.addInitScript((language) => {
      const track = {
        id: "saved",
        title: "مقطع English clip.mp4",
        artist: "Artist",
        kind: "video",
        localUri: "file:///saved.mp4",
      };
      localStorage.setItem(
        "harmonia-library-v1",
        JSON.stringify({
          version: 0,
          state: {
            language,
            tracks: [track],
            downloads: [{ track, status: "complete", progress: 1 }],
            favorites: [],
            history: [],
            playlists: [],
            settings: { theme: "light" },
          },
        }),
      );
    }, language);
    await page.goto("/downloads");
    const query = page.getByLabel(
      language === "en" ? "Search downloads" : "البحث في التنزيلات",
      { exact: true },
    );
    const clear = page.getByRole("button", {
      name: language === "en" ? "Clear search" : "مسح البحث",
      exact: true,
    });
    await expect(clear).toHaveCount(0);
    await page
      .getByRole("radio", {
        name: language === "en" ? "Offline" : "دون إنترنت",
        exact: true,
      })
      .click();
    for (const [text, direction] of [
      ["123 مقطع English", "rtl"],
      ["English مقطع 123.mp4", "ltr"],
      ["https://example.com/عربي.mp4", "ltr"],
    ]) {
      await query.fill(text);
      await expect(query).toHaveValue(text);
      await expect(query).toHaveCSS("direction", direction);
      await expect(clear).toBeVisible();
    }
    await clear.click();
    await expect(query).toHaveValue("");
    await expect(query).toBeFocused();
    await expect(clear).toHaveCount(0);
    await expect(
      page.getByText("مقطع English clip.mp4", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", {
        name: language === "en" ? "Offline" : "دون إنترنت",
        exact: true,
      }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("harmonia-library-v1")!).state
            .downloads.length,
      ),
    ).toBe(1);
  });
  test(`remote search clears errors and keeps active draft on tab return (${language})`, async ({
    page,
  }) => {
    await page.goto("/settings");
    if (language === "ar")
      await page.getByRole("radio", { name: "العربية", exact: true }).click();
    await page
      .getByRole("tab", {
        name: language === "en" ? "Search" : "البحث",
        exact: true,
      })
      .click();
    const query = page.getByLabel(
      language === "en" ? "Search query" : "عبارة البحث",
      { exact: true },
    );
    await query.fill("عربي English 123");
    await query.press("Enter");
    await expect(page.getByRole("alert")).toBeVisible();
    await page
      .getByRole("tab", {
        name: language === "en" ? "Home" : "الرئيسية",
        exact: true,
      })
      .click();
    await page
      .getByRole("tab", {
        name: language === "en" ? "Search" : "البحث",
        exact: true,
      })
      .click();
    await expect(query).toHaveValue("عربي English 123");
    await page
      .getByRole("button", {
        name: language === "en" ? "Clear search" : "مسح البحث",
        exact: true,
      })
      .click();
    await expect(query).toBeFocused();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(
      page.getByText(
        language === "en" ? "Find your next listen" : "اعثر على مقطعك التالي",
        { exact: true },
      ),
    ).toBeVisible();
  });
}
test("unsupported Cast environment leaves local playback, seeking and speed operational", async ({
  page,
}) => {
  const bytes = readFileSync("tests/fixtures/video.mp4");
  await page.route("https://media.example.com/cast-test.mp4", (route) => {
    const range = route
      .request()
      .headers()
      .range?.match(/bytes=(\d+)-(\d*)/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Number(range[2]) : bytes.length - 1;
    return route.fulfill({
      status: range ? 206 : 200,
      body: bytes.subarray(start, end + 1),
      contentType: "video/mp4",
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
    .fill("https://media.example.com/cast-test.mp4");
  await page.getByRole("button", { name: "Open URL", exact: true }).click();
  const video = page.locator("video");
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Cast", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Google Play services");
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(false);
  await page
    .getByRole("button", { name: "Playback speed 1×", exact: true })
    .click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.playbackRate))
    .toBe(1.25);
  await page.getByLabel("Pause", { exact: true }).click();
  await page.getByLabel("Seek forward 10 seconds", { exact: true }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(10);
  await page.getByRole("button", { name: "Close player", exact: true }).click();
  await expect(video).toHaveCount(0);
  await page.getByRole("radio", { name: "Saved tracks", exact: true }).click();
  await page.getByText("cast-test.mp4", { exact: true }).first().click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.playbackRate))
    .toBe(1.25);
});
