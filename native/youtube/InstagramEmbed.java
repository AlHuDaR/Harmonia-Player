// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.IOException;
import java.util.regex.*;
import okhttp3.HttpUrl;
import org.json.*;

/** Reads only metadata delivered by the public embed page. Never executes its scripts. */
final class InstagramEmbed {
    private static final Pattern PATH=Pattern.compile("^/(reel|p|tv)/([A-Za-z0-9_-]{5,64})/?$");
    private static final Pattern CONTEXT=Pattern.compile("\"contextJSON\"\\s*:\\s*");
    static String shortcode(String page) throws IOException {
        HttpUrl url=SafeHttp.url(page);
        if(!url.host().matches("(?:www\\.|m\\.)?instagram\\.com"))
            throw new IOException("Use an Instagram post or Reel link.");
        Matcher path=PATH.matcher(url.encodedPath());
        if(!path.matches())throw new IOException("Use an Instagram post or Reel link; profiles, Stories and share redirects are not extracted.");
        return path.group(2);
    }
    static JSONObject parse(String html,String code) throws Exception {
        if(html.length()>2*1024*1024)throw new IOException("Instagram embed response is too large.");
        Matcher context=CONTEXT.matcher(html);int attempts=0;
        while(context.find() && attempts++<8) {
            JSONObject media;
            try {
                Object value=new JSONTokener(html.substring(context.end())).nextValue();
                if(!(value instanceof String))continue;
                JSONObject gql=new JSONObject((String)value).optJSONObject("gql_data");
                media=gql==null?null:gql.optJSONObject("shortcode_media");
            } catch(JSONException incompatible) { continue; }
            if(media==null || !code.equals(media.optString("shortcode")))continue;
            JSONObject owner=media.optJSONObject("owner");
            if(media.optBoolean("is_private") || (owner!=null && owner.optBoolean("is_private")))
                throw new IOException("This Instagram embed marks the content as private. It is not accessed.");
            if(!media.optBoolean("is_video") || !"GraphVideo".equals(media.optString("__typename")))
                throw new IOException("This Instagram embed does not expose a single public video. Photos and carousels are not extracted.");
            String uri=media.optString("video_url");
            if(uri.isEmpty())break;
            SafeHttp.url(uri);
            String title="Instagram";
            JSONObject captions=media.optJSONObject("edge_media_to_caption");
            JSONArray edges=captions==null?null:captions.optJSONArray("edges");
            JSONObject first=edges==null||edges.length()==0?null:edges.optJSONObject(0);
            JSONObject node=first==null?null:first.optJSONObject("node");
            if(node!=null) {
                String caption=node.optString("text").replaceAll("\\s+"," ").trim();
                if(!caption.isEmpty())title=caption.substring(0,Math.min(160,caption.length()));
            }
            return new JSONObject().put("uri",uri).put("title",title);
        }
        throw new IOException("Instagram did not expose a public video in this embed. The post may be unavailable, restricted or embedding may be disabled. Open in Browser to check.");
    }
    static JSONObject discover(String page) throws Exception {
        String code=shortcode(page);
        HttpUrl source=SafeHttp.url(page);
        JSONObject media=parse(SafeHttp.text("https://www.instagram.com"+source.encodedPath().replaceAll("/+$","")+"/embed/",2*1024*1024),code);
        // A metadata URL alone is insufficient: verify the actual response and container.
        JSONObject result=MediaDiscovery.probe(media.getString("uri"));
        JSONArray formats=result.getJSONArray("formats");
        JSONObject file=formats.getJSONObject(0);
        if(formats.length()!=1 || !file.getString("kind").equals("video") || !file.optBoolean("downloadable") || !file.getString("extension").equals("mp4"))
            throw new IOException("Instagram did not return a compatible public MP4 file.");
        file.put("id","instagram-progressive").put("label","MP4");
        return result.put("title",media.getString("title")).put("page",page);
    }
}
