import { NativeModules, Platform } from "react-native";
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
export async function discoverRemote(
  page: string,
  signal?: AbortSignal,
): Promise<DiscoveredMedia> {
  publicWebUrl(page);
  if (Platform.OS !== "android" || !NativeModules.HarmoniaMedia)
    throw new Error("Media discovery requires the standalone Android app.");
  if (signal?.aborted) throw new Error("Request cancelled.");
  const raw: unknown = JSON.parse(
    await NativeModules.HarmoniaMedia.discover(page),
  );
  if (signal?.aborted) throw new Error("Request cancelled.");
  return validateDiscovery(raw, page);
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
