package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
public class SharedUriGrantsTest {
    @Test public void retainsSeparatelyRepeatedSharesUntilEachIsReleased() {
        SharedUriGrants grants=new SharedUriGrants(2);grants.offer("content://p/a");grants.offer("content://p/a");
        grants.release("content://p/a");assertTrue(grants.contains("content://p/a"));
        grants.release("content://p/a");assertFalse(grants.contains("content://p/a"));
    }
    @Test public void fullBacklogAcceptsNewSharesInsteadOfPermanentlyFilling() {
        SharedUriGrants grants=new SharedUriGrants(2);grants.offer("old");grants.offer("recent");grants.offer("new");
        assertFalse(grants.contains("old"));assertTrue(grants.contains("recent"));assertTrue(grants.contains("new"));
    }
    @Test public void newDeliveryRefreshesRetentionWithoutAuthorizingUnknownUris() {
        SharedUriGrants grants=new SharedUriGrants(2);grants.offer("a");grants.offer("b");grants.offer("a");grants.offer("c");
        assertTrue(grants.contains("a"));assertFalse(grants.contains("b"));
        grants.release("unknown");assertFalse(grants.contains("unknown"));
    }
}
