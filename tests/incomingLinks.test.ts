import { describe, it, expect, vi } from "vitest";
vi.mock("react-native", () => ({
  NativeModules: {},
  Platform: { OS: "android" },
}));
import { incomingVideo } from "../utils/incomingLinks";
describe("external YouTube links", () => {
  it.each([
    "https://youtu.be/abcdefghijk?si=123",
    "https://www.youtube.com/watch?v=abcdefghijk",
    "http://m.youtube.com/shorts/abcdefghijk",
    "https://youtube.com/live/abcdefghijk",
  ])("accepts supported video links: %s", (url) =>
    expect(incomingVideo(url)).toBe(
      "https://www.youtube.com/watch?v=abcdefghijk",
    ),
  );
  it("extracts a link embedded in a WhatsApp message", () =>
    expect(incomingVideo("شاهد هذا https://youtu.be/abcdefghijk.")).toContain(
      "v=abcdefghijk",
    ));
  it.each([
    "https://youtube.com.evil.test/watch?v=abcdefghijk",
    "https://user:password@youtube.com/watch?v=abcdefghijk",
    "file:///tmp/video.mp4",
    "javascript:alert(1)",
    "https://youtube.com/playlist?list=123",
    "https://youtu.be/invalid",
    "x".repeat(5000),
  ])("rejects unsupported or deceptive input", (value) =>
    expect(incomingVideo(value)).toBeUndefined(),
  );
});
