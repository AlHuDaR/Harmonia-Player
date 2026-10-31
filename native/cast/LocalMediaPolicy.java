// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import java.io.*;
import java.util.*;

public final class LocalMediaPolicy {
    private LocalMediaPolicy() {}
    public static boolean mime(String type) {
        return Arrays.asList("video/mp4", "audio/mp4", "video/webm", "audio/webm", "audio/mpeg", "audio/aac", "audio/wav", "audio/ogg", "audio/flac").contains(type);
    }
    public static boolean privateFile(File file, Collection<File> roots) throws IOException {
        String path = file.getCanonicalPath();
        for (File root : roots) if (root != null && path.startsWith(root.getCanonicalPath() + File.separator)) return true;
        return false;
    }
    public static long[] range(String header, long length) {
        if (length <= 0) throw new IllegalArgumentException();
        if (header == null) return new long[]{0, length - 1};
        if (!header.matches("bytes=[0-9]*-[0-9]*")) throw new IllegalArgumentException();
        String[] halves = header.substring(6).split("-", -1);
        try {
            if (halves[0].isEmpty()) {
                long suffix = Long.parseLong(halves[1]); if (suffix <= 0) throw new IllegalArgumentException();
                return new long[]{Math.max(0, length - suffix), length - 1};
            }
            long start = Long.parseLong(halves[0]), end = halves[1].isEmpty() ? length - 1 : Math.min(Long.parseLong(halves[1]), length - 1);
            if (start < 0 || start >= length || end < start) throw new IllegalArgumentException();
            return new long[]{start, end};
        } catch (NumberFormatException error) { throw new IllegalArgumentException(); }
    }
}
