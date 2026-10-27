/** Classification is offline. It does not verify DNS, redirects, codecs or download rights. */
export type LinkAction = "play" | "download" | "audio" | "save" | "browser";
export interface SharedLink {
  url: string;
  provider: string;
  kind: "youtube" | "direct" | "web";
  actions: readonly LinkAction[];
}
export const providers = [
  { name: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { name: "Instagram", hosts: ["instagram.com"] },
  { name: "Facebook", hosts: ["facebook.com", "fb.watch"] },
  { name: "TikTok", hosts: ["tiktok.com"] },
  { name: "X / Twitter", hosts: ["x.com", "twitter.com", "t.co"] },
  { name: "Reddit", hosts: ["reddit.com", "redd.it"] },
  { name: "Vimeo", hosts: ["vimeo.com"] },
] as const;
export function publicWebUrl(input: string): URL {
  if (
    typeof input !== "string" ||
    input.length > 4096 ||
    /[\u0000-\u0020\u007f\\]/.test(input)
  )
    throw new Error("Invalid web link.");
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Only web links without credentials are supported.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // Deny IP literals (including URL-normalized numeric/hex IPv4), single-label
  // hosts and common local namespaces. DNS/redirect enforcement is a separate gate.
  if (
    !host.includes(".") ||
    /[:\[\]]/.test(host) ||
    /^[\d.]+$/.test(host) ||
    /(^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host) ||
    host === "metadata.google.internal" ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error(
      "Local, internal and nonstandard-port links are not supported.",
    );
  return url;
}
export function classifyLink(input: string): SharedLink {
  const url = publicWebUrl(input);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const provider = providers.find((p) =>
    p.hosts.some((h) => host === h || host.endsWith(`.${h}`)),
  );
  let id: string | null | undefined;
  // Match only the exact supported YouTube host variants, never lookalikes.
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  else if (/^(www\.|m\.|music\.)?youtube\.com$/.test(host))
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : /^\/(shorts|live|embed)\//.test(url.pathname)
          ? url.pathname.split("/")[2]
          : null;
  if (id && /^[A-Za-z0-9_-]{11}$/.test(id))
    return {
      url: `https://www.youtube.com/watch?v=${id}`,
      provider: "YouTube",
      kind: "youtube",
      actions: ["save", "browser"],
    };
  // Public embed discovery uses only this post path, never tracking/query tokens.
  // Leave other hosts and direct signed-media URLs untouched.
  if (url.protocol === "https:" && /^(www\.|m\.)?instagram\.com$/.test(host) &&
      /^\/(reel|p|tv)\/[A-Za-z0-9_-]{5,64}\/?$/.test(url.pathname))
    return {
      url: `https://www.instagram.com${url.pathname.replace(/\/+$/, "")}/`,
      provider: "Instagram", kind: "web", actions: ["save", "browser"],
    };
  // Known platform page URLs are never treated as files, even with an .mp4 suffix.
  const direct =
    !provider &&
    url.protocol === "https:" &&
    /\.(mp3|m4a|aac|wav|ogg|flac|mp4|webm|mov|mkv|m3u8|mpd)$/i.test(
      url.pathname,
    );
  return {
    url: url.href,
    provider: provider?.name || (direct ? "Direct media" : host),
    kind: direct ? "direct" : "web",
    // URL recognition is not format discovery. Media actions are gated by discoverMedia.
    actions: ["save", "browser"],
  };
}
export function sharedLinks(text: string): SharedLink[] {
  if (typeof text !== "string" || text.length > 4096) return [];
  const links = new Map<string, SharedLink>();
  for (const candidate of text.match(/https?:\/\/[^\s<>"']+/gi) || []) {
    try {
      const link = classifyLink(candidate.replace(/[).,،!?\]]+$/g, ""));
      links.set(link.url, link);
    } catch {
      /* Invalid or unsafe shared text is not actionable. */
    }
  }
  return [...links.values()].slice(0, 10);
}
