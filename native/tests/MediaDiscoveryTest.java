package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
public class MediaDiscoveryTest {
  @Test public void parsesPublicVimeoProgressiveFormatsWithoutInventingAudio() throws Exception {
    JSONObject c=new JSONObject("{\"video\":{\"title\":\"Public\"},\"request\":{\"files\":{\"progressive\":[{\"quality\":\"720p\",\"url\":\"https://cdn.example.com/a.mp4\"}]}}}");
    JSONObject media=MediaDiscovery.vimeo(c,"https://vimeo.com/123");
    assertEquals("Public",media.getString("title"));
    assertEquals(1,media.getJSONArray("formats").length());
    JSONObject f=media.getJSONArray("formats").getJSONObject(0);
    assertEquals("video",f.getString("kind"));assertTrue(f.getBoolean("downloadable"));
  }
  @Test public void rejectsMissingAndRestrictedMedia() throws Exception {
    try{MediaDiscovery.vimeo(new JSONObject(),"https://vimeo.com/123");fail();}catch(java.io.IOException expected){}
    JSONArray reddit=new JSONArray("[{\"data\":{\"children\":[{\"data\":{\"over_18\":true,\"is_video\":true}}]}}]");
    try{MediaDiscovery.reddit(reddit,"https://reddit.com/comments/123");fail();}catch(java.io.IOException expected){}
  }
  @Test public void doesNotTreatRedditSilentFallbackAsAudioOrCompleteVideo() throws Exception {
    JSONArray r=new JSONArray("[{\"data\":{\"children\":[{\"data\":{\"is_video\":true,\"secure_media\":{\"reddit_video\":{\"fallback_url\":\"https://v.redd.it/123/DASH_720.mp4\"}}}}]}}]");
    try{MediaDiscovery.reddit(r,"https://reddit.com/comments/123");fail();}catch(java.io.IOException expected){}
  }
}
