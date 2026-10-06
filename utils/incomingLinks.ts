import { youtubeId } from "./youtube";
export function incomingVideo(text: string): string | undefined {
  if (typeof text !== "string" || text.length > 4096) return;
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const candidate of matches) {
    try {
      const normalized = candidate
        .replace(/[).,،!?\]]+$/g, "")
        .replace(/^http:/i, "https:");
      const id = youtubeId(normalized);
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    } catch {}
  }
}
