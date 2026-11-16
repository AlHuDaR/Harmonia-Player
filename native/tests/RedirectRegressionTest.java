package com.alhudar.harmonia.youtube;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;
import okhttp3.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class RedirectRegressionTest {
    OkHttpClient client(AtomicInteger calls, String location, int code) {
        return new OkHttpClient.Builder().addInterceptor(chain -> {
            calls.incrementAndGet();
            Response.Builder response=new Response.Builder().request(chain.request())
                .protocol(Protocol.HTTP_1_1).code(code).message("test")
                .body(ResponseBody.create(MediaType.parse("text/plain"), ""));
            if(location!=null)response.header("Location",location);
            return response.build();
        }).build();
    }
    @Test public void stopsRedirectCyclesBeforeRepeatingRequests() throws Exception {
        AtomicInteger calls=new AtomicInteger();
        try { SafeHttp.openWith(client(calls,"/start",302),"https://example.com/start",null,null); fail(); }
        catch(IOException expected) { assertTrue(expected.getMessage().contains("loop")); }
        assertEquals(1,calls.get());
    }
    @Test public void rejectsUnsafeRedirectsBeforeRequestingThem() throws Exception {
        AtomicInteger calls=new AtomicInteger();
        try { SafeHttp.openWith(client(calls,"http://example.com/file",302),"https://example.com/start",null,null); fail(); }
        catch(IOException expected) {}
        assertEquals(1,calls.get());
    }
    @Test public void doesNotTreatNotModifiedAsRedirect() throws Exception {
        AtomicInteger calls=new AtomicInteger();
        try(Response r=SafeHttp.openWith(client(calls,null,304),"https://example.com/start",null,null)) {
            assertEquals(304,r.code());
        }
        assertEquals(1,calls.get());
    }
    @Test public void probeUsesFinalMediaUrlAndRetainsOriginalPageForRetries() throws Exception {
        String original="https://example.com/short", resolved="https://cdn.example.com/media?id=123&signature=keep";
        Response response=new Response.Builder().request(new Request.Builder().url(resolved).build())
            .protocol(Protocol.HTTP_1_1).code(200).message("OK")
            .header("Content-Type","video/mp4")
            .body(ResponseBody.create(MediaType.parse("video/mp4"),new byte[]{0,0,0,12,'f','t','y','p','i','s','o','m'})).build();
        org.json.JSONObject media=MediaDiscovery.probe(original,response);
        assertEquals(original,media.getString("page"));
        assertEquals(resolved,media.getJSONArray("formats").getJSONObject(0).getString("uri"));
    }
    @Test public void extensionlessEndpointsRequireRealMediaResponseBytes() throws Exception {
        String url="https://cdn.example.com/media?token=keep";
        for(boolean html:new boolean[]{false,true}) {
            Response response=new Response.Builder().request(new Request.Builder().url(url).build())
                .protocol(Protocol.HTTP_1_1).code(200).message("OK")
                .header("Content-Type",html?"text/html":"audio/mpeg")
                .body(ResponseBody.create(MediaType.parse(html?"text/html":"audio/mpeg"),
                    html?"<html>not media</html>".getBytes():new byte[]{'I','D','3',4,0,0,0,0,0,0})).build();
            try {
                org.json.JSONObject format=MediaDiscovery.probe(url,response).getJSONArray("formats").getJSONObject(0);
                if(html)fail("accepted HTML");
                assertEquals("audio",format.getString("kind"));
                assertEquals("mp3",format.getString("extension"));
                assertEquals(url,format.getString("uri"));
            } catch(IOException expected) {if(!html)throw expected;}
        }
    }
    @Test public void pageNegotiationUsesPublicHtmlHeadersWithoutChangingMediaRequests() throws Exception {
        OkHttpClient client=new OkHttpClient.Builder().addInterceptor(chain->{
            Request request=chain.request();
            assertEquals("Harmonia/2.0 public-media",request.header("User-Agent"));
            assertNull(request.header("Authorization"));assertNull(request.header("Cookie"));
            if(request.url().encodedPath().equals("/page")) {
                assertTrue(request.header("Accept").contains("text/html"));
                assertEquals("en-us,en;q=0.5",request.header("Accept-Language"));
            } else {assertNull(request.header("Accept"));assertNull(request.header("Accept-Language"));}
            return new Response.Builder().request(request).protocol(Protocol.HTTP_1_1).code(200).message("OK")
                .body(ResponseBody.create(MediaType.parse("text/plain"),"")).build();
        }).build();
        try(Response ignored=SafeHttp.openWith(client,"https://example.com/page",null,null,true)) {}
        try(Response ignored=SafeHttp.openWith(client,"https://example.com/file",null,null)) {}
    }
}
