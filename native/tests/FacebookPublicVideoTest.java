package com.alhudar.harmonia.youtube;
import java.io.IOException;
import java.util.*;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class FacebookPublicVideoTest {
    final String id="1368738898501065";
    final String share="https://www.facebook.com/share/r/19trbCXy4d/";
    String video(String videoId) {
        return "{\"__typename\":\"Video\",\"id\":\""+videoId+"\",\"videoDeliveryLegacyFields\":{\"id\":\""+videoId+"\",\"browser_native_hd_url\":\"https:\\/\\/cdn.example.com\\/hd.mp4?x=1\\u0026y=2\",\"browser_native_sd_url\":\"https://cdn.example.com/sd.mp4\"}}";
    }
    String page(String json) {return "<meta property='og:title' content='Public Reel'><script type=\"application/json\" data-sjs>{\"require\":["+json+"]}</script>";}
    @Test public void parsesOnlyMatchingStaticJsonAndDecodesSignedUrlEscapes() throws Exception {
        JSONObject parsed=FacebookPublicVideo.parse(page(video("999")+","+video(id)),id);
        JSONArray formats=parsed.getJSONArray("candidates");
        assertEquals(2,formats.length());assertEquals("facebook-hd",formats.getJSONObject(0).getString("id"));
        assertEquals("https://cdn.example.com/hd.mp4?x=1&y=2",formats.getJSONObject(0).getString("uri"));
        assertEquals("Public Reel",parsed.getString("title"));
    }
    @Test public void rejectsUnrelatedAndInactiveMetadataAndExecutableScripts() throws Exception {
        String valid=page(video(id));
        for(String html:new String[]{page(video("999")),"<!--"+valid+"-->","<template>"+valid+"</template>",
            "<textarea>"+valid+"</textarea>",valid.replace("application/json","text/javascript"),valid.replace(" data-sjs","")}) {
            try {FacebookPublicVideo.parse(html,id);fail("accepted unrelated or inactive data");}catch(FacebookPublicVideo.NoStream expected) {}
        }
    }
    @Test public void retainsOpenGraphInterfaceWithoutJson() throws Exception {
        JSONObject parsed=FacebookPublicVideo.parse("<meta property='og:video' content='https://cdn.example.com/old.mp4'>",id);
        assertEquals("public-progressive",parsed.getJSONArray("candidates").getJSONObject(0).getString("id"));
    }
    @Test public void rejectsPrivateProtectedLiveAndUnsafeMetadata() throws Exception {
        for(String field:new String[]{"is_private","is_drm_protected","is_live_streaming"}) {
            String json=video(id).replace("\"__typename\"","\""+field+"\":true,\"__typename\"");
            try {FacebookPublicVideo.parse(page(json),id);fail();}catch(IOException expected) {}
        }
        String unsafe=video(id).replace("https:","http:");
        try {FacebookPublicVideo.parse(page(unsafe),id);fail();}catch(FacebookPublicVideo.NoStream expected) {}
    }
    @Test public void boundsInputAndJsonDepth() throws Exception {
        try {FacebookPublicVideo.parse(new String(new char[2*1024*1024+1]),id);fail();}catch(IOException expected) {}
        String json=video(id);for(int i=0;i<65;i++)json="{\"nested\":"+json+"}";
        try {FacebookPublicVideo.parse(page(json),id);fail();}catch(IOException expected) {}
    }
    @Test public void usesOneIdentityBoundWatchFallbackAndPreservesSharedPage() throws Exception {
        List<String> pages=new ArrayList<>(),probes=new ArrayList<>();
        JSONObject result=FacebookPublicVideo.discover(share,url->{
            pages.add(url);
            if(url.equals(share))return new SafeHttp.Document("https://www.facebook.com/reel/"+id+"/","<html>no stream</html>");
            assertEquals("https://www.facebook.com/watch/?v="+id+"&_rdr",url);
            return new SafeHttp.Document("https://www.facebook.com/person/videos/"+id+"/",page(video(id)));
        },url->{probes.add(url);return new JSONObject().put("formats",new JSONArray().put(MediaDiscovery.format("original",url,"video","mp4",true)));});
        assertEquals(2,pages.size());assertEquals(2,probes.size());
        assertEquals(share,result.getString("page"));assertEquals(2,result.getJSONArray("formats").length());
    }
    @Test public void neverFallsBackAfterAccessDenialOrToAnotherVideo() throws Exception {
        int[] calls={0};
        try {FacebookPublicVideo.discover(share,url->{calls[0]++;throw new SafeHttp.HttpFailure(403);},url->{fail();return null;});fail();}
        catch(SafeHttp.HttpFailure expected) {assertEquals(1,calls[0]);}
        try {FacebookPublicVideo.discover("https://www.facebook.com/reel/"+id+"/",url->
            new SafeHttp.Document("https://www.facebook.com/reel/999/",page(video("999"))),url->{fail();return null;});fail();}
        catch(IOException expected) {assertTrue(expected.getMessage().contains("different video"));}
    }
    @Test public void rejectsHtmlMediaButKeepsAnotherVerifiedQuality() throws Exception {
        JSONObject result=FacebookPublicVideo.discover(share,url->new SafeHttp.Document("https://www.facebook.com/reel/"+id+"/",page(video(id))),url->{
            if(url.contains("hd.mp4"))throw new IOException("HTML instead of media");
            return new JSONObject().put("formats",new JSONArray().put(MediaDiscovery.format("original",url,"video","mp4",true)));
        });
        assertEquals(1,result.getJSONArray("formats").length());
        assertEquals("facebook-sd",result.getJSONArray("formats").getJSONObject(0).getString("id"));
    }
}
