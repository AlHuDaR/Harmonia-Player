package com.alhudar.harmonia.cast;
import org.junit.Test;
import static org.junit.Assert.*;
public class CastMediaPolicyTest {
    @Test public void acceptsOnlyPublicHttpsMp4AndHls() {
        assertTrue(CastMediaPolicy.supports("https://media.example.com/movie.mp4", "video/mp4"));
        assertTrue(CastMediaPolicy.supports("https://media.example.com/live.m3u8", "application/x-mpegURL"));
        assertFalse(CastMediaPolicy.supports("https://media.example.com/a.mp4", "application/dash+xml"));
    }
    @Test public void refusesPrivateLocalSignedOrUnsupportedUrls() {
        for (String url : new String[]{"file:///tmp/auto.mpd", "http://media.example.com/a.mp4", "https://localhost/a.mp4", "https://127.0.0.1/a.mp4", "https://192.168.1.4/a.mp4", "https://[::1]/a.mp4", "https://tv.local/a.mp4", "https://x.internal/a.mp4", "https://user:password@media.example.com/a.mp4", "https://media.example.com/a.mp4?token=secret", "https://media.example.com/a.mp4?", "https://media.example.com/a.mp4#x", "https://media.example.com:444/a.mp4", "https://media.example.com/a.mpd", "https://media.example.com/a.webm"}) assertFalse(url, CastMediaPolicy.supports(url, "video/mp4"));
    }
}
