import type { Track } from "@/types/media";

export type LibrarySort = "default" | "title" | "artist";

export function sortLibraryTracks(
  tracks: Track[],
  sort: LibrarySort,
  language: "en" | "ar",
): Track[] {
  if (sort === "default" || tracks.length < 2) return tracks;

  const { compare } = new Intl.Collator(language, { sensitivity: "base" });
  const sortByTitle = (a: Track, b: Track) => compare(a.title, b.title);
  return [...tracks].sort(
    sort === "title" ? sortByTitle : (a, b) => compare(a.artist, b.artist) || sortByTitle(a, b),
  );
}
