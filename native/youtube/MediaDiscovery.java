// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.*;
import java.util.*;
import java.util.regex.*;
import okhttp3.*;
import org.json.*;

/** Bounded public metadata/files. No script execution, cookies or account login. */
final class MediaDiscovery {
    static JSONObject format(String id,String uri,String kind,String extension,boolean downloadable) throws Exception {
        SafeHttp.url(uri);
        return new JSONObject().put("id",id).put("uri",uri).put("kind",kind)
            .put("extension",extension).put("downloadable",downloadable).put("label",id);
    }
    static JSONObject discover(String input) throws Exception {
        HttpUrl url=SafeHttp.url(input);String host=url.host();
        if(host.matches("(?:www\\.|m\\.)?instagram\\.com")) {
            if(url.encodedPath().matches("/share/(?:reel|p)/[A-Za-z0-9_-]+/?")) {
                try(Response response=SafeHttp.open(input,null)) {
                    if(!response.isSuccessful())throw new SafeHttp.HttpFailure(response.code());
                    HttpUrl resolved=response.request().url();
                    if(!resolved.host().matches("(?:www\\.|m\\.)?instagram\\.com"))throw new IOException("Instagram share did not resolve to an Instagram post. Open in Browser.");
                    return InstagramEmbed.discover(resolved.toString());
                }
            }
            return InstagramEmbed.discover(input);
        }
        if(host.equals("fb.watch") || host.matches("(?:www\\.|m\\.|web\\.)?facebook\\.com") || host.matches("(?:www\\.)?snapchat\\.com"))return PublicSocialEmbed.discover(input);
        if(host.equals("vimeo.com") || host.equals("www.vimeo.com") || host.equals("player.vimeo.com")) {
            Matcher m=Pattern.compile("^/(?:video/)?([0-9]+)/*$").matcher(url.encodedPath());
            if(!m.matches()) throw new IOException("Only public Vimeo video links are supported; private/unlisted hashes are not used.");
            String id=m.group(1);
            JSONObject config=new JSONObject(SafeHttp.text("https://player.vimeo.com/video/"+id+"/config",2*1024*1024));
            return vimeo(config,input);
        }
        if(host.equals("reddit.com") || host.equals("www.reddit.com") || host.equals("old.reddit.com")) {
            Matcher m=Pattern.compile("/(?:comments)/([a-z0-9]+)(?:/|$)").matcher(url.encodedPath());
            if(!m.find()) throw new IOException("Use a public Reddit post URL; short links and external embeds are not extracted.");
            String id=m.group(1);
            return reddit(new JSONArray(SafeHttp.text("https://www.reddit.com/comments/"+id+".json?raw_json=1",2*1024*1024)),input);
        }
        return probe(input);
    }
    static JSONObject vimeo(JSONObject config,String page) throws Exception {
        JSONObject video=config.optJSONObject("video"), request=config.optJSONObject("request");
        if(video==null || request==null) throw new IOException("Vimeo did not expose public media formats.");
        JSONObject files=request.optJSONObject("files");
        if(files==null) throw new IOException("Vimeo embedding/download access is unavailable.");
        JSONArray formats=new JSONArray(), progressive=files.optJSONArray("progressive");
        if(progressive!=null) for(int i=0;i<Math.min(8,progressive.length());i++) {
            JSONObject f=progressive.getJSONObject(i);String u=f.optString("url");
            if(!u.isEmpty()) formats.put(format("mp4-"+f.optString("quality",Integer.toString(i)),u,"video","mp4",true));
        }
        JSONObject hls=files.optJSONObject("hls");
        try { if(hls!=null) {
            JSONObject cdns=hls.optJSONObject("cdns");String key=hls.optString("default_cdn");
            JSONObject cdn=cdns==null?null:cdns.optJSONObject(key);
            if(cdn!=null && !cdn.optString("url").isEmpty()) {
                String master=cdn.getString("url"), body=clearPlaylist(master);
                // Public clear HLS only. Encrypted variants are rejected, never decrypted.
                String first=null;
                for(String line:body.split("\\r?\\n")) if(!line.isEmpty() && !line.startsWith("#")) { first=line.trim();break; }
                if(first!=null) clearPlaylist(SafeHttp.url(master).resolve(first).toString());
                else clearBody(body);
                formats.put(format("hls-auto",master,"video","m3u8",false));
                Matcher audio=Pattern.compile("#EXT-X-MEDIA:TYPE=AUDIO[^\\r\\n]*URI=\"([^\"]+)\"").matcher(body);
                Set<String> seen=new HashSet<>();
                while(audio.find() && seen.size()<4) {
                    String u=SafeHttp.url(master).resolve(audio.group(1)).toString();
                    if(seen.add(u)) {clearPlaylist(u);formats.put(format("hls-audio-"+seen.size(),u,"audio","m3u8",false));}
                }
            }
        }
        } catch(IOException rejectedHls) { if(formats.length()==0)throw rejectedHls; }
        if(formats.length()==0) throw new IOException("Vimeo returned no public compatible formats. DRM or embedding restrictions may apply.");
        return new JSONObject().put("title",video.optString("title","Vimeo video")).put("formats",formats).put("page",page);
    }
    static void clearBody(String body) throws IOException {
        if(!body.trim().startsWith("#EXTM3U")) throw new IOException("Source did not return an HLS playlist.");
        if(body.contains("#EXT-X-KEY:") || body.contains("#EXT-X-SESSION-KEY:")) throw new IOException("Encrypted/DRM playlists are not supported.");
    }
    static String clearPlaylist(String url) throws IOException {
        String body=SafeHttp.text(url,512*1024);clearBody(body);
        Set<String> children=new LinkedHashSet<>();
        if(body.contains("#EXT-X-STREAM-INF:")) for(String line:body.split("\\r?\\n"))
            if(!line.isEmpty()&&!line.startsWith("#"))children.add(line.trim());
        Matcher audio=Pattern.compile("#EXT-X-MEDIA:TYPE=AUDIO[^\\r\\n]*URI=\"([^\"]+)\"").matcher(body);
        while(audio.find())children.add(audio.group(1));
        if(children.size()>12)throw new IOException("Too many playlist variants to verify safely.");
        for(String child:children) {
            HttpUrl next=SafeHttp.url(url).resolve(child);
            if(next==null)throw new IOException("Invalid playlist variant.");
            String variant=SafeHttp.text(next.toString(),512*1024);clearBody(variant);
            if(variant.contains("#EXT-X-STREAM-INF:"))throw new IOException("Nested adaptive playlists are not supported.");
        }
        return body;
    }
    static JSONObject reddit(JSONArray listing,String page) throws Exception {
        JSONObject data=listing.getJSONObject(0).getJSONObject("data").getJSONArray("children").getJSONObject(0).getJSONObject("data");
        if(data.optBoolean("over_18") || data.optBoolean("quarantine") || data.optBoolean("is_video",false)==false)
            throw new IOException("This Reddit post is restricted or does not expose a native public video. External embeds are not extracted.");
        JSONObject media=data.optJSONObject("secure_media");if(media==null)media=data.optJSONObject("media");
        JSONObject rv=media==null?null:media.optJSONObject("reddit_video");
        if(rv==null) throw new IOException("Reddit did not expose public native media.");
        JSONArray formats=new JSONArray();String fallback=rv.optString("fallback_url");
        if(!fallback.isEmpty() && rv.optBoolean("is_gif")) formats.put(format("mp4-silent",fallback,"video","mp4",true));
        // Reddit fallback files often contain NO AUDIO: do not advertise them as complete videos.
        String hls=rv.optString("hls_url");
        if(!hls.isEmpty()) {clearPlaylist(hls);formats.put(format("hls-auto",hls,"video","m3u8",false));}
        if(formats.length()==0) throw new IOException("Reddit exposed no compatible complete media. Video-only fallback is not offered as audio.");
        return new JSONObject().put("title",data.optString("title","Reddit video")).put("page",page).put("formats",formats);
    }
    static JSONObject probe(String url) throws Exception {
        JSONArray formats=new JSONArray();
        try(Response r=SafeHttp.open(url,"bytes=0-65535")) {
            if(r.code()!=200 && r.code()!=206) throw new SafeHttp.HttpFailure(r.code());
            String type=r.header("Content-Type","").toLowerCase(Locale.ROOT);
            if(r.body()==null) throw new IOException("Empty media response.");
            byte[] bytes=new byte[65536];int count=0,n;
            try(InputStream in=r.body().byteStream()) {while(count<bytes.length && (n=in.read(bytes,count,bytes.length-count))!=-1)count+=n;}
            String text=new String(bytes,0,Math.min(count,64),"UTF-8").trim();
            if(type.contains("mpegurl") || text.startsWith("#EXTM3U")) {
                clearPlaylist(url);
                formats.put(format("hls",url,"video","m3u8",false));
            } else {
                if(!(type.startsWith("audio/") || type.startsWith("video/") || type.startsWith("application/octet-stream")) || count<4 || text.startsWith("<") || text.startsWith("{"))
                    throw new IOException("The URL returned a page or unrecognized data, not an accessible media file.");
                boolean known=(count>8 && bytes[4]=='f' && bytes[5]=='t' && bytes[6]=='y' && bytes[7]=='p')
                    || (bytes[0]=='I' && bytes[1]=='D' && bytes[2]=='3') || ((bytes[0]&255)==255 && (bytes[1]&224)==224)
                    || (bytes[0]=='O' && bytes[1]=='g' && bytes[2]=='g' && bytes[3]=='S')
                    || (bytes[0]=='f' && bytes[1]=='L' && bytes[2]=='a' && bytes[3]=='C')
                    || (bytes[0]=='R' && bytes[1]=='I' && bytes[2]=='F' && bytes[3]=='F')
                    || ((bytes[0]&255)==0x1a && (bytes[1]&255)==0x45 && (bytes[2]&255)==0xdf && (bytes[3]&255)==0xa3);
                if(!known) throw new IOException("The response does not have a recognized media container signature.");
                if(type.startsWith("application/octet-stream")) {
                    boolean audio=(bytes[0]=='I' && bytes[1]=='D' && bytes[2]=='3') || ((bytes[0]&255)==255 && (bytes[1]&224)==224)
                        || SafeHttp.url(url).encodedPath().matches("(?i).*\\.(mp3|m4a|wav|ogg|flac|aac)$");
                    String path=SafeHttp.url(url).encodedPath().toLowerCase(Locale.ROOT);
                    type=audio?(path.endsWith(".wav")?"audio/wav":path.endsWith(".ogg")?"audio/ogg":path.endsWith(".flac")?"audio/flac":path.endsWith(".m4a")?"audio/mp4":"audio/mpeg"):(path.endsWith(".webm")?"video/webm":"video/mp4");
                }
                String ext=type.contains("mpeg")?"mp3":type.contains("webm")?"webm":type.contains("ogg")?"ogg":type.contains("flac")?"flac":type.contains("wav")?"wav":type.startsWith("audio/")?"m4a":"mp4";
                formats.put(format("original",url,type.startsWith("audio/")?"audio":"video",ext,true));
            }
        }
        return new JSONObject().put("title","Direct media").put("page",url).put("formats",formats);
    }
}
