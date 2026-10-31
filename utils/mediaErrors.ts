export type MediaErrorCode = "unsupported" | "access-denied" | "not-found" | "rate-limited" | "network" | "cancelled" | "unavailable";
export class MediaDiscoveryError extends Error {
  readonly fallback = ["browser", "save"] as const;
  constructor(readonly code: MediaErrorCode, message: string) {
    super(message);
    this.name = "MediaDiscoveryError";
  }
}
export function discoveryError(error: unknown): MediaDiscoveryError {
  if (error instanceof MediaDiscoveryError) return error;
  const value = error as { code?: string; message?: string } | null;
  const codes: Record<string, MediaErrorCode> = {
    E_ACCESS: "access-denied", E_NOT_FOUND: "not-found", E_RATE_LIMIT: "rate-limited",
    E_NETWORK: "network", E_UNSUPPORTED: "unsupported", E_CANCELLED: "cancelled",
  };
  return new MediaDiscoveryError(codes[value?.code || ""] || "unavailable",
    value?.message || "Media discovery is unavailable. Open in Browser to check the source.");
}
