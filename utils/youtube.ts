import type { Track } from "@/types/media";
import { usePlayerStore } from "@/store/playerStore";

export async function searchYouTubeMusic(
  query: string,
  signal?: AbortSignal,
): Promise<Track[]> {
  const { youtubeApiKey } = usePlayerStore.getState().settings;
  if (!youtubeApiKey)
    throw new Error(
      "Add your YouTube Data API key in Settings, or open a direct media URL.",
    );
  const params = new URLSearchParams({
    part: "snippet",
    maxResults: "20",
    q: query,
    type: "video",
    key: youtubeApiKey,
  });
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { signal },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || "YouTube search failed.");
  return (data.items || [])
    .filter((item: { id: { videoId?: string } }) => item.id.videoId)
    .map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: { high?: { url: string } };
        };
      }) => ({
        id: `youtube:${item.id.videoId}`,
        youtubeId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        cover: item.snippet.thumbnails.high?.url,
        kind: "video",
      }),
    );
}
export async function resolveTrack(
  track: Track,
  signal?: AbortSignal,
): Promise<string> {
  if (track.localUri) return track.localUri;
  if (track.uri) return track.uri;
  if (!track.youtubeId)
    throw new Error("This track has no playable media source.");
  const { resolverUrl } = usePlayerStore.getState().settings;
  if (!resolverUrl)
    throw new Error(
      "YouTube requires a resolver server. Configure its HTTPS URL in Settings.",
    );
  const response = await fetch(
    `${resolverUrl.replace(/\/$/, "")}/resolve/${encodeURIComponent(track.youtubeId)}`,
    { signal },
  );
  const data = await response.json();
  if (!response.ok || typeof data.url !== "string")
    throw new Error(data.error || "Could not resolve media.");
  const url = new URL(data.url);
  if (url.protocol !== "https:")
    throw new Error("Resolver must return an HTTPS media stream.");
  return url.href;
}
