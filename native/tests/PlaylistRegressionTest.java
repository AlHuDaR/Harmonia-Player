package com.alhudar.harmonia.youtube;
import java.io.IOException;
import java.util.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class PlaylistRegressionTest {
    @Test public void discoversVariantsAndAudioWithRealLineEndings() throws Exception {
        for (String newline : new String[]{"\n", "\r\n"}) {
            String body = String.join(newline, "#EXTM3U",
                "#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"audio\",URI=\"audio.m3u8\"",
                "#EXT-X-STREAM-INF:BANDWIDTH=1000000", "720.m3u8",
                "#EXT-X-STREAM-INF:BANDWIDTH=2000000", "1080.m3u8", "");
            assertEquals(new LinkedHashSet<>(Arrays.asList("720.m3u8", "1080.m3u8", "audio.m3u8")),
                MediaDiscovery.playlistChildren(body));
        }
    }
    @Test public void rejectsTooManyVariantsAndEncryptedPlaylists() throws Exception {
        StringBuilder body = new StringBuilder("#EXTM3U\n");
        for(int i=0;i<13;i++) body.append("#EXT-X-STREAM-INF:BANDWIDTH=1\n").append(i).append(".m3u8\n");
        for(String input : Arrays.asList(body.toString(), "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key\"\n")) {
            try { MediaDiscovery.playlistChildren(input); fail("accepted unverified playlist"); }
            catch(IOException expected) {}
        }
    }
    @Test public void castRejectsEncryptionOnLaterLines() throws Exception {
        String base="https://manifest.googlevideo.com/api/manifest/hls_variant/expire/1999999999/index.m3u8";
        String body="#EXTM3U\r\n#EXT-X-KEY:METHOD=AES-128,URI=\"key\"\r\n#EXTINF:6,\r\nhttps://rr1.googlevideo.com/segment.ts\r\n";
        try { CastSourcePolicy.firstSegment(body,base); fail("accepted encryption"); }
        catch(IOException expected) {}
    }
    @Test public void castSelectsVariantAndSegmentWithRealLineEndings() throws Exception {
        long expiry=System.currentTimeMillis()/1000+3600;
        String base="https://manifest.googlevideo.com/api/manifest/hls_playlist/expire/"+expiry+"/index.m3u8";
        String variant=base.replace("hls_playlist","hls_variant");
        for(String nl:new String[]{"\n","\r\n"}) {
            String master="#EXTM3U"+nl+"#EXT-X-STREAM-INF:RESOLUTION=1280x720,CODECS=\"avc1.4d401f,mp4a.40.2\""+nl+variant+nl;
            assertEquals(Arrays.asList(variant),CastSourcePolicy.hlsVariants(master,base));
            String segment="https://rr1.googlevideo.com/segment.ts";
            assertEquals(segment,CastSourcePolicy.firstSegment("#EXTM3U"+nl+"#EXTINF:6,"+nl+segment+nl,variant));
        }
    }
    @Test public void relativeVariantsUseRedirectedManifestDirectoryAndRejectUnsafeSchemes() throws Exception {
        String finalManifest="https://cdn.example.com/region/master/index.m3u8?token=one";
        assertEquals("https://cdn.example.com/region/master/video/720.m3u8",
            MediaDiscovery.playlistChild(finalManifest,"video/720.m3u8").toString());
        assertEquals("https://cdn.example.com/region/audio.m3u8?token=two",
            MediaDiscovery.playlistChild(finalManifest,"../audio.m3u8?token=two").toString());
        try { MediaDiscovery.playlistChild(finalManifest,"http://cdn.example.com/clear.m3u8"); fail(); }
        catch(IOException expected) {}
    }
    @Test public void redirectedMasterVerifiesEachRelativeChildExactlyOnce() throws Exception {
        String original="https://example.com/short.m3u8", redirected="https://cdn.example.com/path/master.m3u8";
        List<String> requests=new ArrayList<>();
        SafeHttp.Document result=MediaDiscovery.loadPlaylist(original,(url,limit) -> {
            requests.add(url);
            if(url.equals(original))return new SafeHttp.Document(redirected,
                "#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,URI=\"audio.m3u8\"\n#EXT-X-STREAM-INF:BANDWIDTH=100\nvideo.m3u8\n");
            if(!url.equals("https://cdn.example.com/path/video.m3u8") &&
               !url.equals("https://cdn.example.com/path/audio.m3u8"))throw new IOException("wrong redirect base");
            return new SafeHttp.Document(url,"#EXTM3U\n#EXTINF:6,\nsegment.ts\n");
        });
        assertEquals(redirected,result.url);
        assertEquals(Arrays.asList(original,"https://cdn.example.com/path/video.m3u8",
            "https://cdn.example.com/path/audio.m3u8"),requests);
    }
}
