package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
public class IntentInboxTest {
  @Test public void retainsLaunchBeforeWarmSharesAndAllowsRepeatedLinks() {
    IntentInbox box=new IntentInbox();
    box.offer("https://instagram.com/reel/123","cold");
    box.offer("https://facebook.com/reel/123","warm");
    box.offer("https://instagram.com/reel/123","repeat");
    assertEquals("cold",box.poll().token);assertEquals("warm",box.poll().token);assertEquals("repeat",box.poll().token);assertNull(box.poll());
  }
  @Test public void acknowledgmentRemovesEventFromPendingDelivery() {
    IntentInbox box=new IntentInbox();box.offer("https://example.com/a.mp4","event");box.acknowledge("event");assertNull(box.poll());
  }
  @Test public void boundsBacklogAndRejectsOversizedOrMissingText() {
    IntentInbox box=new IntentInbox();assertNull(box.offer(null,"null"));assertNull(box.offer(new String(new char[4097]),"long"));
    for(int i=0;i<40;i++)box.offer("link",""+i);
    assertEquals("8",box.poll().token);
    for(int i=9;i<40;i++)assertEquals(""+i,box.poll().token);assertNull(box.poll());
  }
}
