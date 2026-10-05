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
const fs = vi.hoisted(() => ({
  documentDirectory: "file:///app/",
  makeDirectoryAsync: vi.fn(async () => {}),
  getInfoAsync: vi.fn(async () => ({ exists: true, size: 100 })),
  deleteAsync: vi.fn(async () => {}),
  moveAsync: vi.fn(async () => {}),
  createDownloadResumable: vi.fn(),
}));
vi.mock("expo-file-system", () => fs);
vi.mock("../utils/youtube", () => ({
  resolveTrack: async (t: { uri: string }) => t.uri,
}));
import { downloadTrack } from "../utils/downloads";
import { usePlayerStore } from "../store/playerStore";
import { directTrack } from "../types/media";
beforeEach(() => {
  usePlayerStore.setState({ tracks: [], downloads: [] });
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
});
