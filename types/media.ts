export interface Track {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  duration?: number;
  views?: number;
  uploaded?: string;
  channelAvatar?: string;
  subscribers?: number;
  likes?: number;
  description?: string;
  related?: Track[];
  uri?: string;
  youtubeId?: string;
  kind: "audio" | "video";
  localUri?: string;
  formatId?: string;
  formatLabel?: string;
}
export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}
export interface Download {
  track: Track;
  status: "downloading" | "complete" | "failed";
  progress: number;
  error?: string;
}

export function directTrack(input: string, title?: string): Track {
  const url = new URL(input.trim());
  if (url.protocol !== "https:")
    throw new Error("Enter a direct HTTPS audio or video URL.");
  if (url.username || url.password)
    throw new Error("URLs containing credentials are not supported.");
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname))
    throw new Error(
      "Use YouTube search for YouTube links; a page URL is not a media stream.",
    );
  return {
    id: `url:${url.href}`,
    title:
      title?.trim() ||
      decodeURIComponent(url.pathname.split("/").pop() || "Direct stream"),
    artist: url.hostname,
    uri: url.href,
    kind: /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(url.pathname)
      ? "audio"
      : "video",
  };
}
export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
