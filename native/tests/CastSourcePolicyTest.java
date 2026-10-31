package com.alhudar.harmonia.youtube;
import java.io.IOException;
import java.util.*;
import org.junit.After;
import org.junit.Test;
import static org.junit.Assert.*;

public class CastSourcePolicyTest {
    final long now = System.currentTimeMillis();
    final String expires = Long.toString(now / 1000 + 3600);
    final String mp4 = "https://rr1---sn-test.googlevideo.com/videoplayback?expire=" + expires + "&mime=video%2Fmp4&sig=example";
    final String hls = "https://manifest.googlevideo.com/api/manifest/hls_playlist/expire/" + expires + "/id/example/index.m3u8";
    String variant(int id) { return "https://manifest.googlevideo.com/api/manifest/hls_variant/expire/" + expires + "/itag/" + id + "/index.m3u8"; }
    @After public void clear() { CastSourcePolicy.clearGrants(); }
    @Test public void permitsOnlyFreshCdnUrlsAndMatchingMediaTypes() {
        assertTrue(CastSourcePolicy.supports(mp4, "video/mp4", now));
        assertTrue(CastSourcePolicy.supports(hls, "application/x-mpegURL", now));
        for (String url : Arrays.asList(mp4.replace("https:", "http:"), mp4.replace("rr1---sn-test.googlevideo.com", "googlevideo.com.evil.com"),
                mp4.replace("rr1---sn-test.googlevideo.com", "127.0.0.1"), mp4.replace("https://", "https://user:pass@"),
                mp4.replace("/videoplayback", "/a.mpd"), mp4 + "#fragment", mp4.replace(expires, "1"), mp4.replace("://", "://").replace(".com/", ".com:444/")))
            assertFalse(CastSourcePolicy.supports(url, "video/mp4", now));
        assertFalse(CastSourcePolicy.supports(mp4, "audio/mp4", now));
        assertFalse(CastSourcePolicy.supports(mp4, "application/dash+xml", now));
        assertFalse(CastSourcePolicy.supports(mp4, "video/mp4", now + 3550000));
    }
    @Test public void nativeGrantsBindSourceTypeIdentityAndExpiryAndCanOnlyLoadOnce() throws Exception {
        String id = CastSourcePolicy.contentId("abcdefghijk", "video");
        CastSourcePolicy.Grant grant = CastSourcePolicy.issue(mp4, "video/mp4", id, now);
        assertFalse(CastSourcePolicy.claim(grant.token, mp4 + "&other=1", "video/mp4", id, now));
        assertFalse(CastSourcePolicy.claim(grant.token, mp4, "audio/mp4", id, now));
        assertFalse(CastSourcePolicy.claim(grant.token, mp4, "video/mp4", id + "x", now));
        assertTrue(CastSourcePolicy.claim(grant.token, mp4, "video/mp4", id, now));
        assertFalse(CastSourcePolicy.claim(grant.token, mp4, "video/mp4", id, now));
        CastSourcePolicy.Grant expired = CastSourcePolicy.issue(mp4, "video/mp4", id, now);
        assertFalse(CastSourcePolicy.claim(expired.token, mp4, "video/mp4", id, now + 300001));
    }
    String stream(int height, String codec, String extra, int id) {
        return "#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=" + (height * 16 / 9) + "x" + height + ",CODECS=\"" + codec + "\"" + extra + "\n" + variant(id) + "\n";
    }
    @Test public void hlsKeepsAudioAndSelectsCompatibleResolutionAndFrameRate() throws Exception {
        String body = "#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"external\",URI=\"audio.m3u8\"\n"
                + stream(720, "avc1.4d401f,mp4a.40.2", "", 95)
                + stream(1080, "avc1.640028,mp4a.40.2", "", 96)
                + stream(1080, "avc1.640028,mp4a.40.2", ",AUDIO=\"external\"", 99)
                + stream(720, "avc1.4d401f,mp4a.40.2", ",FRAME-RATE=60", 300)
                + stream(720, "av01.0.08M.08,mp4a.40.2", "", 400);
        assertEquals(Arrays.asList(variant(96), variant(95)), CastSourcePolicy.hlsVariants(body, hls));
    }
    @Test public void hlsRejectsProtectedLocalAndSeparateMediaInsteadOfDroppingAudio() throws Exception {
        String segment = "https://rr1.googlevideo.com/videoplayback/expire/" + expires + "/file/seg.ts";
        String clear = "#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.0,\n" + segment + "\n#EXT-X-ENDLIST\n";
        assertEquals(segment, CastSourcePolicy.firstSegment(clear, variant(95)));
        for (String body : Arrays.asList(clear.replace("#EXTINF:", "#EXT-X-KEY:METHOD=AES-128,URI=\"key\"\n#EXTINF:"),
                clear.replace(segment, "file:///phone/segment.ts"), clear.replace(segment, "https://localhost/segment.ts"),
                clear.replace("#EXTINF:", "#EXT-X-MAP:URI=\"init.mp4\"\n#EXTINF:"))) {
            try { CastSourcePolicy.firstSegment(body, variant(95)); fail(); } catch (IOException expected) {}
        }
    }
    @Test public void probesRejectHtmlAndRequireReceiverCorsForAdaptiveRequests() {
        assertTrue(YouTubeCastResolver.mp4(new byte[]{0,0,0,32,'f','t','y','p','i','s','o','m'}));
        assertFalse(YouTubeCastResolver.mp4("<html>denied</html>".getBytes()));
        assertTrue(YouTubeCastResolver.cors("*"));
        assertTrue(YouTubeCastResolver.cors("https://www.gstatic.com"));
        assertFalse(YouTubeCastResolver.cors("https://www.youtube.com"));
        assertFalse(YouTubeCastResolver.cors(null));
    }
}
