// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import okhttp3.*;
import org.schabi.newpipe.extractor.MediaFormat;
import org.schabi.newpipe.extractor.stream.*;

/** A distinct, bounded receiver-source resolver. No phone headers, cookies or local manifests are forwarded. */
final class YouTubeCastResolver {
    static final String ORIGIN = "https://www.gstatic.com";
    private static final OkHttpClient CLIENT = SafeHttp.CLIENT.newBuilder().connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS).callTimeout(8, TimeUnit.SECONDS).build();

    private static Response open(String uri, boolean range) throws IOException {
        CastSourcePolicy.cdnUrl(uri); SafeHttp.url(uri);
        Request.Builder request = new Request.Builder().url(uri).header("Origin", ORIGIN).header("Accept-Encoding", "identity");
        if (range) request.header("Range", "bytes=0-31");
        Call call = CLIENT.newCall(request.build()); call.timeout().timeout(Math.min(8000, ExtractorDownloader.remainingMillis()), TimeUnit.MILLISECONDS);
        Response response = call.execute();
        // Redirects are refused rather than delegating a grant to another origin.
        if (!response.isSuccessful() || response.body() == null) { response.close(); throw new IOException(CastSourcePolicy.UNAVAILABLE); }
        return response;
    }
    static boolean cors(String allowOrigin) { return "*".equals(allowOrigin) || ORIGIN.equals(allowOrigin); }
    private static String playlist(String uri) throws IOException {
        try (Response response = open(uri, false)) {
            if (!cors(response.header("Access-Control-Allow-Origin"))) throw new IOException(CastSourcePolicy.UNAVAILABLE);
            try (InputStream in = response.body().byteStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096]; int n;
                while ((n = in.read(buffer)) != -1) { if (out.size() + n > 262144) throw new IOException(CastSourcePolicy.UNAVAILABLE); out.write(buffer, 0, n); }
                return out.toString("UTF-8");
            }
        }
    }
    static boolean mp4(byte[] prefix) { return prefix.length >= 12 && prefix[4] == 'f' && prefix[5] == 't' && prefix[6] == 'y' && prefix[7] == 'p'; }
    private static void probe(String uri, boolean ts) throws IOException {
        try (Response response = open(uri, true)) {
            if (ts && !cors(response.header("Access-Control-Allow-Origin"))) throw new IOException(CastSourcePolicy.UNAVAILABLE);
            byte[] bytes = response.peekBody(32).bytes();
            if (ts ? bytes.length < 16 || bytes[0] != 0x47 : !mp4(bytes)) throw new IOException(CastSourcePolicy.UNAVAILABLE);
        }
    }
    private static boolean progressive(Stream s) {
        return s.isUrl() && s.getDeliveryMethod() == DeliveryMethod.PROGRESSIVE_HTTP && s.getItagItem() != null && !Boolean.TRUE.equals(s.getItagItem().isDrc());
    }
    static CastSourcePolicy.Grant resolve(StreamInfo info, String id, String kind) throws IOException {
        // This initial route handles finite videos/audio; live/DVR needs a separate timeline contract.
        if (info.getDuration() <= 0) throw new IOException(CastSourcePolicy.UNAVAILABLE);
        String contentId = CastSourcePolicy.contentId(id, kind); List<String> candidates = new ArrayList<>();
        String type = "audio".equals(kind) ? "audio/mp4" : "video/mp4";
        if ("audio".equals(kind)) {
            List<AudioStream> audio = new ArrayList<>(info.getAudioStreams());
            audio.sort(Comparator.comparingInt((AudioStream s) -> s.getAudioTrackType() == AudioTrackType.ORIGINAL ? 2 : s.getAudioTrackType() == null ? 1 : 0)
                    .thenComparingInt(AudioStream::getAverageBitrate).reversed());
            for (AudioStream s : audio) if (progressive(s) && s.getFormat() == MediaFormat.M4A && s.getItagItem().getCodec() != null && s.getItagItem().getCodec().startsWith("mp4a")) candidates.add(s.getContent());
        } else {
            List<VideoStream> video = new ArrayList<>(info.getVideoStreams()); video.sort((a, b) -> Integer.compare(b.getHeight(), a.getHeight()));
            for (VideoStream s : video) if (progressive(s) && !s.isVideoOnly() && s.getFormat() == MediaFormat.MPEG_4 && (s.getItag() == 18 || s.getItag() == 22)) candidates.add(s.getContent());
        }
        int attempts = 0;
        for (String uri : candidates) {
            if (attempts >= 2) break;
            if (!CastSourcePolicy.supports(uri, type, System.currentTimeMillis())) continue;
            attempts++;
            try { probe(uri, false); return CastSourcePolicy.issue(uri, type, contentId, System.currentTimeMillis()); }
            catch (IOException error) { ExtractorDownloader.remainingMillis(); }
        }
        String hls = info.getHlsUrl();
        if ("video".equals(kind) && CastSourcePolicy.supports(hls, "application/x-mpegURL", System.currentTimeMillis())) {
            String master = playlist(hls);
            for (String uri : CastSourcePolicy.hlsVariants(master, hls)) {
                try {
                    String segment = CastSourcePolicy.firstSegment(playlist(uri), uri); probe(segment, true);
                    return CastSourcePolicy.issue(uri, "application/x-mpegURL", contentId, System.currentTimeMillis());
                } catch (IOException error) { ExtractorDownloader.remainingMillis(); }
            }
        }
        throw new IOException(CastSourcePolicy.UNAVAILABLE);
    }
    private YouTubeCastResolver() {}
}
