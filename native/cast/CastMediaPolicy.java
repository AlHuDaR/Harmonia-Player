// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import java.net.URI;
import java.util.Locale;

/** Receiver URLs must not depend on the sender's filesystem, credentials or signed extraction. */
public final class CastMediaPolicy {
    /** Terminal receiver status is already a confirmed stop; a pending LOAD never qualifies. */
    public static boolean settledIdle(String owned, String requested, String pending, String receiver, boolean idle, int reason) {
        return requested != null && !requested.isEmpty() && requested.equals(owned) && requested.equals(receiver)
                && !requested.equals(pending) && idle && reason >= 1 && reason <= 4;
    }
    /** A pending LOAD can arrive late even while status still describes the previous item. */
    public static boolean mayStopOwned(String owned, String requested, String pending, String receiverContentId) {
        return requested != null && !requested.isEmpty() && requested.equals(owned)
                && (requested.equals(pending) || receiverContentId == null || requested.equals(receiverContentId));
    }
    public static boolean supports(String input, String contentType) {
        try {
            URI uri = new URI(input);
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || uri.getUserInfo() != null ||
                uri.getRawQuery() != null || uri.getRawFragment() != null || (uri.getPort() != -1 && uri.getPort() != 443)) return false;
            host = host.toLowerCase(Locale.ROOT);
            // DNS names only: no loopback/private IPv4/IPv6, mDNS, single-label or numeric hosts.
            if (!host.contains(".") || host.matches("[0-9.]+") || host.contains(":") || host.endsWith(".") ||
                host.endsWith(".local") || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".lan")) return false;
            String path = uri.getPath().toLowerCase(Locale.ROOT);
            return (path.endsWith(".mp4") && "video/mp4".equals(contentType)) ||
                (path.endsWith(".m3u8") && "application/x-mpegURL".equals(contentType));
        } catch (Exception ignored) { return false; }
    }
    private CastMediaPolicy() {}
}
