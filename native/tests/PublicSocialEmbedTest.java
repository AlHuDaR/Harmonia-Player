package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
public class PublicSocialEmbedTest {
    @Test public void parsesPublicMetadataWithoutExecutingScripts() throws Exception {
        String html="<script>throw 'never execute'</script><meta content='A &amp; B' property='og:title'><meta property=\"og:video:secure_url\" content=\"https://cdn.example.com/v.mp4?a=1&amp;b=2\">";
        assertEquals("A & B",PublicSocialEmbed.parse(html).getString("title"));
        assertEquals("https://cdn.example.com/v.mp4?a=1&b=2",PublicSocialEmbed.parse(html).getString("uri"));
    }
    @Test public void ignoresMetadataStringsInScriptsCommentsAndTemplates() throws Exception {
        for(String html:new String[]{"<script><meta property='og:video' content='https://cdn.example.com/a.mp4'></script>",
            "<!-- <meta property='og:video' content='https://cdn.example.com/a.mp4'> -->",
            "<template><meta property='og:video' content='https://cdn.example.com/a.mp4'></template>"}) {
            try{PublicSocialEmbed.parse(html);fail("accepted inactive metadata");}catch(java.io.IOException expected){}
        }
    }
    @Test public void prefersExplicitSecureVideoOverPlayerMetadata() throws Exception {
        String html="<meta property='og:video' content='http://player.example.com/embed'><meta property='og:video:secure_url' content='https://cdn.example.com/a.mp4'>";
        assertEquals("https://cdn.example.com/a.mp4",PublicSocialEmbed.parse(html).getString("uri"));
    }
    @Test public void recognizesOnlyVideoPaths() throws Exception {
        assertTrue(PublicSocialEmbed.supported(SafeHttp.url("https://www.snapchat.com/spotlight/Abc_123")));
        assertTrue(PublicSocialEmbed.supported(SafeHttp.url("https://www.facebook.com/watch/?v=123")));
        assertFalse(PublicSocialEmbed.supported(SafeHttp.url("https://www.snapchat.com/add/person")));
        assertFalse(PublicSocialEmbed.supported(SafeHttp.url("https://facebook.com.evil.example/reel/123")));
    }
    @Test public void rejectsMissingUnsafeAndOversizedMetadata() throws Exception {
        for(String html:new String[]{"<html>Login required</html>","<meta property='og:video' content='file:///private'>",new String(new char[2*1024*1024+1])}) {
            try {PublicSocialEmbed.parse(html);fail("accepted invalid metadata");}catch(java.io.IOException expected){}
        }
    }
}
