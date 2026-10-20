import { describe, expect, it } from "vitest";
import {
  classifyLink,
  publicWebUrl,
  sharedLinks,
} from "../utils/linkProviders";
import { intentInbox } from "../utils/incomingLinks";
describe("provider capabilities", () => {
  it.each([
    ["https://instagram.com/reel/123", "Instagram"],
    ["https://facebook.com/reel/123", "Facebook"],
    ["https://vm.tiktok.com/123", "TikTok"],
    ["https://x.com/u/status/123", "X / Twitter"],
    ["https://reddit.com/r/videos/123", "Reddit"],
    ["https://vimeo.com/123", "Vimeo"],
  ])("recognizes %s without claiming extraction", (url, provider) => {
    expect(classifyLink(url)).toMatchObject({
      provider,
      kind: "web",
      actions: ["save", "browser"],
    });
  });
  it("never infers media from a social page suffix or query", () => {
    expect(classifyLink("https://instagram.com/a.mp4").kind).toBe("web");
    expect(classifyLink("https://example.com/page?file=x.mp4").kind).toBe(
      "web",
    );
    expect(classifyLink("https://youtube.com/playlist?list=x").kind).toBe(
      "web",
    );
  });
  it("offers candidate HTTPS files and keeps adaptive streams playback-only", () => {
    expect(classifyLink("https://example.com/a.mp4?sig=1").actions).toContain(
      "download",
    );
    expect(classifyLink("https://example.com/a.m3u8").actions).not.toContain(
      "download",
    );
    expect(classifyLink("http://example.com/a.mp4").actions).toEqual([
      "save",
      "browser",
    ]);
  });
  it("canonicalizes Shorts without fetching metadata or assuming file delivery", () => {
    expect(
      classifyLink("http://m.youtube.com/shorts/abcdefghijk?si=1"),
    ).toMatchObject({
      kind: "youtube",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
    });
  });
  it("handles bilingual multi-link text, deduplication, punctuation and limits", () => {
    expect(
      sharedLinks(
        "شاهد https://youtu.be/abcdefghijk. https://www.youtube.com/watch?v=abcdefghijk https://example.com/a.mp3",
      ),
    ).toHaveLength(2);
    expect(sharedLinks("x".repeat(4097))).toEqual([]);
  });
});
describe("unsafe inputs", () => {
  it.each([
    "file:///etc/passwd",
    "javascript:alert(1)",
    "content://media/1",
    "https://user:pass@example.com/a.mp4",
    "https://localhost/a.mp4",
    "https://127.0.0.1/a",
    "https://2130706433/a",
    "https://0x7f000001/a",
    "https://10.0.0.1/a",
    "https://169.254.169.254/a",
    "https://[::1]/a",
    "https://[::ffff:127.0.0.1]/a",
    "https://server.local/a",
    "https://host.internal/a",
    "https://metadata.google.internal/a",
    "https://example.com:9000/a",
    "https://example.com\\@localhost/a",
    "https://example.com/\na",
  ])("rejects %s", (url) => expect(() => publicWebUrl(url)).toThrow());
  it("does not assign platform capabilities to a deceptive host", () => {
    expect(
      classifyLink("https://youtube.com.evil.example/watch?v=abcdefghijk").kind,
    ).toBe("web");
    expect(classifyLink("https://notinstagram.com/a").provider).not.toBe(
      "Instagram",
    );
  });
});
describe("intent event/pending reconciliation", () => {
  it("processes cold pending and warm events once each, permitting repeated URLs", () => {
    const receive = intentInbox();
    const cold = { text: "https://youtu.be/abcdefghijk", token: "cold" };
    expect(receive(cold)).toBe(cold.text);
    expect(receive(cold)).toBeUndefined();
    expect(receive({ ...cold, token: "warm" })).toBe(cold.text);
    expect(receive({ ...cold, token: "warm" })).toBeUndefined();
  });
  it("ignores invalid native payloads and bounds retained tokens", () => {
    const receive = intentInbox(2);
    for (const value of [
      null,
      {},
      { text: 1, token: "x" },
      { text: "x", token: "" },
    ])
      expect(receive(value)).toBeUndefined();
    for (const token of ["a", "b", "c"])
      expect(receive({ text: token, token })).toBe(token);
    expect(receive({ text: "a", token: "a" })).toBe("a");
  });
});
