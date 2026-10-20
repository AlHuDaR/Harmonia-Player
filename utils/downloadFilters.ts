import type { Download } from "@/types/media";

export type DownloadFilter = "all" | "active" | "offline" | "attention";
export function filterDownloads(downloads: Download[], query: string, filter: DownloadFilter): Download[] {
  const search = query.trim().toLocaleLowerCase();
  return downloads.filter((d) => {
    const matchesStatus = filter === "all" ||
      (filter === "active" && ["queued", "downloading", "retrying"].includes(d.status)) ||
      (filter === "offline" && d.status === "complete" && !!d.track.localUri) ||
      (filter === "attention" && ["failed", "cancelled"].includes(d.status));
    const text = [d.track.title, d.track.artist, d.track.provider || ""].join(" ").toLocaleLowerCase();
    return matchesStatus && (!search || text.includes(search));
  });
}
