// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import android.content.Context;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.net.Uri;
import java.io.*;
import java.util.*;

final class LocalCastMedia {
    static final String UNAVAILABLE = "This downloaded file is missing, protected or unsupported for Cast. Try another download.";
    final File file; final String type, extension;
    LocalCastMedia(File file, String type, String extension) { this.file = file; this.type = type; this.extension = extension; }
    static LocalCastMedia inspect(Context context, String input, String kind) throws IOException {
        Uri uri = Uri.parse(input);
        if (!"file".equals(uri.getScheme()) || (uri.getAuthority() != null && !uri.getAuthority().isEmpty()) || uri.getQuery() != null || uri.getFragment() != null || uri.getPath() == null) throw new IOException(UNAVAILABLE);
        File file = new File(uri.getPath()).getCanonicalFile(); List<File> roots = new ArrayList<>(Arrays.asList(context.getFilesDir(), context.getCacheDir()));
        roots.addAll(Arrays.asList(context.getExternalFilesDirs(null)));
        if (!LocalMediaPolicy.privateFile(file, roots) || !file.isFile() || file.length() <= 0) throw new IOException(UNAVAILABLE);
        MediaExtractor extractor = new MediaExtractor(); boolean audio = false, video = false; String audioMime = "";
        try {
            extractor.setDataSource(file.getPath());
            if (extractor.getDrmInitData() != null || extractor.getTrackCount() > 32) throw new IOException(UNAVAILABLE);
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat format = extractor.getTrackFormat(i); String mime = format.getString(MediaFormat.KEY_MIME);
                if (mime == null || !(mime.startsWith("audio/") || mime.startsWith("video/"))) continue;
                audio |= mime.startsWith("audio/"); video |= mime.startsWith("video/"); if (mime.startsWith("audio/")) audioMime = mime;
                extractor.selectTrack(i); extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC);
                if ((extractor.getSampleFlags() & MediaExtractor.SAMPLE_FLAG_ENCRYPTED) != 0) throw new IOException(UNAVAILABLE);
                extractor.unselectTrack(i);
            }
            if (("audio".equals(kind) && !audio) || ("video".equals(kind) && !video) || !("audio".equals(kind) || "video".equals(kind))) throw new IOException(UNAVAILABLE);
        } catch (RuntimeException error) { throw new IOException(UNAVAILABLE); }
        finally { extractor.release(); }
        byte[] header = new byte[4096]; int count;
        try (InputStream in = new FileInputStream(file)) { count = in.read(header); }
        String prefix = new String(header, 0, Math.max(0, count), java.nio.charset.StandardCharsets.ISO_8859_1);
        if (count >= 12 && prefix.substring(4, 8).equals("ftyp")) return new LocalCastMedia(file, video ? "video/mp4" : "audio/mp4", video ? "mp4" : "m4a");
        if (count >= 4 && (header[0] & 255) == 0x1a && (header[1] & 255) == 0x45 && (header[2] & 255) == 0xdf && (header[3] & 255) == 0xa3 && prefix.contains("webm"))
            return new LocalCastMedia(file, video ? "video/webm" : "audio/webm", "webm");
        if (video) throw new IOException(UNAVAILABLE);
        if (prefix.startsWith("OggS")) return new LocalCastMedia(file, "audio/ogg", "ogg");
        if (prefix.startsWith("fLaC")) return new LocalCastMedia(file, "audio/flac", "flac");
        if (prefix.startsWith("RIFF") && count >= 12 && prefix.substring(8, 12).equals("WAVE")) return new LocalCastMedia(file, "audio/wav", "wav");
        if (audioMime.equals("audio/mpeg")) return new LocalCastMedia(file, "audio/mpeg", "mp3");
        if (audioMime.equals("audio/mp4a-latm") && count >= 2 && (header[0] & 255) == 255 && (header[1] & 0xf6) == 0xf0) return new LocalCastMedia(file, "audio/aac", "aac");
        throw new IOException(UNAVAILABLE);
    }
}
