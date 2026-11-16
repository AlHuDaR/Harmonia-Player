import { NativeModules, Platform } from "react-native";
import { discoveryError, MediaDiscoveryError } from "./mediaErrors";
import { publicWebUrl } from "./linkProviders";
export interface DiscoveredFormat {
  id: string;
  label: string;
  kind: "audio" | "video";
  uri: string;
  extension: string;
  downloadable: boolean;
}
export interface DiscoveredMedia {
  title: string;
  page: string;
  formats: DiscoveredFormat[];
}
// Validated results live only in this bounded, short-lived handoff cache.
// Consume on playback so an explicit retry always re-discovers a failed URL.
const handoff = new Map<string, { until: number; media: DiscoveredMedia }>();
export function takeDiscoveredMedia(page: string): DiscoveredMedia | undefined {
  publicWebUrl(page);
  const entry = handoff.get(page);
  handoff.delete(page);
  if (entry && entry.until > Date.now()) return entry.media;
}
function remember(media: DiscoveredMedia) {
  let until = Date.now() + 15000;
  for (const format of media.formats) {
    const url = new URL(format.uri);
    for (const key of ["expire", "expires", "exp"]) {
      const value = url.searchParams.get(key);
      if (value && /^\d+$/.test(value)) until = Math.min(until, Number(value) * 1000 - 5000);
    }
  }
  for (const [key, entry] of handoff) if (entry.until <= Date.now()) handoff.delete(key);
  handoff.delete(media.page);
  if (handoff.size >= 8) handoff.delete(handoff.keys().next().value!);
  if (until > Date.now()) handoff.set(media.page, { until, media });
}
export async function discoverRemote(
  page: string,
  signal?: AbortSignal,
): Promise<DiscoveredMedia> {
  publicWebUrl(page);
  if (Platform.OS !== "android" || !NativeModules.HarmoniaMedia)
    throw new Error("Media discovery requires the standalone Android app.");
  if (signal?.aborted) throw new MediaDiscoveryError("cancelled", "Request cancelled.");
  let raw: unknown;
  try {
    const response = await new Promise<string>((resolve, reject) => {
      const abort = () => reject(new MediaDiscoveryError("cancelled", "Request cancelled."));
      signal?.addEventListener("abort", abort, { once: true });
      Promise.resolve().then(() => {
        if (signal?.aborted) throw new MediaDiscoveryError("cancelled", "Request cancelled.");
        return NativeModules.HarmoniaMedia.discover(page);
      }).then(resolve, reject).finally(() => signal?.removeEventListener("abort", abort));
    });
    raw = JSON.parse(response);
  }
  catch (error) { throw discoveryError(error); }
  if (signal?.aborted) throw new MediaDiscoveryError("cancelled", "Request cancelled.");
  const media = validateDiscovery(raw, page);
  remember(media);
  return media;
}
export function validateDiscovery(raw: unknown, page: string): DiscoveredMedia {
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid media discovery response.");
  const value = raw as Partial<DiscoveredMedia>;
  if (
    typeof value.title !== "string" ||
    !Array.isArray(value.formats) ||
    value.formats.length > 32
  )
    throw new Error("Invalid media discovery response.");
  const formats = value.formats.filter((f) => {
    try {
      return (
        typeof f.id === "string" &&
        f.id.length < 200 &&
        typeof f.label === "string" &&
        ["audio", "video"].includes(f.kind) &&
        typeof f.downloadable === "boolean" &&
        typeof f.extension === "string" &&
        publicWebUrl(f.uri).protocol === "https:" &&
        !(f.downloadable && /^(m3u8|mpd)$/i.test(f.extension))
      );
    } catch {
      return false;
    }
  });
  if (!formats.length)
    throw new Error("No accessible compatible media formats were discovered.");
  return { title: value.title.slice(0, 1000), page, formats };
}
