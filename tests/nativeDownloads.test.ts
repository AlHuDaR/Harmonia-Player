import { beforeEach, describe, expect, it, vi } from "vitest";
const bridge = vi.hoisted(() => ({
  enqueueDownload: vi.fn(),
  downloads: vi.fn(),
  cancel: vi.fn(),
  forgetDownload: vi.fn(),
}));
vi.mock("react-native", () => ({
  NativeModules: { HarmoniaMedia: bridge },
  Platform: { OS: "android" },
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: vi.fn() }));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///app/",
  makeDirectoryAsync: async () => {},
  getInfoAsync: async () => ({ exists: false }),
  deleteAsync: async () => {},
}));
vi.mock("../utils/youtube", () => ({
  resolveSource: async () => ({
    uri: "https://cdn.example.com/a.mp4",
    extension: "mp4",
  }),
  muxDownload: vi.fn(),
}));
import {
  downloadTrack,
  syncNativeDownloads,
  cancelDownload,
  deleteDownload,
} from "../utils/downloads";
import { usePlayerStore } from "../store/playerStore";
const track = {
  id: "native:1",
  title: "Actual file",
  artist: "Fixture",
  kind: "video" as const,
  uri: "https://cdn.example.com/a.mp4",
};
beforeEach(() => {
  vi.clearAllMocks();
  usePlayerStore.setState({ downloads: [], tracks: [] });
});
describe("durable native job/library reconciliation", () => {
  it("records queued work without falsely reporting a completed download", async () => {
    bridge.enqueueDownload.mockResolvedValue(
      JSON.stringify({ track, nativeId: "job", status: "queued", progress: 0 }),
    );
    await downloadTrack(track);
    expect(bridge.enqueueDownload).toHaveBeenCalledOnce();
    expect(usePlayerStore.getState().downloads[0]).toMatchObject({
      nativeId: "job",
      status: "queued",
    });
    expect(
      usePlayerStore.getState().downloads[0].track.localUri,
    ).toBeUndefined();
  });
  it("restores progress, retry and completed native records after JS restart", async () => {
    for (const status of ["downloading", "retrying", "complete"]) {
      bridge.downloads.mockResolvedValue(
        JSON.stringify([
          {
            track:
              status === "complete"
                ? { ...track, localUri: "file:///jobs/final.mp4" }
                : track,
            nativeId: "job",
            status,
            progress: status === "complete" ? 1 : 0.5,
          },
        ]),
      );
      await syncNativeDownloads();
      expect(usePlayerStore.getState().downloads[0].status).toBe(status);
    }
    expect(usePlayerStore.getState().downloads[0].track.localUri).toBe(
      "file:///jobs/final.mp4",
    );
  });
  it("cancels and retains a retryable cancelled record, then removes the native job on delete", async () => {
    usePlayerStore.getState().setDownload({
      track,
      nativeId: "job",
      status: "downloading",
      progress: 0.5,
    });
    bridge.downloads.mockResolvedValue(
      JSON.stringify([
        { track, nativeId: "job", status: "cancelled", progress: 0 },
      ]),
    );
    await cancelDownload(track.id);
    expect(bridge.cancel).toHaveBeenCalledWith("job");
    expect(usePlayerStore.getState().downloads[0].status).toBe("cancelled");
    await deleteDownload(track);
    expect(bridge.forgetDownload).toHaveBeenCalledWith("job");
    expect(usePlayerStore.getState().downloads).toEqual([]);
  });
});

it("does not rewrite unchanged completed records on each poll", async () => {
  const record = {
    track: { ...track, localUri: "file:///jobs/final.mp4" },
    nativeId: "job",
    status: "complete",
    progress: 1,
  };
  bridge.downloads.mockResolvedValue(JSON.stringify([record]));
  const changed = vi.fn();
  const unsubscribe = usePlayerStore.subscribe(changed);
  await syncNativeDownloads();
  await syncNativeDownloads();
  unsubscribe();
  expect(changed).toHaveBeenCalledTimes(1);
});
it("does not restore a stale job generation over a newly queued retry", async () => {
  usePlayerStore
    .getState()
    .setDownload({
      track,
      nativeId: "new",
      createdAt: 200,
      status: "queued",
      progress: 0,
    });
  bridge.downloads.mockResolvedValue(
    JSON.stringify([
      { track, nativeId: "old", createdAt: 100, status: "failed", progress: 0 },
    ]),
  );
  await syncNativeDownloads();
  expect(usePlayerStore.getState().downloads[0].nativeId).toBe("new");
});
