import type { Track } from "@/types/media";
import { classifyLink, type SharedLink } from "./linkProviders";
import { discoverRemote, type DiscoveredFormat } from "./providerBridge";
import {
  youtubeTrack,
  youtubeFormats,
  formatTrack,
  type StreamFormat,
} from "./youtube";
export type MediaAction =
  "play-video" | "play-audio" | "download-video" | "download-audio";
export interface MediaChoice {
  id: string;
  label: string;
  kind: "audio" | "video";
  downloadable: boolean;
  track: Track;
}
export interface Discovery {
  title: string;
  choices: MediaChoice[];
}
export const providerPolicy: Record<
  string,
  {
    adapter: "newpipe" | "public-json" | "public-embed" | "direct" | "unavailable";
    reason?: string;
  }
> = {
  YouTube: { adapter: "newpipe" },
  Vimeo: { adapter: "public-json" },
  Reddit: { adapter: "public-json" },
  Instagram: {
    adapter: "public-embed",
  },
  Facebook: {
    adapter: "unavailable",
    reason:
      "Facebook media discovery requires an authorized platform interface. Login-required, private and restricted videos are not accessed.",
  },
  TikTok: {
    adapter: "unavailable",
    reason:
      "TikTok's public embed interface does not expose a supported downloadable media stream here. Open the original source.",
  },
  "X / Twitter": {
    adapter: "unavailable",
    reason:
      "X media access requires an authorized API interface. Harmonia does not collect account credentials or bypass access restrictions.",
  },
};
export function policy(link: SharedLink) {
  return (
    providerPolicy[link.provider] || {
      adapter:
        link.kind === "direct" ? ("direct" as const) : ("unavailable" as const),
      reason: "No supported public media interface is available for this page.",
    }
  );
}
export function choicesFor(
  discovery: Discovery | null,
  action: MediaAction,
): MediaChoice[] {
  const kind = action.endsWith("audio") ? "audio" : "video";
  return (
    discovery?.choices.filter(
      (c) =>
        c.kind === kind && (!action.startsWith("download") || c.downloadable),
    ) || []
  );
}
export function externalChoice(
  page: string,
  provider: string,
  title: string,
  f: DiscoveredFormat,
): MediaChoice {
  return {
    ...f,
    track: {
      id: `${provider}:${page}:${f.id}`,
      title,
      artist: provider,
      kind: f.kind,
      sourcePage: page,
      provider,
      formatId: f.id,
      formatLabel: f.label,
    },
  };
}
export async function discoverMedia(
  input: SharedLink,
  signal?: AbortSignal,
): Promise<Discovery> {
  const link = classifyLink(input.url),
    p = policy(link);
  if (p.adapter === "unavailable") throw new Error(p.reason);
  if (p.adapter === "newpipe") {
    const track = await youtubeTrack(link.url, signal);
    if (!track) throw new Error("No playable media source is available.");
    const formats = await youtubeFormats(track, signal);
    return {
      title: track.title,
      choices: formats.map((f: StreamFormat) => ({
        ...f,
        track: formatTrack(track, f),
      })),
    };
  }
  const media = await discoverRemote(link.url, signal);
  return {
    title: media.title,
    choices: media.formats.map((f) =>
      externalChoice(link.url, link.provider, media.title, f),
    ),
  };
}
