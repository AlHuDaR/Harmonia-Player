// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.IOException;
import java.util.*;
import java.util.regex.*;
import okhttp3.HttpUrl;
import org.json.*;

/** Reads static public page JSON for the requested video only. Never executes scripts. */
final class FacebookPublicVideo {
    private static final Pattern SCRIPT=Pattern.compile("(?is)<script\\b([^>]{0,8192})>(.*?)</script\\s*>");
    private static final Pattern JSON_TYPE=Pattern.compile("(?i)\\btype\\s*=\\s*([\"'])application/json\\1");
    private static final Pattern DATA=Pattern.compile("(?i)(?:^|\\s)data-sjs(?:\\s|=|$)");
    static String videoId(String page) throws IOException {
        HttpUrl url=SafeHttp.url(page);
        if(!url.host().matches("(?:www\\.|m\\.|web\\.)?facebook\\.com") || !PublicSocialEmbed.supported(url))
            throw new IOException("Facebook link did not resolve to a supported video or Reel. Open in Browser.");
        if(url.encodedPath().matches("/watch/?"))return url.queryParameter("v");
        Matcher id=Pattern.compile("/([0-9]+)/?$").matcher(url.encodedPath());
        if(!id.find())throw new IOException("Facebook video identity is unavailable.");
        return id.group(1);
    }
    static JSONObject parse(String html,String expectedId) throws Exception {
        if(html.length()>2*1024*1024 || !expectedId.matches("[0-9]{1,32}"))throw new IOException("Invalid or oversized Facebook video metadata.");
        JSONObject metadata=PublicSocialEmbed.metadata(html);
        // Retain the working Open Graph interface when it exists.
        if(metadata.has("uri"))return metadata.put("candidates",new JSONArray().put(new JSONObject()
            .put("id","public-progressive").put("label","MP4").put("uri",metadata.getString("uri"))));
        Map<String,String> streams=new LinkedHashMap<>();int[] budget={30000};
        Matcher scripts=SCRIPT.matcher(PublicSocialEmbed.publicScriptMarkup(html));int count=0;
        while(scripts.find() && count++<128) {
            if(!JSON_TYPE.matcher(scripts.group(1)).find() || !DATA.matcher(scripts.group(1)).find())continue;
            String json=scripts.group(2);
            if(json.length()>512*1024)continue;
            checkDepth(json);
            try { visit(new JSONObject(json),expectedId,streams,budget,0); }
            catch(JSONException malformed) { /* An unrelated/incompatible public JSON block is not a stream. */ }
        }
        JSONArray candidates=new JSONArray();
        for(String quality:new String[]{"hd","sd"})if(streams.containsKey(quality)) {
            String uri=streams.get(quality);SafeHttp.url(uri);
            candidates.put(new JSONObject().put("id","facebook-"+quality).put("label",quality.toUpperCase(Locale.ROOT)+" MP4").put("uri",uri));
        }
        if(candidates.length()==0)throw new NoStream("Facebook did not provide a supported public stream for this video. It may still play in a browser. Open in Browser to check.");
        return metadata.put("candidates",candidates);
    }
    private static void checkDepth(String json) throws IOException {
        int depth=0;boolean quoted=false,escape=false;
        for(int i=0;i<json.length();i++) {
            char c=json.charAt(i);
            if(quoted) {if(escape)escape=false;else if(c=='\\')escape=true;else if(c=='"')quoted=false;}
            else if(c=='"')quoted=true;
            else if(c=='{' || c=='[') {if(++depth>64)throw new IOException("Facebook metadata is too deeply nested.");}
            else if(c=='}' || c==']')depth--;
        }
    }
    private static void visit(Object value,String id,Map<String,String> streams,int[] budget,int depth) throws Exception {
        if(--budget[0]<0 || depth>64)throw new IOException("Facebook metadata exceeds the parsing limit.");
        if(value instanceof JSONObject) {
            JSONObject object=(JSONObject)value;
            if("Video".equals(object.optString("__typename")) && id.equals(object.optString("id"))) {
                if(object.optBoolean("is_private") || object.optBoolean("is_drm_protected"))
                    throw new IOException("This Facebook video marks its media as private or protected. It is not accessed.");
                if(object.optBoolean("is_live_streaming"))throw new IOException("Live Facebook streams are not supported by this public video adapter.");
                JSONObject legacy=object.optJSONObject("videoDeliveryLegacyFields");
                if(legacy!=null && (!legacy.has("id") || id.equals(legacy.optString("id")))) {
                    Set<String> seen=new HashSet<>(streams.values());
                    for(String quality:new String[]{"hd","sd"}) {
                        String uri=legacy.optString("browser_native_"+quality+"_url");
                        if(!uri.isEmpty() && !streams.containsKey(quality) && seen.add(uri)) {
                            try {SafeHttp.url(uri);streams.put(quality,uri);}catch(IOException unsafe) { /* Never fetch unsafe metadata. */ }
                        }
                    }
                }
            }
            for(Iterator<String> keys=object.keys();keys.hasNext();)visit(object.get(keys.next()),id,streams,budget,depth+1);
        } else if(value instanceof JSONArray) {
            JSONArray array=(JSONArray)value;
            for(int i=0;i<array.length();i++)visit(array.get(i),id,streams,budget,depth+1);
        }
    }
    static final class NoStream extends IOException { NoStream(String message) {super(message);} }
    interface PageReader { SafeHttp.Document read(String url) throws Exception; }
    interface Probe { JSONObject read(String url) throws Exception; }
    static JSONObject discover(String input) throws Exception {
        return discover(input,url->SafeHttp.page(url,2*1024*1024),MediaDiscovery::probe);
    }
    static JSONObject discover(String input,PageReader reader,Probe probe) throws Exception {
        HttpUrl original=SafeHttp.url(input);
        if(!PublicSocialEmbed.supported(original) && !(original.host().matches("(?:www\\.|m\\.|web\\.)?facebook\\.com") &&
            original.encodedPath().matches("/share/(?:r|v)/[A-Za-z0-9_-]+/?")))
            throw new IOException("Use a Facebook video, Reel or shared video link.");
        String knownId=original.host().equals("fb.watch") || original.encodedPath().startsWith("/share/")?null:videoId(input);
        SafeHttp.Document document=reader.read(input);
        String id=videoId(document.url);
        if(knownId!=null && !knownId.equals(id))throw new IOException("Facebook redirected to a different video.");
        JSONObject metadata;
        try { metadata=parse(document.body,id); }
        catch(NoStream absent) {
            // Reels can omit playback JSON. The public watch page exposes the same video identity.
            String watch="https://www.facebook.com/watch/?v="+id+"&_rdr";
            if(watch.equals(input))throw absent;
            SafeHttp.Document fallback=reader.read(watch);
            if(!id.equals(videoId(fallback.url)))throw new IOException("Facebook redirected to a different video.");
            metadata=parse(fallback.body,id);
        }
        JSONArray formats=new JSONArray(),candidates=metadata.getJSONArray("candidates");Exception failure=null;
        for(int i=0;i<candidates.length();i++) {
            JSONObject candidate=candidates.getJSONObject(i);
            try {
                JSONObject format=probe.read(candidate.getString("uri")).getJSONArray("formats").getJSONObject(0);
                if(!"video".equals(format.optString("kind")) || !"mp4".equals(format.optString("extension")) || !format.optBoolean("downloadable"))
                    throw new IOException("Facebook metadata did not return a compatible progressive MP4 video.");
                formats.put(format.put("id",candidate.getString("id")).put("label",candidate.getString("label")));
            } catch(Exception rejected) {failure=rejected;}
        }
        if(formats.length()==0) {if(failure!=null)throw failure;throw new IOException("No verified Facebook media format is available.");}
        return new JSONObject().put("page",input).put("title",metadata.getString("title")).put("formats",formats);
    }
}
