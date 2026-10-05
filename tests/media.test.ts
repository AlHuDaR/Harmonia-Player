import { describe, expect, it } from "vitest";
import { directTrack } from "../types/media";
describe("direct media input", () => {
  it("classifies audio URLs with query strings", () => {
    const t = directTrack(" https://example.com/song.mp3?token=abc ");
    expect(t.kind).toBe("audio");
    expect(t.uri).toBe("https://example.com/song.mp3?token=abc");
  });
  it("rejects page links, insecure schemes and embedded credentials", () => {
    for (const uri of [
      "javascript:alert(1)",
      "http://example.com/a.mp4",
      "https://u:p@example.com/a.mp4",
      "https://youtu.be/abcdefghijk",
      "https://www.youtube.com/watch?v=abcdefghijk",
    ])
      expect(() => directTrack(uri)).toThrow();
  });
  it("keeps different signed URLs distinct and honors the title", () => {
    expect(directTrack("https://example.com/v.mp4?q=1").id).not.toBe(
      directTrack("https://example.com/v.mp4?q=2").id,
    );
    expect(directTrack("https://example.com/v.mp4", " Test ").title).toBe(
      "Test",
    );
  });
});
