import type { Track } from "@/types/media";
import type { MediaSource } from "./youtube";
import { publicWebUrl } from "./linkProviders";

export const CAST_UNAVAILABLE =
  "Google Cast needs Google Play services on an Android phone. Install the standalone APK; Expo Go and web are unsupported.";
export const CAST_SOURCE_UNSUPPORTED =
  "This source cannot be sent to a Cast receiver. Use a public HTTPS MP4 or HLS URL without credentials or query parameters. Extracted, local and DASH sources play on this device.";
export interface CastMedia {
  uri: string;
  contentType: "video/mp4" | "application/x-mpegURL";
  title: string;
  artist: string;
}
export interface CastState {
  revision: number;
  available: boolean;
  connection:
    "disconnected" | "connecting" | "connected" | "disconnecting" | "suspended";
  deviceName: string;
  hasMedia: boolean;
  contentId: string;
  ownedContentId: string;
  position: number;
  duration: number;
  playing: boolean;
  buffering: boolean;
  canSeek: boolean;
  canPause: boolean;
  canVolume: boolean;
  volume: number;
  idleReason: number;
}
export const EMPTY_CAST_STATE: CastState = {
  revision: 0,
  available: false,
  connection: "disconnected",
  deviceName: "",
  hasMedia: false,
  contentId: "",
  ownedContentId: "",
  position: 0,
  duration: 0,
  playing: false,
  buffering: false,
  canSeek: false,
  canPause: false,
  canVolume: false,
  volume: 1,
  idleReason: 0,
};

/** Eligibility, not a claim about receiver codecs, CORS, authentication or manifest contents. */
export function castMedia(
  track: Track,
  source: MediaSource,
): CastMedia | undefined {
  if (
    track.localUri ||
    track.youtubeId ||
    track.sourcePage ||
    track.provider ||
    source.audioUri ||
    Object.keys(source.headers || {}).length
  )
    return;
  try {
    const url = publicWebUrl(source.uri);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      source.uri.includes("?") ||
      source.uri.includes("#")
    )
      return;
    if (/^[0-9.]+$/.test(url.hostname) || url.hostname.includes(":")) return;
    const path = url.pathname.toLowerCase();
    const contentType = path.endsWith(".mp4")
      ? "video/mp4"
      : path.endsWith(".m3u8")
        ? "application/x-mpegURL"
        : undefined;
    if (!contentType) return;
    return {
      uri: source.uri,
      contentType,
      title: track.title,
      artist: track.artist,
    };
  } catch {
    return;
  }
}
export interface CastTransport {
  load(media: CastMedia, position: number, autoplay: boolean): Promise<void>;
  stopOwned(contentId: string): Promise<void>;
}
export interface LocalPlayback {
  position(): number;
  playing(): boolean;
  pause(): void;
  play(): void;
  seek(position: number): void;
}
export interface HandoffState {
  active: boolean;
  loading: boolean;
  error: string;
}

/** A bounded, explicit transfer. Failed or uncertain stops never start a second audio output. */
export class CastHandoff {
  private state: HandoffState = { active: false, loading: false, error: "" };
  private listeners = new Set<() => void>();
  private generation = 0;
  private disposed = false;
  private requested = false;
  private lastPosition: number | undefined;
  constructor(
    private media: CastMedia | undefined,
    private transport: CastTransport,
    private local: LocalPlayback,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<HandoffState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  adopt(state: CastState) {
    if (
      this.disposed ||
      !state.hasMedia ||
      !this.media ||
      state.contentId !== this.media.uri ||
      state.connection !== "connected"
    )
      return;
    this.requested = true;
    this.lastPosition = state.position;
    this.local.pause();
    this.update({ active: true, loading: false, error: "" });
  }
  activate() {
    this.disposed = false;
  }
  async start() {
    if (!this.media || this.state.active || this.state.loading || this.disposed)
      return;
    const generation = ++this.generation;
    const position = this.local.position(),
      playing = this.local.playing();
    this.requested = true;
    this.local.pause();
    this.update({ loading: true, error: "" });
    try {
      await this.transport.load(this.media, position, playing);
      if (!this.disposed && generation === this.generation)
        this.update({ active: true, loading: false });
    } catch (error) {
      if (this.disposed || generation !== this.generation) return;
      try {
        await this.transport.stopOwned(this.media.uri);
        if (this.disposed || generation !== this.generation) return;
        this.requested = false;
        this.local.seek(position);
        if (playing) this.local.play();
        this.update({
          active: false,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        if (!this.disposed)
          this.update({
            active: true,
            loading: false,
            error:
              "Receiver status is uncertain. Disconnect Cast before resuming local playback.",
          });
      }
    }
  }
  observe(state: CastState) {
    if (!this.state.active && !this.state.loading) return;
    if (state.contentId === this.media?.uri) this.lastPosition = state.position;
    if (
      state.connection === "suspended" ||
      state.connection === "connecting" ||
      state.connection === "disconnecting"
    ) {
      this.local.pause();
      this.update({
        error:
          "Cast connection interrupted. Reconnect or disconnect before playing locally.",
      });
    } else if (state.connection === "disconnected") {
      ++this.generation;
      this.requested = false;
      this.local.pause();
      this.local.seek(this.lastPosition ?? this.local.position());
      this.update({
        active: false,
        loading: false,
        error: "Cast disconnected. Press Play to continue on this device.",
      });
    } else if (
      state.connection === "connected" &&
      this.state.active &&
      state.contentId === this.media?.uri
    ) {
      this.local.pause();
      if (state.idleReason === 4)
        void this.returnLocal(
          "Receiver playback failed. Local playback is available.",
        );
      else if (this.state.error) this.update({ error: "" });
    } else if (
      state.connection === "connected" &&
      this.state.active &&
      state.contentId &&
      state.contentId !== this.media?.uri
    ) {
      ++this.generation;
      this.requested = false;
      this.local.pause();
      this.update({
        active: false,
        loading: false,
        error: "Receiver media changed. Press Play to continue on this device.",
      });
    }
  }
  async returnLocal(error = "") {
    if (!this.media || this.state.loading || this.disposed) return;
    const generation = ++this.generation;
    this.update({ loading: true });
    try {
      await this.transport.stopOwned(this.media.uri);
      if (this.disposed || generation !== this.generation) return;
      this.requested = false;
      this.local.seek(this.lastPosition ?? this.local.position());
      this.local.pause();
      this.update({ active: false, loading: false, error });
    } catch {
      if (!this.disposed)
        this.update({
          loading: false,
          error:
            "Receiver status is uncertain. Disconnect Cast before resuming local playback.",
        });
    }
  }
  dispose = () => {
    this.disposed = true;
    ++this.generation;
    if (this.requested && this.media)
      void this.transport.stopOwned(this.media.uri).catch(() => {});
  };
}
