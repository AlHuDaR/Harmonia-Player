package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
import java.io.*;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;
public class AdaptiveDashTest {
    private AdaptiveDash.Representation rep(String id,int height,String codec) {
        return new AdaptiveDash.Representation(id,"https://cdn.example.com/video?x=1&signature=abc",codec,Math.max(128000,height*3000),height==0?0:height*16/9,height,0,700,701,1000);
    }
    @Test public void groupsVideoLadderForRealAdaptiveSelectionAndRetainsAudio() throws Exception {
        String xml=AdaptiveDash.manifest(10000,Arrays.asList(rep("360",360,"avc1.4d401e"),rep("720",720,"avc1.4d401f")),rep("audio",0,"mp4a.40.2"));
        Document doc=DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes("UTF-8")));
        NodeList sets=doc.getElementsByTagName("AdaptationSet");assertEquals(2,sets.getLength());
        assertEquals(2,((Element)sets.item(0)).getElementsByTagName("Representation").getLength());
        assertEquals(1,((Element)sets.item(1)).getElementsByTagName("Representation").getLength());
        assertTrue(doc.getElementsByTagName("BaseURL").item(0).getTextContent().contains("&signature=abc"));
    }
    @Test public void excludesUnsupportedCodecsAndHugeAutomaticResolutions() {
        assertFalse(AdaptiveDash.eligible(rep("av1",720,"av01.0.08M.08"),true));
        assertFalse(AdaptiveDash.eligible(rep("4k",2160,"avc1.640032"),true));
        assertTrue(AdaptiveDash.eligible(rep("1080",1080,"avc1.640028"),true));
    }
    @Test public void neverCallsSingleQualityOrUnindexedStreamsAdaptive() throws Exception {
        try{AdaptiveDash.manifest(10000,Arrays.asList(rep("one",720,"avc1.4d401f")),rep("audio",0,"mp4a.40.2"));fail();}catch(IOException expected){}
        AdaptiveDash.Representation bad=new AdaptiveDash.Representation("x","https://cdn.example.com/v","avc1",1000,640,360,-1,-1,-1,-1);
        assertFalse(AdaptiveDash.eligible(bad,true));
    }
}
