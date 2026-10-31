// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.util.*;
import java.util.regex.*;

/** Only fresh, public YouTube CDN sources; never the sender's local DASH manifest. */
public final class CastSourcePolicy {
    public static final String UNAVAILABLE = "No compatible YouTube stream is available for Cast. You can play it on this device.";
    private static final Pattern ATTRIBUTE = Pattern.compile("([A-Z0-9-]+)=(\"[^\"]*\"|[^,]*)");
    private static final Pattern PATH_EXPIRY = Pattern.compile("/expire/([0-9]{9,12})(?:/|$)");
    private CastSourcePolicy() {}

    public static String contentId(String id, String kind) {
        if (id == null || !id.matches("[A-Za-z0-9_-]{11}") || !("audio".equals(kind) || "video".equals(kind)))
            throw new IllegalArgumentException("Invalid Cast source");
        return "harmonia:youtube:" + id + ":" + kind;
    }
    static URI cdnUrl(String input) throws IOException {
        try {
            if (input == null || input.length() > 4096 || input.matches("(?s).*[\\x00-\\x20\\x7f\\\\].*")) throw new IOException(UNAVAILABLE);
            URI u = new URI(input); String host = u.getHost();
            if (!"https".equalsIgnoreCase(u.getScheme()) || host == null || !host.toLowerCase(Locale.ROOT).endsWith(".googlevideo.com") ||
                    u.getRawUserInfo() != null || u.getRawFragment() != null || (u.getPort() != -1 && u.getPort() != 443)) throw new IOException(UNAVAILABLE);
            return u;
        } catch (java.net.URISyntaxException error) { throw new IOException(UNAVAILABLE); }
    }
    static long expiry(String input) throws IOException {
        URI u = cdnUrl(input); String value = null;
        if (u.getRawQuery() != null) for (String part : u.getRawQuery().split("&")) {
            String[] pair = part.split("=", 2);
            if ("expire".equals(pair[0]) && pair.length == 2) { if (value != null) throw new IOException(UNAVAILABLE); value = pair[1]; }
        }
        if (value == null) { Matcher m = PATH_EXPIRY.matcher(u.getPath()); if (m.find()) value = m.group(1); }
        try { return Math.multiplyExact(Long.parseLong(value), 1000L); }
        catch (RuntimeException error) { throw new IOException(UNAVAILABLE); }
    }
    public static boolean supports(String input, String type, long now) {
        try {
            URI u = cdnUrl(input); long expires = expiry(input);
            if (expires < now + 120000 || expires > now + 86400000) return false;
            if ("application/x-mpegURL".equals(type)) return u.getPath().startsWith("/api/manifest/hls_");
            if (!("video/mp4".equals(type) || "audio/mp4".equals(type)) || !"/videoplayback".equals(u.getPath())) return false;
            // Reject a contradictory provider MIME marker, when present.
            if (u.getRawQuery() != null) for (String part : u.getRawQuery().split("&")) {
                String[] pair = part.split("=", 2);
                if ("mime".equals(pair[0]) && (pair.length != 2 || !type.equals(URLDecoder.decode(pair[1], "UTF-8")))) return false;
            }
            return true;
        } catch (Exception error) { return false; }
    }

    private static Map<String, String> attributes(String line) {
        Map<String, String> result = new HashMap<>(); Matcher m = ATTRIBUTE.matcher(line);
        while (m.find()) { String value = m.group(2); result.put(m.group(1), value.startsWith("\"") ? value.substring(1, value.length() - 1) : value); }
        return result;
    }
    private static void clearPlaylist(String body) throws IOException {
        if (!body.trim().startsWith("#EXTM3U")) throw new IOException(UNAVAILABLE);
        for (String raw : body.split("\\r?\\n")) {
            String line = raw.trim();
            if ((line.startsWith("#EXT-X-KEY:") || line.startsWith("#EXT-X-SESSION-KEY:")) && !"NONE".equals(attributes(line).get("METHOD")))
                throw new IOException(UNAVAILABLE);
        }
    }
    /** Select self-contained AVC/AAC variants. External audio groups are never silently dropped. */
    static List<String> hlsVariants(String body, String base) throws IOException {
        clearPlaylist(body); URI root = cdnUrl(base); String[] lines = body.split("\\r?\\n");
        Map<String, Boolean> externalAudio = new HashMap<>();
        for (String line : lines) if (line.startsWith("#EXT-X-MEDIA:")) {
            Map<String, String> a = attributes(line);
            if ("AUDIO".equals(a.get("TYPE"))) externalAudio.put(a.get("GROUP-ID"), a.containsKey("URI"));
        }
        List<Map.Entry<Integer, String>> choices = new ArrayList<>();
        for (int i = 0; i + 1 < lines.length; i++) if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
            Map<String, String> a = attributes(lines[i]); String[] codecs = a.getOrDefault("CODECS", "").toLowerCase(Locale.ROOT).split(",");
            boolean avc = false, aac = false;
            for (String codec : codecs) {
                codec = codec.trim();
                if (codec.matches("avc1\\.[a-f0-9]{6}") && Integer.parseInt(codec.substring(codec.length() - 2), 16) <= 42) avc = true;
                if (codec.matches("mp4a\\.40\\.[25]")) aac = true;
            }
            if (codecs.length != 2 || !avc || !aac) continue;
            if (a.containsKey("AUDIO") && externalAudio.getOrDefault(a.get("AUDIO"), true)) continue;
            try {
                String[] size = a.getOrDefault("RESOLUTION", "0x0").split("x");
                int width = Integer.parseInt(size[0]), height = Integer.parseInt(size[1]);
                double fps = Double.parseDouble(a.getOrDefault("FRAME-RATE", "30"));
                if (width <= 0 || width > 1920 || height <= 0 || height > 1080 || !Double.isFinite(fps) || fps <= 0 || fps > 30) continue;
                String target = root.resolve(lines[i + 1].trim()).toString();
                if (supports(target, "application/x-mpegURL", System.currentTimeMillis())) choices.add(new AbstractMap.SimpleEntry<>(height, target));
            } catch (RuntimeException ignored) { /* Unknown/unsupported variant. */ }
        }
        choices.sort((a, b) -> Integer.compare(b.getKey(), a.getKey())); List<String> result = new ArrayList<>();
        for (Map.Entry<Integer, String> c : choices) if (!result.contains(c.getValue()) && result.size() < 2) result.add(c.getValue());
        return result;
    }
    /** Validate clear MPEG-TS media playlists and every segment URL before checking the first segment. */
    static String firstSegment(String body, String base) throws IOException {
        clearPlaylist(body); URI root = cdnUrl(base); String first = null; boolean duration = false;
        for (String raw : body.split("\\r?\\n")) {
            String line = raw.trim();
            if (line.startsWith("#EXT-X-STREAM-INF:") || line.startsWith("#EXT-X-MAP:")) throw new IOException(UNAVAILABLE);
            if (line.startsWith("#EXTINF:")) duration = true;
            if (line.isEmpty() || line.startsWith("#")) continue;
            String segment = root.resolve(line).toString(); cdnUrl(segment); if (first == null) first = segment;
        }
        if (first == null || !duration) throw new IOException(UNAVAILABLE);
        return first;
    }

    public static final class Grant {
        public final String uri, contentType, contentId, token;
        public final long expiresAt;
        Grant(String uri, String type, String id, long expires) { this.uri = uri; contentType = type; contentId = id; expiresAt = expires; token = UUID.randomUUID().toString(); }
    }
    private static final LinkedHashMap<String, Grant> grants = new LinkedHashMap<>();
    static synchronized Grant issue(String uri, String type, String id, long now) throws IOException {
        if (!supports(uri, type, now) || id == null || !id.matches("harmonia:youtube:[A-Za-z0-9_-]{11}:(audio|video)")) throw new IOException(UNAVAILABLE);
        if (id.endsWith(":audio") != "audio/mp4".equals(type)) throw new IOException(UNAVAILABLE);
        grants.values().removeIf(g -> g.expiresAt <= now);
        while (grants.size() >= 8) grants.remove(grants.keySet().iterator().next());
        Grant grant = new Grant(uri, type, id, Math.min(now + 300000, expiry(uri) - 60000)); grants.put(grant.token, grant); return grant;
    }
    /** LOAD requires a one-use grant minted after native extraction and preflight, not a JS eligibility flag. */
    public static synchronized boolean claim(String token, String uri, String type, String id, long now) {
        Grant g = grants.get(token);
        if (g == null || g.expiresAt <= now || !g.uri.equals(uri) || !g.contentType.equals(type) || !g.contentId.equals(id) || !supports(uri, type, now)) return false;
        grants.remove(token); return true;
    }
    static synchronized void clearGrants() { grants.clear(); }
}
