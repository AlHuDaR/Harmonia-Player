package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.io.IOException;

public class InstagramEmbedTest {
    private JSONObject video() throws Exception {
        return new JSONObject().put("__typename","GraphVideo").put("shortcode","DerYMOFsvXQ")
            .put("is_video",true).put("video_url","https://cdn.example.com/reel.mp4?a=1&b=2")
            .put("edge_media_to_caption",new JSONObject().put("edges",new JSONArray().put(
                new JSONObject().put("node",new JSONObject().put("text","Public \"clip\"\nمرحبا")))));
    }
    private String embed(JSONObject media) throws Exception {
        String context=new JSONObject().put("gql_data",new JSONObject().put("shortcode_media",media)).toString();
        return "<script>requireLazy([],function(){s.handle("+new JSONObject().put("contextJSON",context)+");});</script>";
    }
    private void rejects(String html) throws Exception {
        try{InstagramEmbed.parse(html,"DerYMOFsvXQ");fail("Must not expose a format");}catch(IOException expected){}
    }
    @Test public void acceptsOnlyPostPathsAndDropsTrackingFromIdentity() throws Exception {
        assertEquals("DerYMOFsvXQ",InstagramEmbed.shortcode("https://www.instagram.com/reel/DerYMOFsvXQ/?igsh=tracking"));
        assertEquals("DerYMOFsvXQ",InstagramEmbed.shortcode("https://instagram.com/p/DerYMOFsvXQ/"));
        for(String path:new String[]{"https://instagram.com/user/","https://instagram.com/stories/user/123/","https://instagram.com/share/reel/abc","https://instagram.com.evil.com/reel/DerYMOFsvXQ/"})
            try{InstagramEmbed.shortcode(path);fail();}catch(IOException expected){}
    }
    @Test public void readsEscapedPublicMetadataWithoutExecutingJavascript() throws Exception {
        JSONObject result=InstagramEmbed.parse(embed(video()),"DerYMOFsvXQ");
        assertEquals("https://cdn.example.com/reel.mp4?a=1&b=2",result.getString("uri"));
        assertEquals("Public \"clip\" مرحبا",result.getString("title"));
    }
    @Test public void rejectsLoginAndMissingMediaWithoutCallingThemPrivate() throws Exception {
        try{InstagramEmbed.parse("<html>Log in</html>","DerYMOFsvXQ");fail();}
        catch(IOException e){assertTrue(e.getMessage().contains("did not expose"));assertFalse(e.getMessage().contains("marks the content as private"));}
        rejects(embed(video().put("video_url","")));
    }
    @Test public void rejectsUnrelatedShortcodes() throws Exception {rejects(embed(video().put("shortcode","otherVideo")));}
    @Test public void rejectsPrivateMarkers() throws Exception {
        rejects(embed(video().put("is_private",true)));
        rejects(embed(video().put("owner",new JSONObject().put("is_private",true))));
    }
    @Test public void rejectsPhotosAndCarousels() throws Exception {
        rejects(embed(video().put("is_video",false)));
        rejects(embed(video().put("__typename","GraphSidecar")));
    }
    @Test public void rejectsUnsafeMediaUrls() throws Exception {
        for(String uri:new String[]{"http://cdn.example.com/a.mp4","https://name:password@cdn.example.com/a.mp4","file:///etc/passwd","https://server.internal/a.mp4"})
            rejects(embed(video().put("video_url",uri)));
    }
    @Test public void boundsResponsesAndDoesNotEvaluateExpressions() throws Exception {
        rejects("\"contextJSON\":fetch('https://example.com')");
        rejects(new String(new char[2*1024*1024+1]));
    }
}
