import { afterEach, describe, expect, it, vi } from "vitest";
import { textDirection, searchTerm } from "../utils/textDirection";
import { SearchController } from "../utils/searchController";
import type { Track } from "../types/media";
const track = (id: string): Track => ({
  id,
  title: id,
  artist: "Artist",
  kind: "video",
});
afterEach(() => vi.useRealTimers());
describe("bilingual direction and meaningful query preservation", () => {
  it.each([
    ["مرحبا بالعالم", "rtl"],
    ["Hello world", "ltr"],
    ["123 ... العربية English", "rtl"],
    ["2026 English العربية", "ltr"],
    ["https://example.com/عربي.mp4", "ltr"],
    ["فيديو clip-123.mp4", "rtl"],
    ["\u200fEnglish", "ltr"],
  ])("detects first strong text in %s", (text, direction) =>
    expect(textDirection(text)).toBe(direction),
  );
  it("uses locale for empty or numeric input, without mutating text", () => {
    expect(textDirection("١٢٣ !", "rtl")).toBe("rtl");
    expect(textDirection("", "ltr")).toBe("ltr");
    expect(searchTerm("  cafe\u0301  a  ")).toBe("café  a");
    expect(searchTerm("عَلَم https://example.com/a?b=1")).toBe(
      "عَلَم https://example.com/a?b=1",
    );
  });
});
describe("search lifecycle", () => {
  it("debounces typing and deduplicates submit plus button presses", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue({ tracks: [track("1")] });
    const search = new SearchController(fetch);
    search.setQuery("a");
    search.setQuery("abc");
    await vi.advanceTimersByTimeAsync(399);
    expect(fetch).not.toHaveBeenCalled();
    search.submit();
    search.submit();
    await vi.advanceTimersByTimeAsync(500);
    search.submit();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(search.getSnapshot()).toMatchObject({
      activeQuery: "abc",
      status: "ready",
    });
  });
  it("clears draft, results, pagination, errors and pending requests immediately", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValue({ tracks: [track("1")], nextPage: "page2" });
    const search = new SearchController(fetch);
    search.setQuery("مرحبا");
    search.submit();
    await vi.advanceTimersByTimeAsync(0);
    search.setQuery("");
    expect(search.getSnapshot()).toMatchObject({
      query: "",
      results: [],
      activeQuery: "",
      nextPage: undefined,
      error: "",
      status: "idle",
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("ignores a late native result even before the next debounce fires", async () => {
    vi.useFakeTimers();
    let finish!: (page: { tracks: Track[] }) => void;
    const fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const search = new SearchController(fetch);
    search.setQuery("old");
    search.submit();
    const signal = fetch.mock.calls[0][2] as AbortSignal;
    search.setQuery("new");
    expect(signal.aborted).toBe(true);
    finish({ tracks: [track("stale")] });
    await vi.advanceTimersByTimeAsync(0);
    expect(search.getSnapshot()).toMatchObject({
      query: "new",
      results: [],
      status: "debouncing",
    });
    search.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("exposes retry and no-results states, and deduplicates pagination", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ tracks: [], nextPage: undefined })
      .mockResolvedValueOnce({ tracks: [track("1")], nextPage: "2" })
      .mockResolvedValueOnce({ tracks: [track("1"), track("2")] });
    const search = new SearchController(fetch);
    search.setQuery("one");
    search.submit();
    await vi.advanceTimersByTimeAsync(0);
    expect(search.getSnapshot().status).toBe("error");
    search.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(search.getSnapshot()).toMatchObject({
      status: "ready",
      results: [],
      error: "",
    });
    search.setQuery("two");
    search.submit();
    await vi.advanceTimersByTimeAsync(0);
    search.more();
    search.more();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(search.getSnapshot().results.map((t) => t.id)).toEqual(["1", "2"]);
  });
  it("keeps the draft editable while only normalizing the requested term", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue({ tracks: [] });
    const search = new SearchController(fetch);
    search.setQuery("  cafe\u0301  ");
    search.submit();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch.mock.calls[0][0]).toBe("café");
    expect(search.getSnapshot().query).toBe("  cafe\u0301  ");
    search.setQuery("café");
    await vi.advanceTimersByTimeAsync(500);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
