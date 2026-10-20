import { sharedLinks } from "./linkProviders";
/** Compatibility helper for existing callers; universal shares use sharedLinks. */
export function incomingVideo(text: string): string | undefined {
  return sharedLinks(text).find((link) => link.kind === "youtube")?.url;
}

/** Deduplicate native event + pending delivery, not separately shared identical URLs. */
export function intentInbox(limit = 64) {
  const seen = new Set<string>();
  return (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") return;
    const { text, token } = value as { text?: unknown; token?: unknown };
    if (
      typeof text !== "string" ||
      text.length > 4096 ||
      typeof token !== "string" ||
      !token ||
      token.length > 128 ||
      seen.has(token)
    )
      return;
    seen.add(token);
    if (seen.size > limit) seen.delete(seen.values().next().value!);
    return text;
  };
}
