package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
import java.net.InetAddress;
public class SafeHttpTest {
  @Test public void rejectsPrivateAndMetadataAddresses() throws Exception {
    for(String s:new String[]{"127.0.0.1","0.0.0.0","10.0.0.1","172.16.0.1","192.168.1.2","169.254.169.254","100.64.0.1","198.18.0.1","224.0.0.1","::1","fc00::1","fe80::1","2001:db8::1"})assertFalse(s,SafeHttp.publicAddress(InetAddress.getByName(s)));
    assertTrue(SafeHttp.publicAddress(InetAddress.getByName("8.8.8.8")));
    assertTrue(SafeHttp.publicAddress(InetAddress.getByName("2606:4700:4700::1111")));
  }
  @Test public void rejectsCredentialsSchemesPortsAndInternalHosts() throws Exception {
    for(String s:new String[]{"https://example.com/a\nb","https://example.com/a b","https://example.com/a\\b",new String(new char[4097]),"http://example.com/a","file:///tmp/a","https://u:p@example.com/a","https://example.com:8443/a","https://router.home.arpa/a","https://host.internal/a"}) {
      try{SafeHttp.url(s);fail(s);}catch(java.io.IOException expected){}
    }
    assertEquals("example.com",SafeHttp.url("https://example.com/a.mp4").host());
  }
  @Test public void refusesEncryptedOrMalformedPlaylists() throws Exception {
    MediaDiscovery.clearBody("#EXTM3U\n#EXT-X-ENDLIST");
    for(String s:new String[]{"<html>login</html>","#EXTM3U\n#EXT-X-KEY:METHOD=AES-128","#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=SAMPLE-AES"}) {
      try{MediaDiscovery.clearBody(s);fail();}catch(java.io.IOException expected){}
    }
  }
}
