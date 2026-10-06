import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: vi.fn() }));
const source = vi.hoisted(() => ({ resolveSource: vi.fn(), muxDownload: vi.fn() }));
const fs = vi.hoisted(() => ({
  documentDirectory: "file:///app/",
  makeDirectoryAsync: vi.fn(async () => {}),
  getInfoAsync: vi.fn(async () => ({ exists: true, size: 100 })),
  deleteAsync: vi.fn(async () => {}),
  moveAsync: vi.fn(async () => {}),
  createDownloadResumable: vi.fn(),
}));
vi.mock("expo-file-system", () => fs);
vi.mock("../utils/youtube", () => source);
import { downloadTrack } from "../utils/downloads";
import { usePlayerStore } from "../store/playerStore";
import { directTrack } from "../types/media";
beforeEach(() => {
  usePlayerStore.setState({ tracks: [], downloads: [] });
  source.resolveSource.mockImplementation(async (t: { uri: string }) => ({ uri: t.uri }));
  fs.createDownloadResumable.mockReturnValue({
    downloadAsync: async () => ({
      status: 200,
      uri: "file:///app/downloads/a.mp3",
      headers: { "Content-Type": "audio/mpeg" },
    }),
  });
});
describe("offline downloads", () => {
  it("saves a playable offline source only after a successful nonempty response", async () => {
    const t = directTrack("https://example.com/a.mp3");
    await downloadTrack(t);
    expect(usePlayerStore.getState().downloads[0]).toMatchObject({
      status: "complete",
      progress: 1,
      track: {
        localUri: expect.stringMatching(/^file:\/\/\/app\/downloads\/.*\.mp3$/),
      },
    });
  });
  it("rejects HTTP failures and cleans up partial files", async () => {
    fs.createDownloadResumable.mockReturnValue({
      downloadAsync: async () => ({ status: 403 }),
    });
    await expect(
      downloadTrack(directTrack("https://example.com/a.mp3")),
    ).rejects.toThrow();
    expect(usePlayerStore.getState().downloads[0].status).toBe("failed");
    expect(fs.deleteAsync).toHaveBeenCalled();
  });
  it("rejects HTML pages and adaptive playlists", async () => {
    fs.createDownloadResumable.mockReturnValue({
      downloadAsync: async () => ({
        status: 200,
        uri: "file:///page",
        headers: { "content-type": "text/html" },
      }),
    });
    await expect(
      downloadTrack(directTrack("https://example.com/page")),
    ).rejects.toThrow("page");
    await expect(
      downloadTrack(directTrack("https://example.com/live.m3u8")),
    ).rejects.toThrow("adaptive");
  });
  it("does not start duplicate concurrent downloads", async () => {
    let finish!: () => void;
    fs.createDownloadResumable.mockReturnValue({
      downloadAsync: () =>
        new Promise((resolve) => {
          finish = () =>
            resolve({ status: 200, uri: "file:///app/a.mp3", headers: {} });
        }),
    });
    const t = directTrack("https://example.com/a.mp3");
    const first = downloadTrack(t);
    const second = downloadTrack(t);
    await vi.waitFor(() =>
      expect(fs.createDownloadResumable).toHaveBeenCalledTimes(1),
    );
    finish();
    await Promise.all([first, second]);
  });
  it("rejects empty files without registering an offline track", async () => {
    fs.getInfoAsync.mockResolvedValueOnce({ exists: true, size: 0 });
    await expect(
      downloadTrack(directTrack("https://example.com/empty.mp3")),
    ).rejects.toThrow("empty");
    expect(
      usePlayerStore.getState().downloads[0].track.localUri,
    ).toBeUndefined();
    expect(fs.moveAsync).not.toHaveBeenCalled();
  });
  it("rejects adaptive manifests served from extensionless URLs", async () => {
    fs.createDownloadResumable.mockReturnValue({
      downloadAsync: async () => ({
        status: 200,
        uri: "file:///manifest",
        headers: { "Content-Type": "application/vnd.apple.mpegurl" },
      }),
    });
    await expect(
      downloadTrack(directTrack("https://example.com/stream")),
    ).rejects.toThrow("adaptive");
    expect(fs.moveAsync).not.toHaveBeenCalled();
  });
  it("downloads separate streams then muxes them before registering the offline video", async () => {
    source.resolveSource.mockResolvedValue({ uri: "https://media.test/video", audioUri: "https://media.test/audio", extension: "mp4", headers: { "User-Agent": "test" } });
    fs.createDownloadResumable.mockImplementation((uri: string, target: string) => ({ downloadAsync: async () => ({ status: 200, uri: target, headers: { "Content-Type": uri.endsWith("audio") ? "audio/mp4" : "video/mp4" } }) }));
    source.muxDownload.mockImplementation(async (_v: string, _a: string, output: string) => output);
    const t = { id: "youtube:abcdefghijk:video:137", youtubeId: "abcdefghijk", kind: "video" as const, title: "Test", artist: "Test", formatId: "video:137" };
    await downloadTrack(t);
    expect(fs.createDownloadResumable).toHaveBeenCalledTimes(2);
    expect(fs.createDownloadResumable.mock.calls[0][2]).toMatchObject({ headers: { "User-Agent": "test" } });
    expect(source.muxDownload).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState().downloads[0]).toMatchObject({ status: "complete", track: { localUri: expect.stringMatching(/\.mp4$/) } });
  });
  it("cleans both component files and does not mark failed muxing complete", async () => {
    source.resolveSource.mockResolvedValue({ uri: "https://media.test/video", audioUri: "https://media.test/audio", extension: "mp4" });
    fs.createDownloadResumable.mockImplementation((_uri: string, target: string) => ({ downloadAsync: async () => ({ status: 200, uri: target, headers: {} }) }));
    source.muxDownload.mockRejectedValue(new Error("Mux failed"));
    await expect(downloadTrack(directTrack("https://example.com/video.mp4"))).rejects.toThrow("Mux failed");
    expect(fs.deleteAsync).toHaveBeenCalledTimes(3);
    expect(usePlayerStore.getState().downloads[0].status).toBe("failed");
    expect(fs.moveAsync).not.toHaveBeenCalled();
  });

});
