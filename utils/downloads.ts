import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import { usePlayerStore } from "@/store/playerStore";
import { resolveSource, muxDownload } from "./youtube";
import { message, type Track } from "@/types/media";
const active = new Set<string>();
export async function downloadTrack(track: Track): Promise<void> {
  if (Platform.OS === "web")
    throw new Error("Offline downloads are available in the Android app.");
  if (active.has(track.id)) return;
  if (!FileSystem.documentDirectory)
    throw new Error("App storage is unavailable.");
  active.add(track.id);
  const store = usePlayerStore.getState();
  // Reserve before resolving so rapid taps cannot start duplicate jobs.
  const dir = `${FileSystem.documentDirectory}downloads/`;
  let path = "";
  const partials: string[] = [];
  try {
    const existing = store.downloads.find(
      (d) => d.track.id === track.id && d.status === "complete",
    );
    if (
      existing?.track.localUri &&
      (await FileSystem.getInfoAsync(existing.track.localUri)).exists
    )
      return;
    store.setDownload({ track, status: "downloading", progress: 0 });
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const source = await resolveSource(track, undefined, true);
    const uri = source.uri;
    const extension =
      source.extension?.match(/^[a-z0-9]+$/i)?.[0] ||
      new URL(uri).pathname.match(
        /\.(mp3|m4a|mp4|webm|wav|ogg|flac|aac)$/i,
      )?.[1] ||
      (track.kind === "audio" ? "m4a" : "mp4");
    if (/\.m3u8(?:\?|$)|\.mpd(?:\?|$)/i.test(uri))
      throw new Error(
        "Offline download requires a single media file; adaptive streams are playback-only.",
      );
    const base = `${dir}${Date.now()}-${Math.random().toString(36).slice(2)}`;
    path = `${base}.${extension}.part`;
    partials.push(path);
    async function transfer(
      url: string,
      target: string,
      offset: number,
      weight: number,
    ) {
      let lastUpdate = 0;
      const job = FileSystem.createDownloadResumable(
        url,
        target,
        { headers: source.headers },
        (p) => {
          if (Date.now() - lastUpdate < 300) return;
          lastUpdate = Date.now();
          usePlayerStore
            .getState()
            .setDownload({
              track,
              status: "downloading",
              progress:
                offset +
                weight *
                  (p.totalBytesExpectedToWrite > 0
                    ? p.totalBytesWritten / p.totalBytesExpectedToWrite
                    : 0),
            });
        },
      );
      const result = await job.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300)
        throw new Error("The server did not return a media file.");
      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || !info.size)
        throw new Error("Downloaded file is empty.");
      const type =
        Object.entries(result.headers).find(
          ([key]) => key.toLowerCase() === "content-type",
        )?.[1] || "";
      if (/mpegurl|dash\+xml/i.test(type))
        throw new Error(
          "Offline download requires a single media file; adaptive streams are playback-only.",
        );
      if (/text\/|application\/(json|xml)/i.test(type))
        throw new Error("The URL returned a page instead of media.");
      return result.uri;
    }
    let downloaded: string;
    if (source.audioUri) {
      const videoPath = `${base}.video.part`,
        audioPath = `${base}.audio.part`;
      partials.push(videoPath, audioPath);
      const video = await transfer(uri, videoPath, 0, 0.7);
      const audio = await transfer(source.audioUri, audioPath, 0.7, 0.25);
      downloaded = await muxDownload(video, audio, path);
      const muxed = await FileSystem.getInfoAsync(downloaded);
      if (!muxed.exists || !muxed.size)
        throw new Error("Could not create the combined video file.");
      await Promise.all(
        [video, audio].map((uri) =>
          FileSystem.deleteAsync(uri, { idempotent: true }),
        ),
      );
    } else downloaded = await transfer(uri, path, 0, 1);
    const localUri = path.replace(/\.part$/, "");
    await FileSystem.moveAsync({ from: downloaded, to: localUri });
    store.setDownload({
      track: { ...track, localUri },
      status: "complete",
      progress: 1,
    });
  } catch (error) {
    await Promise.all(
      partials.map((uri) =>
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}),
      ),
    );
    store.setDownload({
      track,
      status: "failed",
      progress: 0,
      error: message(error),
    });
    throw error;
  } finally {
    active.delete(track.id);
  }
}
export async function deleteDownload(track: Track): Promise<void> {
  if (track.localUri)
    await FileSystem.deleteAsync(track.localUri, { idempotent: true });
  usePlayerStore.getState().removeDownload(track.id);
}
export async function importMedia(): Promise<void> {
  if (Platform.OS === "web")
    throw new Error("Import local media using the Android app.");
  const result = await DocumentPicker.getDocumentAsync({
    type: ["audio/*", "video/*"],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return;
  if (!FileSystem.documentDirectory)
    throw new Error("App storage unavailable.");
  const dir = `${FileSystem.documentDirectory}imports/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  for (const asset of result.assets) {
    const id = `local:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${dir}${id.replace(":", "-")}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await FileSystem.copyAsync({ from: asset.uri, to: path });
    usePlayerStore.getState().addTrack({
      id,
      title: asset.name,
      artist: "Local media",
      localUri: path,
      kind: asset.mimeType?.startsWith("audio/") ? "audio" : "video",
    });
    if (
      FileSystem.cacheDirectory &&
      asset.uri.startsWith(FileSystem.cacheDirectory)
    ) {
      await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(
        () => {},
      );
    }
  }
}

export async function cleanInterruptedDownloads(): Promise<void> {
  if (Platform.OS === "web" || !FileSystem.documentDirectory || active.size)
    return;
  const dir = `${FileSystem.documentDirectory}downloads/`;
  if (!(await FileSystem.getInfoAsync(dir)).exists) return;
  const files = await FileSystem.readDirectoryAsync(dir);
  await Promise.all(
    files
      .filter((name) => name.endsWith(".part"))
      .map((name) =>
        FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }),
      ),
  );
}
