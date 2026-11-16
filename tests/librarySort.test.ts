import { describe, expect, it } from "vitest";
import type { Track } from "../types/media";
import { sortLibraryTracks } from "../utils/librarySort";

function track(id: string, title: string, artist = ""): Track {
  return { id, title, artist, kind: "audio" };
}

describe("library sort", () => {
  it("preserves the stored order by default and never mutates it", () => {
    const input = [track("a", "Finale"), track("b", "debut")];
    expect(sortLibraryTracks(input, "default", "en")).toBe(input);
    expect(sortLibraryTracks(input, "title", "en").map(({ id }) => id)).toEqual(["b", "a"]);
    expect(input.map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("sorts by artist then title and keeps equivalent entries stable", () => {
    const input = [
      track("a", "Album", "Zed"),
      track("b", "Finale", "Amal"),
      track("c", "Debut", "amal"),
      track("d", "Début", "Amal"),
    ];
    expect(sortLibraryTracks(input, "artist", "en").map(({ id }) => id)).toEqual([
      "c", "d", "b", "a",
    ]);
  });

  it("sorts Arabic titles in the Arabic interface", () => {
    const input = [
      track("a", "بداية"),
      track("b", "ألبوم قديم"),
      track("c", "ألبوم جديد"),
    ];
    expect(sortLibraryTracks(input, "title", "ar").map(({ id }) => id)).toEqual(["c", "b", "a"]);
  });
});
