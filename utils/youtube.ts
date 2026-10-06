import { NativeModules, Platform } from "react-native";
import type { Track } from "@/types/media";

export interface StreamFormat {
  id: string;
  label: string;
  kind: "audio" | "video";
  downloadable: boolean;
}
export interface MediaSource {
  uri: string;
  headers?: Record<string, string>;
  extension?: string;
  audioUri?: string;
  kind?: "audio" | "video";
  label?: string;
}
export interface SearchPage {
  tracks: Track[];
  nextPage?: string;
}
interface Extractor {
  search(query: string, page: string | null): Promise<SearchPage>;
  details(id: string): Promise<Track>;
  formats(id: string): Promise<StreamFormat[]>;
  resolve(
    id: string,
    format: string | null,
    kind: string,
    download: boolean,
  ): Promise<MediaSource>;
  mux(video: string, audio: string, output: string): Promise<string>;
}
function extractor(): Extractor {
  if (Platform.OS !== "android")
    throw new Error(
      "YouTube search and streams are available in the Android APK. Direct media and local files remain supported.",
    );
  const module = NativeModules.HarmoniaYouTube as Extractor | undefined;
  if (!module)
    throw new Error(
      "Install the updated Harmonia Android APK to enable on-device YouTube. Expo Go does not contain the extractor.",
    );
  return module;
}
async function abortable<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw new Error("Request cancelled.");
  // Abort ends the JS wait immediately. Native requests have their own bounded
  // HTTP timeouts; they never update UI after this request has been cancelled.
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error("Request cancelled."));
    signal?.addEventListener("abort", abort, { once: true });
    Promise.resolve()
      .then(operation)
      .then(resolve, reject)
      .finally(() => signal?.removeEventListener("abort", abort));
  });
}
export async function searchYouTube(
  query: string,
  page?: string,
  signal?: AbortSignal,
): Promise<SearchPage> {
  return abortable(() => extractor().search(query, page || null), signal);
}
export async function searchYouTubeMusic(
  query: string,
  signal?: AbortSignal,
): Promise<Track[]> {
  return (await searchYouTube(query, undefined, signal)).tracks;
}
export async function youtubeFormats(
  track: Track,
  signal?: AbortSignal,
): Promise<StreamFormat[]> {
  if (!track.youtubeId) return [];
  return abortable(() => extractor().formats(track.youtubeId!), signal);
}
export async function resolveSource(
  track: Track,
  signal?: AbortSignal,
  download = false,
): Promise<MediaSource> {
  if (track.localUri) return { uri: track.localUri };
  if (track.uri && !track.youtubeId) return { uri: track.uri };
  if (!track.youtubeId)
    throw new Error("This track has no playable media source.");
  const source = await abortable(
    () =>
      extractor().resolve(
        track.youtubeId!,
        track.formatId || null,
        track.kind,
        download,
      ),
    signal,
  );
  const url = new URL(source.uri);
  // Only native playback may return a generated local DASH manifest.
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "file:" && !download && url.pathname.endsWith(".mpd"))
  )
    throw new Error("Extractor returned an unsupported media source.");
  if (source.audioUri && new URL(source.audioUri).protocol !== "https:")
    throw new Error("Extractor returned an unsupported audio source.");
  if (source.kind && source.kind !== track.kind)
    throw new Error("Requested media format is unavailable.");
  return source;
}
export async function resolveTrack(
  track: Track,
  signal?: AbortSignal,
): Promise<string> {
  return (await resolveSource(track, signal)).uri;
}
export async function muxDownload(
  video: string,
  audio: string,
  output: string,
): Promise<string> {
  return extractor().mux(video, audio, output);
}
export function youtubeId(input: string): string | undefined {
  const url = new URL(input.trim());
  if (url.protocol !== "https:" || url.username || url.password) return;
  let id: string | null | undefined;
  if (url.hostname === "youtu.be") id = url.pathname.split("/")[1];
  else if (/^(www\.|m\.|music\.)?youtube\.com$/.test(url.hostname)) {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : /^\/(shorts|live|embed)\//.test(url.pathname)
          ? url.pathname.split("/")[2]
          : null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : undefined;
}
export async function youtubeTrack(
  input: string,
  signal?: AbortSignal,
): Promise<Track | undefined> {
  const id = youtubeId(input);
  if (!id) return;
  return abortable(() => extractor().details(id), signal);
}
export function formatTrack(track: Track, format: StreamFormat): Track {
  return {
    ...track,
    // Different formats coexist in Downloads and local playlists.
    id: `youtube:${track.youtubeId}:${format.id}`,
    kind: format.kind,
    formatId: format.id,
    formatLabel: format.label,
    localUri: undefined,
    uri: undefined,
  };
}

export async function videoDetails(
  track: Track,
  signal?: AbortSignal,
): Promise<Track> {
  return track.youtubeId && !track.localUri
    ? abortable(() => extractor().details(track.youtubeId!), signal)
    : track;
}
