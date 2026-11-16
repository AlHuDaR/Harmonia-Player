import { expect, test } from "@playwright/test";

test("Arabic library sorting works with the keyboard and preserves playlist order", async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = [
      { id: "first", title: "ألبوم قديم", artist: "فرقة ألف", kind: "audio" },
      { id: "second", title: "ألبوم جديد", artist: "فرقة ألف", kind: "audio" },
    ];
    localStorage.setItem("harmonia-library-v1", JSON.stringify({
      version: 0,
      state: {
        language: "ar",
        settings: { theme: "light" },
        tracks,
        favorites: tracks.map(({ id }) => id),
        playlists: [{ id: "mix", name: "مكتبتي", trackIds: ["first", "second"] }],
      },
    }));
  });

  await page.goto("/library");
  const group = page.getByRole("radiogroup", { name: "الترتيب حسب" });
  const titleSort = group.getByRole("radio", { name: "العنوان", exact: true });
  const tracks = page.getByText(/^ألبوم /);
  await expect(tracks).toHaveText(["ألبوم قديم", "ألبوم جديد"]);
  await titleSort.focus();
  await titleSort.press("Enter");
  await expect(titleSort).toBeChecked();
  await expect(tracks).toHaveText(["ألبوم جديد", "ألبوم قديم"]);

  const search = page.getByRole("textbox", { name: "البحث في المكتبة" });
  await search.fill("فرقة ألف");
  await expect(tracks).toHaveText(["ألبوم جديد", "ألبوم قديم"]);
  await search.fill("قديم");
  await expect(tracks).toHaveText(["ألبوم قديم"]);
  await group.getByRole("radio", { name: "الترتيب الافتراضي" }).click();
  await expect(search).toHaveValue("قديم");
  await search.clear();
  await expect(tracks).toHaveText(["ألبوم قديم", "ألبوم جديد"]);

  await titleSort.click();
  await page.getByRole("radio", { name: "قوائم التشغيل", exact: true }).click();
  await expect(group).toHaveCount(0);
  await page.getByRole("button", { name: "مكتبتي", exact: true }).click();
  await expect(tracks).toHaveText(["ألبوم قديم", "ألبوم جديد"]);
});
