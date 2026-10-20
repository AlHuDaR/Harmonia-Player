import { describe, it, expect, vi, beforeEach } from "vitest";
const native = vi.hoisted(() => ({ discover: vi.fn() }));
const youtube = vi.hoisted(() => ({
  youtubeTrack: vi.fn(),
  youtubeFormats: vi.fn(),
  formatTrack: vi.fn((t, f) => ({ ...t, kind: f.kind, formatId: f.id })),
}));
vi.mock("react-native", () => ({
  NativeModules: { HarmoniaMedia: native },
  Platform: { OS: "android" },
}));
vi.mock("../utils/youtube", () => youtube);
import { discoverMedia, choicesFor, policy } from "../utils/mediaDiscovery";
import { classifyLink } from "../utils/linkProviders";
import { validateDiscovery } from "../utils/providerBridge";
beforeEach(() => vi.clearAllMocks());
describe("discovered capabilities", () => {
  it.each([
    "https://facebook.com/reel/123",
    "https://tiktok.com/@x/video/123",
    "https://x.com/user/status/123",
  ])("does not invent streams for %s", async (url) => {
    const link = classifyLink(url);
    expect(policy(link).adapter).toBe("unavailable");
    await expect(discoverMedia(link)).rejects.toThrow();
    expect(native.discover).not.toHaveBeenCalled();
    for (const action of [
      "play-video",
      "play-audio",
      "download-video",
      "download-audio",
    ] as const)
      expect(choicesFor(null, action)).toEqual([]);
  });
  it("discovers actual Instagram video files without inventing isolated audio", async () => {
    native.discover.mockResolvedValue(JSON.stringify({title:"Public Reel",formats:[{
      id:"instagram-progressive",label:"MP4",kind:"video",uri:"https://cdn.example.com/reel.mp4",
      extension:"mp4",downloadable:true,
    }]}));
    const link=classifyLink("https://www.instagram.com/reel/DerYMOFsvXQ/?igsh=tracking");
    expect(policy(link).adapter).toBe("public-embed");
    const result=await discoverMedia(link);
    expect(native.discover).toHaveBeenCalledWith(link.url);
    expect(choicesFor(result,"play-video")).toHaveLength(1);
    expect(choicesFor(result,"download-video")).toHaveLength(1);
    expect(choicesFor(result,"play-audio")).toEqual([]);
    expect(choicesFor(result,"download-audio")).toEqual([]);
    expect(result.choices[0].track.uri).toBeUndefined();
    expect(result.choices[0].track.provider).toBe("Instagram");
  });
  it("reports an unavailable Instagram embed without assuming a private account", async () => {
    native.discover.mockRejectedValue(new Error("Instagram did not expose a public video in this embed."));
    await expect(discoverMedia(classifyLink("https://instagram.com/reel/DerYMOFsvXQ/")))
      .rejects.toThrow("did not expose a public video");
  });
  it("enables only returned Vimeo formats, never adaptive download or fake audio", async () => {
    native.discover.mockResolvedValue(
      JSON.stringify({
        title: "Public Vimeo",
        formats: [
          {
            id: "hls-auto",
            label: "Adaptive",
            kind: "video",
            uri: "https://cdn.example.com/master.m3u8",
            extension: "m3u8",
            downloadable: false,
          },
        ],
      }),
    );
    const result = await discoverMedia(classifyLink("https://vimeo.com/123"));
    expect(choicesFor(result, "play-video")).toHaveLength(1);
    expect(choicesFor(result, "download-video")).toEqual([]);
    expect(choicesFor(result, "play-audio")).toEqual([]);
    expect(result.choices[0].track.uri).toBeUndefined(); // signed URLs never enter library tracks
    expect(result.choices[0].track.sourcePage).toBe("https://vimeo.com/123");
  });
  it("distinguishes real audio formats and enables their downloads only when returned", async () => {
    native.discover.mockResolvedValue(
      JSON.stringify({
        title: "Original audio",
        formats: [
          {
            id: "original",
            label: "Audio",
            kind: "audio",
            uri: "https://cdn.example.com/song.mp3",
            extension: "mp3",
            downloadable: true,
          },
        ],
      }),
    );
    const result = await discoverMedia(
      classifyLink("https://example.com/song.mp3"),
    );
    expect(choicesFor(result, "download-audio")).toHaveLength(1);
    expect(choicesFor(result, "play-video")).toEqual([]);
  });
  it("retains source access-denied errors without calling them unsupported services", async () => {
    native.discover.mockRejectedValue(
      new Error("This source denied public access (HTTP 403)."),
    );
    await expect(
      discoverMedia(classifyLink("https://reddit.com/comments/abc")),
    ).rejects.toThrow("HTTP 403");
  });
  it("preserves NewPipe discovery and actual downloadable format flags", async () => {
    youtube.youtubeTrack.mockResolvedValue({
      id: "youtube:abcdefghijk",
      youtubeId: "abcdefghijk",
      title: "Existing",
      kind: "video",
    });
    youtube.youtubeFormats.mockResolvedValue([
      { id: "mp4", label: "720p", kind: "video", downloadable: true },
      { id: "hls", label: "Live", kind: "video", downloadable: false },
    ]);
    const result = await discoverMedia(
      classifyLink("https://youtu.be/abcdefghijk"),
    );
    expect(choicesFor(result, "play-video")).toHaveLength(2);
    expect(choicesFor(result, "download-video")).toHaveLength(1);
    expect(native.discover).not.toHaveBeenCalled();
  });
  it("rejects unsafe and fabricated native responses", () => {
    for (const uri of [
      "file:///etc/passwd",
      "https://127.0.0.1/a.mp4",
      "https://u:p@example.com/a.mp4",
    ]) {
      expect(() =>
        validateDiscovery(
          {
            title: "Bad",
            formats: [
              {
                id: "x",
                label: "Bad",
                kind: "video",
                uri,
                extension: "mp4",
                downloadable: true,
              },
            ],
          },
          "https://vimeo.com/123",
        ),
      ).toThrow();
    }
    expect(() =>
      validateDiscovery(
        {
          title: "Bad",
          formats: [
            {
              id: "x",
              label: "Bad",
              kind: "video",
              uri: "https://example.com/a.m3u8",
              extension: "m3u8",
              downloadable: true,
            },
          ],
        },
        "https://vimeo.com/123",
      ),
    ).toThrow();
  });
  it("does not deliver discovery results after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      discoverMedia(classifyLink("https://vimeo.com/123"), controller.signal),
    ).rejects.toThrow("cancelled");
  });
});
