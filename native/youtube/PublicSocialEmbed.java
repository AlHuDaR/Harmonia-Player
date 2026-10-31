// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.IOException;
import java.util.*;
import java.util.regex.*;
import okhttp3.HttpUrl;
import org.json.*;

/** Only explicit public Open Graph video metadata; no scripts, cookies or private APIs. */
final class PublicSocialEmbed {
    static boolean supported(HttpUrl u) {
        String h=u.host(), p=u.encodedPath();
        if(h.matches("(?:www\\.)?snapchat\\.com"))
            return p.matches("/spotlight/[A-Za-z0-9_-]{5,256}/?");
        if(h.equals("fb.watch"))return p.matches("/[A-Za-z0-9_-]+/?");
        return h.matches("(?:www\\.|m\\.|web\\.)?facebook\\.com") &&
            (p.matches("/reel/[0-9]+/?") || p.matches("/(?:[^/]+/)?videos/(?:[^/]+/)?[0-9]+/?") ||
             ((p.equals("/watch/") || p.equals("/watch")) && u.queryParameter("v")!=null && u.queryParameter("v").matches("[0-9]+")));
    }
    private static String decode(String s) {
        return s.replace("&amp;","&").replace("&#38;","&").replace("&quot;","\"")
            .replace("&#39;","'").replace("&lt;","<").replace("&gt;",">");
    }
    private static final String[] RAW_TAGS={"script","style","template","textarea","title","noscript"};
    private static String metadataMarkup(String html) {
        StringBuilder visible=new StringBuilder();
        for(int i=0;i<html.length();) {
            if(html.charAt(i)!='<') {visible.append(html.charAt(i++));continue;}
            if(html.startsWith("<!--",i)) {
                int end=html.indexOf("-->",i+4);if(end<0)break;i=end+3;continue;
            }
            String raw=null;
            for(String tag:RAW_TAGS) {
                int end=i+tag.length()+1;
                if(html.regionMatches(true,i+1,tag,0,tag.length()) && end<html.length() &&
                    (Character.isWhitespace(html.charAt(end)) || html.charAt(end)=='>' || html.charAt(end)=='/')) {raw=tag;break;}
            }
            if(raw!=null) {
                Matcher close=Pattern.compile("(?i)</"+raw+"\\s*>").matcher(html);
                if(!close.find(i+raw.length()+1))break;i=close.end();
                if(raw.equals("template"))while(close.find())i=close.end();
                continue;
            }
            visible.append(html.charAt(i++));
        }
        return visible.toString();
    }
    static JSONObject parse(String html) throws Exception {
        if(html.length()>2*1024*1024)throw new IOException("Public metadata response is too large.");
        // Parse attributes independently: providers may put content before property.
        Matcher tags=Pattern.compile("(?is)<meta\\b[^>]{0,8192}>").matcher(metadataMarkup(html));
        String title="Public video", media=null;int count=0;
        while(tags.find() && count++<512) {
            Map<String,String> attrs=new HashMap<>();
            Matcher a=Pattern.compile("(?is)([a-z_:]+)\\s*=\\s*([\"'])(.*?)\\2").matcher(tags.group());
            while(a.find())attrs.put(a.group(1).toLowerCase(Locale.ROOT),decode(a.group(3)));
            String key=attrs.get("property"), value=attrs.get("content");
            if(key==null || value==null)continue;
            if(key.equals("og:title")) title=value.replaceAll("\\s+"," ").trim();
            if((media==null || key.equals("og:video:secure_url")) && (key.equals("og:video") || key.equals("og:video:url") || key.equals("og:video:secure_url"))) {
                try {SafeHttp.url(value);media=value;}catch(IOException unsafe) { /* Never fetch unsafe candidates. */ }
            }
        }
        if(media==null)throw new IOException("No public video stream is exposed by this page. It may require login, be restricted or provide browser-only playback. Open in Browser to check.");
        return new JSONObject().put("uri",media).put("title",title.substring(0,Math.min(160,title.length())));
    }
    static JSONObject discover(String page) throws Exception {
        HttpUrl original=SafeHttp.url(page);
        if((original.host().equals("fb.watch") || original.host().matches("(?:www\\.|m\\.|web\\.)?facebook\\.com")) &&
            (original.host().equals("fb.watch") || original.encodedPath().matches("/share/(?:r|v)/[A-Za-z0-9_-]+/?"))) {
            try(okhttp3.Response response=SafeHttp.open(page,null)) {
                if(!response.isSuccessful())throw new SafeHttp.HttpFailure(response.code());
                HttpUrl resolved=response.request().url();
                if(!resolved.host().matches("(?:www\\.|m\\.|web\\.)?facebook\\.com") || !supported(resolved))
                    throw new IOException("Facebook share did not resolve to a supported public video. Open in Browser.");
                page=resolved.toString();
            }
        }
        if(!supported(SafeHttp.url(page)))throw new IOException("Unsupported social link. Use a Facebook video/Reel or Snapchat Spotlight link; open other content in Browser.");
        JSONObject metadata=parse(SafeHttp.text(page,2*1024*1024));
        JSONObject result=MediaDiscovery.probe(metadata.getString("uri"));
        // A player iframe/HTML, adaptive stream or isolated audio is not a downloadable video.
        JSONObject file=result.getJSONArray("formats").getJSONObject(0);
        if(!file.optString("kind").equals("video") || !file.optString("extension").equals("mp4") || !file.optBoolean("downloadable"))
            throw new IOException("The public metadata did not expose a compatible progressive MP4 video. Open in Browser.");
        file.put("id","public-progressive").put("label","MP4");
        return result.put("title",metadata.getString("title")).put("page",page);
    }
}
