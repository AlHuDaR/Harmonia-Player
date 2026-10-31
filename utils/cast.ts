import type { Track } from "@/types/media";
import type { MediaSource } from "./youtube";
import { publicWebUrl } from "./linkProviders";

export const CAST_UNAVAILABLE =
  "Google Cast needs Google Play services on an Android phone. Install the standalone APK; Expo Go and web are unsupported.";
export const CAST_SOURCE_UNSUPPORTED =
  "Casting isn't supported for this source. You can play it on this device.";
export const CAST_YOUTUBE_UNSUPPORTED =
  "No compatible YouTube stream is available for Cast. You can play it on this device.";
export const CAST_LOCAL_UNSUPPORTED =
  "This downloaded file is missing, protected or unsupported for Cast. Try another download.";
export interface CastMedia {
  uri: string;
  contentType:
    | "video/mp4"
    | "audio/mp4"
    | "application/x-mpegURL"
    | "audio/mpeg"
    | "audio/aac"
    | "audio/wav"
    | "audio/ogg"
    | "audio/flac"
    | "audio/webm"
    | "video/webm";
  contentId?: string;
  sourceToken?: string;
  localToken?: string;
  title: string;
  artist: string;
}
export function canPrepareLocalCast(track: Track) {
  return !!track.localUri && /^file:\/\//i.test(track.localUri);
}
/** Non-secret playback identity; the native file/receiver grant supplies authorization. */
export function localCastContentId(track: Track) {
  let a = 0x811c9dc5,
    b = 0x9e3779b9;
  for (const ch of track.localUri || "") {
    for (let i = 0; i < ch.length; i++) {
      a = Math.imul(a ^ ch.charCodeAt(i), 0x01000193);
      b = Math.imul(b ^ ch.charCodeAt(i), 0x85ebca6b);
    }
  }
  return `harmonia:local:${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}:${track.kind}`;
}
export function localCastMedia(
  track: Track,
  candidate: Omit<CastMedia, "title" | "artist">,
): CastMedia {
  try {
    const url = new URL(candidate.uri);
    const host = url.hostname;
    const ipv4 = host.split(".");
    const literal =
      (ipv4.length === 4 &&
        ipv4.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255) &&
        !["0", "127"].includes(ipv4[0])) ||
      (/^\[[0-9a-f:]+\]$/i.test(host) && !["[::]", "[::1]"].includes(host));
    if (
      !canPrepareLocalCast(track) ||
      url.protocol !== "http:" ||
      !literal ||
      !url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/cast\/[a-f0-9]{64}\/media\.(mp4|m4a|mp3|aac|webm|wav|ogg|flac)$/.test(
        url.pathname,
      ) ||
      candidate.contentId !== localCastContentId(track) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        candidate.localToken || "",
      ) ||
      ![
        "video/mp4",
        "audio/mp4",
        "video/webm",
        "audio/webm",
        "audio/mpeg",
        "audio/aac",
        "audio/wav",
        "audio/ogg",
        "audio/flac",
      ].includes(candidate.contentType)
    )
      throw new Error(CAST_LOCAL_UNSUPPORTED);
    return {
      uri: candidate.uri,
      contentType: candidate.contentType,
      contentId: candidate.contentId,
      localToken: candidate.localToken,
      title: track.title,
      artist: track.artist,
    };
  } catch {
    throw new Error(CAST_LOCAL_UNSUPPORTED);
  }
}
export function canPrepareYouTubeCast(track: Track) {
  return (
    !track.localUri &&
    (track.kind === "audio" || track.kind === "video") &&
    /^[A-Za-z0-9_-]{11}$/.test(track.youtubeId || "")
  );
}
export function youtubeCastContentId(track: Track) {
  return `harmonia:youtube:${track.youtubeId}:${track.kind}`;
}
/** A native one-use grant is still required by Android LOAD; this does not admit arbitrary signed URLs. */
export function youtubeCastMedia(
  track: Track,
  candidate: Omit<CastMedia, "title" | "artist"> & { expiresAt: number },
): CastMedia {
  try {
    const url = publicWebUrl(candidate.uri);
    const type = candidate.contentType;
    const expiryValues = url.searchParams.getAll("expire");
    const expiry =
      Number(
        expiryValues.length === 1
          ? expiryValues[0]
          : expiryValues.length === 0
            ? url.pathname.match(/\/expire\/(\d+)(?:\/|$)/)?.[1]
            : NaN,
      ) * 1000;
    if (
      !canPrepareYouTubeCast(track) ||
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".googlevideo.com") ||
      url.username ||
      url.password ||
      url.hash ||
      candidate.contentId !== youtubeCastContentId(track) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        candidate.sourceToken || "",
      ) ||
      !Number.isFinite(expiry) ||
      expiry < Date.now() + 120000 ||
      expiry > Date.now() + 86400000 ||
      !Number.isFinite(candidate.expiresAt) ||
      candidate.expiresAt <= Date.now() + 10000 ||
      candidate.expiresAt > expiry ||
      (track.kind === "audio"
        ? type !== "audio/mp4"
        : type !== "video/mp4" && type !== "application/x-mpegURL") ||
      (type === "application/x-mpegURL"
        ? !url.pathname.startsWith("/api/manifest/hls_")
        : url.pathname !== "/videoplayback")
    )
      throw new Error(CAST_YOUTUBE_UNSUPPORTED);
    return {
      uri: candidate.uri,
      contentType: type,
      contentId: candidate.contentId,
      sourceToken: candidate.sourceToken,
      title: track.title,
      artist: track.artist,
    };
  } catch {
    throw new Error(CAST_YOUTUBE_UNSUPPORTED);
  }
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
  localSourceActive: boolean;
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
  localSourceActive: false,
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
  getState?(): Promise<CastState>;
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
  preparing: boolean;
  error: string;
}

/** A bounded, explicit transfer. Failed or uncertain stops never start a second audio output. */
export class CastHandoff {
  private state: HandoffState = {
    active: false,
    loading: false,
    preparing: false,
    error: "",
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private disposed = false;
  private requested = false;
  private lastPosition: number | undefined;
  private preparation?: AbortController;
  private receiverWatchdog?: ReturnType<typeof setTimeout>;
  private automaticRecoveryAttempted = false;
  private clearReceiverTimeout() {
    if (this.receiverWatchdog) clearTimeout(this.receiverWatchdog);
    this.receiverWatchdog = undefined;
  }
  private watchReceiver() {
    if (this.receiverWatchdog || this.automaticRecoveryAttempted) return;
    const generation = this.generation;
    this.receiverWatchdog = setTimeout(() => {
      this.receiverWatchdog = undefined;
      void this.checkReceiverTimeout(generation);
    }, 30000);
  }
  private async checkReceiverTimeout(generation: number) {
    if (!this.state.active || this.disposed || generation !== this.generation)
      return;
    try {
      if (this.transport.getState) {
        const latest = await this.transport.getState();
        if (
          !this.state.active ||
          this.disposed ||
          generation !== this.generation
        )
          return;
        this.observe(latest);
        if (
          latest.connection !== "connected" ||
          latest.contentId !== this.contentId ||
          (latest.hasMedia && !latest.buffering) ||
          latest.idleReason === 1 ||
          latest.idleReason === 2
        )
          return;
      }
      if (this.state.active)
        await this.recover(
          "Receiver playback timed out. Local playback is available.",
        );
    } catch {
      if (!this.disposed && generation === this.generation) {
        this.automaticRecoveryAttempted = true;
        this.update({
          error:
            "Receiver status is uncertain. Disconnect Cast before resuming local playback.",
        });
      }
    }
  }
  private async recover(error: string) {
    if (this.automaticRecoveryAttempted) return;
    this.automaticRecoveryAttempted = true;
    await this.returnLocal(error);
  }
  constructor(
    private media: CastMedia | undefined,
    private transport: CastTransport,
    private local: LocalPlayback,
    private resolver?: {
      contentId: string;
      resolve(signal: AbortSignal): Promise<CastMedia>;
      canAdopt?(state: CastState): boolean;
    },
  ) {}
  get contentId() {
    return this.resolver?.contentId || this.media?.contentId || this.media?.uri;
  }
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
  accepts(state: CastState) {
    return (
      !this.disposed &&
      !this.state.preparing &&
      !!this.contentId &&
      state.hasMedia &&
      state.contentId === this.contentId &&
      state.connection === "connected" &&
      (!this.resolver?.canAdopt || this.resolver.canAdopt(state))
    );
  }
  adopt(state: CastState) {
    if (!this.accepts(state)) return;
    this.requested = true;
    this.automaticRecoveryAttempted = false;
    this.lastPosition = state.position;
    this.local.pause();
    this.update({ active: true, loading: false, error: "" });
    this.clearReceiverTimeout();
    if (state.buffering) this.watchReceiver();
  }
  activate() {
    this.disposed = false;
  }
  async start() {
    if (
      (!this.media && !this.resolver) ||
      this.state.active ||
      this.state.loading ||
      this.state.preparing ||
      this.disposed
    )
      return;
    const generation = ++this.generation;
    this.automaticRecoveryAttempted = false;
    this.clearReceiverTimeout();
    if (this.resolver) {
      const controller = new AbortController();
      this.preparation = controller;
      this.update({ preparing: true, error: "" });
      try {
        const media = await this.resolver.resolve(controller.signal);
        if (this.disposed || generation !== this.generation) return;
        if (media.contentId !== this.resolver.contentId)
          throw new Error(CAST_YOUTUBE_UNSUPPORTED);
        this.media = media;
      } catch (error) {
        if (!this.disposed && generation === this.generation)
          this.update({
            preparing: false,
            error: error instanceof Error ? error.message : String(error),
          });
        return;
      } finally {
        if (this.preparation === controller) this.preparation = undefined;
      }
    }
    if (!this.media || this.disposed || generation !== this.generation) return;
    const position = this.local.position(),
      playing = this.local.playing();
    this.lastPosition = position;
    this.requested = true;
    this.local.pause();
    this.update({ preparing: false, loading: true, error: "" });
    try {
      await this.transport.load(this.media, position, playing);
      if (!this.disposed && generation === this.generation) {
        this.update({ active: true, loading: false });
        this.watchReceiver();
      }
    } catch (error) {
      if (this.disposed || generation !== this.generation) return;
      try {
        await this.transport.stopOwned(this.contentId!);
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
    if (this.state.preparing && !this.requested) {
      if (state.connection !== "connected")
        this.cancelPreparation(
          "Cast preparation cancelled. Local playback is available.",
        );
      return;
    }
    if (!this.state.active && !this.state.loading) return;
    if (state.contentId === this.contentId) this.lastPosition = state.position;
    if (
      state.connection === "suspended" ||
      state.connection === "connecting" ||
      state.connection === "disconnecting"
    ) {
      this.clearReceiverTimeout();
      this.local.pause();
      this.update({
        error:
          "Cast connection interrupted. Reconnect or disconnect before playing locally.",
      });
    } else if (state.connection === "disconnected") {
      this.clearReceiverTimeout();
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
      state.contentId === this.contentId
    ) {
      this.local.pause();
      if (state.hasMedia && !state.buffering && state.idleReason === 0)
        this.automaticRecoveryAttempted = false;
      if (state.idleReason === 1 || state.idleReason === 2)
        this.clearReceiverTimeout();
      else if (state.buffering || !state.hasMedia) this.watchReceiver();
      else this.clearReceiverTimeout();
      if (state.idleReason === 4)
        void this.recover(
          "Receiver playback failed. Local playback is available.",
        );
      else if (this.state.error) this.update({ error: "" });
    } else if (
      state.connection === "connected" &&
      this.state.active &&
      state.contentId &&
      state.contentId !== this.contentId
    ) {
      this.clearReceiverTimeout();
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
  private cancelPreparation(error = "") {
    ++this.generation;
    this.preparation?.abort();
    this.preparation = undefined;
    this.update({ preparing: false, error });
  }
  async returnLocal(error = "") {
    this.clearReceiverTimeout();
    if (this.disposed) return;
    if (this.state.preparing) {
      this.cancelPreparation(error);
      return;
    }
    if (!this.contentId || this.state.loading) return;
    const generation = ++this.generation;
    this.update({ loading: true });
    try {
      await this.transport.stopOwned(this.contentId);
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
    this.clearReceiverTimeout();
    this.disposed = true;
    ++this.generation;
    this.preparation?.abort();
    this.preparation = undefined;
    if (this.requested && this.contentId)
      void this.transport.stopOwned(this.contentId).catch(() => {});
    this.requested = false;
    this.state = {
      ...this.state,
      active: false,
      loading: false,
      preparing: false,
    };
  };
}
