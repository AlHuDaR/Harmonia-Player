// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;
import java.io.IOException;
import java.util.*;

/** A clear, indexed AVC/AAC ladder; Media3 chooses bitrate from measured bandwidth. */
final class AdaptiveDash {
    static final class Representation {
        final String id,url,codec;final int bitrate,width,height;final long initStart,initEnd,indexStart,indexEnd;
        Representation(String id,String url,String codec,int bitrate,int width,int height,long initStart,long initEnd,long indexStart,long indexEnd) {
            this.id=id;this.url=url;this.codec=codec;this.bitrate=bitrate;this.width=width;this.height=height;
            this.initStart=initStart;this.initEnd=initEnd;this.indexStart=indexStart;this.indexEnd=indexEnd;
        }
    }
    static boolean eligible(Representation r,boolean video) {
        return r!=null && r.id!=null && !r.id.isEmpty() && r.url!=null && r.url.startsWith("https://") && r.codec!=null && r.bitrate>0 && r.initStart>=0 && r.initEnd>r.initStart && r.indexStart>=0 && r.indexEnd>r.indexStart &&
            (video?r.codec.startsWith("avc1") && r.width>0 && r.height>0 && r.height<=1080:r.codec.startsWith("mp4a"));
    }
    private static String escape(String s) {return s.replace("&","&amp;").replace("\"","&quot;").replace("<","&lt;").replace(">","&gt;").replace("'","&apos;");}
    private static void append(StringBuilder xml,Representation r,boolean video) throws IOException {
        SafeHttp.url(r.url);
        xml.append("<Representation id=\"").append(escape(r.id)).append("\" bandwidth=\"").append(r.bitrate).append("\" codecs=\"").append(escape(r.codec)).append("\"");
        if(video)xml.append(" width=\"").append(r.width).append("\" height=\"").append(r.height).append("\"");
        xml.append("><BaseURL>").append(escape(r.url)).append("</BaseURL><SegmentBase indexRange=\"").append(r.indexStart).append('-').append(r.indexEnd)
            .append("\"><Initialization range=\"").append(r.initStart).append('-').append(r.initEnd).append("\"/></SegmentBase></Representation>");
    }
    static String manifest(long durationMs,List<Representation> video,Representation audio) throws IOException {
        if(durationMs<=0 || video.size()<2 || video.size()>16 || !eligible(audio,false))throw new IOException("Adaptive formats are unavailable.");
        Set<String> ids=new HashSet<>();
        StringBuilder xml=new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><MPD xmlns=\"urn:mpeg:dash:schema:mpd:2011\" type=\"static\" profiles=\"urn:mpeg:dash:profile:isoff-on-demand:2011\" minBufferTime=\"PT1.5S\" mediaPresentationDuration=\"PT");
        xml.append(durationMs/1000.0).append("S\"><Period start=\"PT0S\"><AdaptationSet contentType=\"video\" mimeType=\"video/mp4\">");
        for(Representation r:video) {if(!eligible(r,true) || !ids.add(r.id))throw new IOException("Incompatible adaptive representation.");append(xml,r,true);}
        xml.append("</AdaptationSet><AdaptationSet contentType=\"audio\" mimeType=\"audio/mp4\">");append(xml,audio,false);
        return xml.append("</AdaptationSet></Period></MPD>").toString();
    }
}
