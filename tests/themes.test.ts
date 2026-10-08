import { describe, expect, it } from "vitest";
import { resolveTheme, themePresets } from "../constants/themes";
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .slice(0, 3)
    .map((c) => {
      const v = parseInt(c, 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe("theme legibility", () => {
  for (const preset of themePresets)
    for (const dark of [false, true]) {
      it(`${preset} ${dark ? "dark" : "light"} meets normal text contrast`, () => {
        const theme = resolveTheme(preset, dark);
        for (const surface of [theme.background, theme.surface, theme.elevated])
          for (const text of [
            theme.text,
            theme.muted,
            theme.accent,
            theme.error,
            theme.warning,
          ])
            expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(
          4.5,
        );
      });
    }
  it("uses true black for AMOLED dark mode", () => {
    expect(resolveTheme("amoled", true).background).toBe("#000000");
  });
});
