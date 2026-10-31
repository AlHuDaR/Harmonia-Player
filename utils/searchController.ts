import type { Track } from "@/types/media";
import type { SearchPage } from "./youtube";
import { searchTerm } from "./textDirection";

export interface SearchState {
  query: string;
  activeQuery: string;
  results: Track[];
  nextPage?: string;
  status: "idle" | "debouncing" | "loading" | "ready" | "error";
  loadingMore: boolean;
  error: string;
}
type FetchPage = (
  query: string,
  page?: string,
  signal?: AbortSignal,
) => Promise<SearchPage>;

/** One owner for debounce, submit, pagination and cancellation, including native promises. */
export class SearchController {
  private state: SearchState = {
    query: "",
    activeQuery: "",
    results: [],
    status: "idle",
    loadingMore: false,
    error: "",
  };
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private request?: AbortController;
  private generation = 0;
  constructor(
    private fetchPage: FetchPage,
    private delay = 400,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<SearchState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private cancel() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.request?.abort();
    this.request = undefined;
    this.generation++;
  }
  dispose = () => {
    this.cancel();
  };
  setQuery = (query: string) => {
    if (query === this.state.query) return;
    const term = searchTerm(query);
    if (
      term &&
      term === searchTerm(this.state.query) &&
      this.state.status !== "error"
    ) {
      this.update({ query });
      return;
    }
    this.cancel();
    this.update({
      query,
      results: [],
      nextPage: undefined,
      activeQuery: "",
      error: "",
      loadingMore: false,
      status: term ? "debouncing" : "idle",
    });
    if (term)
      this.timer = setTimeout(() => {
        void this.run(false);
      }, this.delay);
  };
  submit = () => {
    clearTimeout(this.timer);
    if (
      this.state.status === "loading" ||
      this.state.loadingMore ||
      (this.state.status === "ready" &&
        this.state.activeQuery === searchTerm(this.state.query))
    )
      return;
    void this.run(false);
  };
  retry = () => {
    if (!this.request) void this.run(this.state.results.length > 0);
  };
  more = () => {
    if (this.state.status === "ready" && this.state.nextPage && !this.request)
      void this.run(true);
  };
  private async run(more: boolean) {
    const term = searchTerm(this.state.query);
    if (
      !term ||
      (more && (!this.state.nextPage || this.state.activeQuery !== term))
    )
      return;
    this.cancel();
    const generation = this.generation;
    const request = (this.request = new AbortController());
    this.update({
      status: more ? "ready" : "loading",
      loadingMore: more,
      error: "",
    });
    try {
      const page = await this.fetchPage(
        term,
        more ? this.state.nextPage : undefined,
        request.signal,
      );
      if (request.signal.aborted || generation !== this.generation) return;
      const unique = new Map(
        (more ? [...this.state.results, ...page.tracks] : page.tracks).map(
          (track) => [track.id, track],
        ),
      );
      this.update({
        results: [...unique.values()],
        nextPage: page.nextPage,
        activeQuery: term,
        status: "ready",
      });
    } catch (error) {
      if (!request.signal.aborted && generation === this.generation)
        this.update({
          error: error instanceof Error ? error.message : String(error),
          status: "error",
        });
    } finally {
      if (!request.signal.aborted && generation === this.generation) {
        this.request = undefined;
        this.update({ loadingMore: false });
      }
    }
  }
}
