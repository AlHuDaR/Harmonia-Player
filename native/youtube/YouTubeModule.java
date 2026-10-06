// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import android.net.Uri;
import android.util.Xml;
import com.facebook.react.bridge.*;
import java.io.File;
import java.io.FileOutputStream;
import java.util.*;
import java.util.concurrent.*;
import org.schabi.newpipe.extractor.*;
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException;
import org.schabi.newpipe.extractor.localization.Localization;
import org.schabi.newpipe.extractor.search.SearchExtractor;
import org.schabi.newpipe.extractor.services.youtube.ItagItem;
import org.schabi.newpipe.extractor.stream.*;
import org.xmlpull.v1.XmlSerializer;

public final class YouTubeModule extends ReactContextBaseJavaModule {
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    // Page objects can contain POST data/cookies; keep them native rather than exposing them to JS.
    private final Map<String, SearchPage> pages = Collections.synchronizedMap(new LinkedHashMap<>());
    private static boolean initialized;
    private static final String NS = "urn:mpeg:dash:schema:mpd:2011";

    public YouTubeModule(ReactApplicationContext context) {
        super(context);
        synchronized (YouTubeModule.class) {
            if (!initialized) {
                NewPipe.init(new ExtractorDownloader(), new Localization("en", "OM"));
                initialized = true;
            }
        }
        File cache = new File(context.getCacheDir(), "youtube-manifests");
        File[] files = cache.listFiles();
        if (files != null) for (File file : files) {
            if (file.lastModified() < System.currentTimeMillis() - 86400000L) file.delete();
        }
    }
    @Override public String getName() { return "HarmoniaYouTube"; }
    @Override public void invalidate() { executor.shutdownNow(); pages.clear(); super.invalidate(); }

    private interface Work { Object run() throws Exception; }
    private void submit(Promise promise, Work work) { submit(promise, work, false); }
    private void submit(Promise promise, Work work, boolean mux) {
        if (executor.isShutdown()) { promise.reject("E_CLOSED", "YouTube module is closed."); return; }
        executor.execute(() -> {
            try { promise.resolve(work.run()); }
            catch (Exception error) {
                String explanation = error instanceof ReCaptchaException
                        ? "YouTube blocked or rate limited this connection. Retry later or change network."
                        : "YouTube request failed. Check your connection and retry. Restricted videos or a YouTube change may require an extractor update.";
                // Do not leak signed URLs, response bodies or cookies into JS errors/logs.
                promise.reject(mux ? "E_MUX" : "E_YOUTUBE", mux
                        ? "Could not combine the downloaded audio and video. Check free storage or select a different MP4 quality."
                        : explanation);
            }
        });
    }
    private static String validateId(String id) {
        if (id == null || !id.matches("[A-Za-z0-9_-]{11}")) throw new IllegalArgumentException("Invalid video ID");
        return id;
    }
    private static String videoId(String url) throws Exception {
        return ServiceList.YouTube.getStreamLHFactory().getId(url);
    }
    private static WritableMap track(StreamInfoItem item) throws Exception {
        String id = videoId(item.getUrl());
        WritableMap map = Arguments.createMap();
        map.putString("id", "youtube:" + id);
        map.putString("youtubeId", id);
        map.putString("title", item.getName());
        map.putString("artist", item.getUploaderName());
        map.putString("kind", "video");
        map.putDouble("duration", item.getDuration());
        map.putDouble("views", item.getViewCount());
        map.putString("uploaded", item.getTextualUploadDate());
        if (!item.getThumbnails().isEmpty()) map.putString("cover", item.getThumbnails().get(item.getThumbnails().size() - 1).getUrl());
        return map;
    }
    @ReactMethod public void search(String query, String token, Promise promise) {
        submit(promise, () -> {
            if (query == null || query.trim().isEmpty() || query.length() > 500) throw new IllegalArgumentException();
            SearchExtractor extractor = ServiceList.YouTube.getSearchExtractor(query.trim(), Collections.singletonList("videos"), "");
            ListExtractor.InfoItemsPage<InfoItem> page;
            if (token == null || token.isEmpty()) {
                extractor.fetchPage();
                page = extractor.getInitialPage();
            } else {
                SearchPage saved = pages.get(token);
                if (saved == null || !saved.query.equals(query.trim())) throw new IllegalArgumentException("Search expired");
                page = extractor.getPage(saved.page);
            }
            WritableArray items = Arguments.createArray();
            for (InfoItem item : page.getItems()) if (item instanceof StreamInfoItem) {
                try { items.pushMap(track((StreamInfoItem) item)); } catch (Exception ignored) { /* Unsupported item */ }
            }
            WritableMap result = Arguments.createMap();
            result.putArray("tracks", items);
            if (Page.isValid(page.getNextPage())) {
                String next = UUID.randomUUID().toString();
                synchronized (pages) {
                    while (pages.size() >= 20) pages.remove(pages.keySet().iterator().next());
                    pages.put(next, new SearchPage(query.trim(), page.getNextPage()));
                }
                result.putString("nextPage", next);
            }
            return result;
        });
    }
    private static StreamInfo info(String id) throws Exception {
        return StreamInfo.getInfo(ServiceList.YouTube, "https://www.youtube.com/watch?v=" + validateId(id));
    }
    @ReactMethod public void details(String id, Promise promise) {
        submit(promise, () -> {
            StreamInfo info = info(id);
            WritableMap map = Arguments.createMap();
            map.putString("id", "youtube:" + id);
            map.putString("youtubeId", id);
            map.putString("title", info.getName());
            map.putString("artist", info.getUploaderName());
            map.putString("kind", "video");
            map.putDouble("duration", info.getDuration());
            map.putDouble("views", info.getViewCount());
            map.putDouble("likes", info.getLikeCount());
            map.putDouble("subscribers", info.getUploaderSubscriberCount());
            map.putString("uploaded", info.getTextualUploadDate());
            if (info.getDescription() != null) map.putString("description", info.getDescription().getContent());
            if (!info.getUploaderAvatars().isEmpty()) map.putString("channelAvatar", info.getUploaderAvatars().get(0).getUrl());
            WritableArray related = Arguments.createArray();
            if (info.getRelatedItems() != null) for (InfoItem item : info.getRelatedItems()) {
                if (item instanceof StreamInfoItem) try { related.pushMap(track((StreamInfoItem) item)); } catch (Exception ignored) {}
            }
            map.putArray("related", related);
            if (!info.getThumbnails().isEmpty()) map.putString("cover", info.getThumbnails().get(info.getThumbnails().size() - 1).getUrl());
            return map;
        });
    }
    private static boolean fileStream(Stream s) {
        return s.isUrl() && s.getContent().startsWith("https://")
                && s.getDeliveryMethod() == DeliveryMethod.PROGRESSIVE_HTTP && s.getFormat() != null
                && (s.getItagItem() == null || !Boolean.TRUE.equals(s.getItagItem().isDrc()));
    }
    private static boolean indexed(Stream s) {
        ItagItem itag = s.getItagItem();
        return itag != null && itag.getIndexStart() >= 0 && itag.getIndexEnd() > itag.getIndexStart()
                && itag.getInitStart() >= 0 && itag.getInitEnd() > itag.getInitStart();
    }
    private static AudioStream audio(StreamInfo info) {
        return info.getAudioStreams().stream().filter(s -> fileStream(s) && s.getFormat() == MediaFormat.M4A)
                .max(Comparator.comparingInt(YouTubeModule::audioPriority)
                        .thenComparingInt(AudioStream::getAverageBitrate)).orElse(null);
    }
    private static int audioPriority(AudioStream stream) {
        return stream.getAudioTrackType() == AudioTrackType.ORIGINAL ? 2
                : stream.getAudioTrackType() == null ? 1 : 0;
    }
    private static List<Choice> choices(StreamInfo info) {
        List<Choice> result = new ArrayList<>();
        for (AudioStream stream : info.getAudioStreams()) if (fileStream(stream)) {
            result.add(new Choice("audio:" + stream.getId() + ":" + stream.getAudioTrackId() + ":" + stream.getAudioTrackType(), stream, null, "audio",
                    stream.getFormat().getName() + " · " + stream.getAverageBitrate() + " kbps"
                            + (stream.getAudioTrackName() == null ? "" : " · " + stream.getAudioTrackName()), true));
        }
        for (VideoStream stream : info.getVideoStreams()) if (fileStream(stream) && !stream.isVideoOnly()) {
            result.add(new Choice("video:" + stream.getId(), stream, null, "video",
                    stream.getResolution() + " · " + stream.getFormat().getName(), true));
        }
        AudioStream audio = audio(info);
        if (info.getDuration() > 0 && audio != null && indexed(audio)) for (VideoStream stream : info.getVideoOnlyStreams()) {
            if (fileStream(stream) && stream.getFormat() == MediaFormat.MPEG_4 && indexed(stream)) {
                result.add(new Choice("video:" + stream.getId(), stream, audio, "video",
                        stream.getResolution() + " · MP4", true));
            }
        }
        if (info.getHlsUrl() != null && info.getHlsUrl().startsWith("https://")) {
            result.add(new Choice("hls", null, null, "video", "Live / adaptive", false));
        }
        result.sort((a, b) -> {
            if (!a.kind.equals(b.kind)) return a.kind.equals("video") ? -1 : 1;
            if (a.stream instanceof AudioStream && b.stream instanceof AudioStream) {
                int preference = Integer.compare(audioPriority((AudioStream) b.stream), audioPriority((AudioStream) a.stream));
                if (preference != 0) return preference;
            }
            return Integer.compare(b.quality(), a.quality());
        });
        return result;
    }
    @ReactMethod public void formats(String id, Promise promise) {
        submit(promise, () -> {
            WritableArray result = Arguments.createArray();
            for (Choice c : choices(info(id))) {
                WritableMap option = Arguments.createMap();
                option.putString("id", c.id);
                option.putString("label", c.label);
                option.putString("kind", c.kind);
                option.putBoolean("downloadable", c.downloadable);
                result.pushMap(option);
            }
            return result;
        });
    }
    @ReactMethod public void resolve(String id, String selected, String kind, boolean download, Promise promise) {
        submit(promise, () -> {
            StreamInfo info = info(id);
            List<Choice> options = choices(info);
            Choice choice = null;
            for (Choice c : options) if (c.id.equals(selected) && (!download || c.downloadable)) { choice = c; break; }
            if (choice == null && selected != null && !selected.isEmpty()) throw new IllegalArgumentException("Selected format unavailable");
            if (choice == null) {
                // Prefer <=1080p over decoding huge streams automatically. User can select higher qualities.
                for (Choice c : options) if (c.kind.equals(kind) && (!download || c.downloadable)) {
                    if (choice == null || (choice.quality() > 1080 && c.quality() <= 1080)) choice = c;
                }
            }
            if (choice == null) throw new IllegalArgumentException("No compatible stream");
            WritableMap source = Arguments.createMap();
            WritableMap headers = Arguments.createMap();
            headers.putString("User-Agent", ExtractorDownloader.USER_AGENT);
            source.putMap("headers", headers);
            source.putString("kind", choice.kind);
            source.putString("label", choice.label);
            if (choice.stream == null) {
                source.putString("uri", info.getHlsUrl());
                source.putString("extension", "m3u8");
            } else {
                String uri = choice.stream.getContent();
                if (choice.audio != null && !download) uri = manifest(info, choice.stream, choice.audio);
                source.putString("uri", uri);
                source.putString("extension", choice.stream.getFormat().getSuffix());
                if (choice.audio != null && download) source.putString("audioUri", choice.audio.getContent());
            }
            return source;
        });
    }
    // A local static DASH manifest lets Expo's Media3 engine synchronize and seek
    // separate streams, without running a server or two independent JS players.
    private String manifest(StreamInfo info, Stream video, Stream audio) throws Exception {
        File directory = new File(getReactApplicationContext().getCacheDir(), "youtube-manifests");
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IllegalStateException("No cache storage");
        File file = new File(directory, UUID.randomUUID() + ".mpd");
        try (FileOutputStream output = new FileOutputStream(file)) {
            XmlSerializer xml = Xml.newSerializer();
            xml.setOutput(output, "UTF-8");
            xml.startDocument("UTF-8", true);
            xml.setPrefix("", NS);
            xml.startTag(NS, "MPD");
            xml.attribute(null, "type", "static");
            xml.attribute(null, "profiles", "urn:mpeg:dash:profile:isoff-on-demand:2011");
            xml.attribute(null, "minBufferTime", "PT1.5S");
            long durationMs = Math.max(info.getDuration() * 1000,
                    Math.max(video.getItagItem().getApproxDurationMs(), audio.getItagItem().getApproxDurationMs()));
            xml.attribute(null, "mediaPresentationDuration", "PT" + (durationMs / 1000.0) + "S");
            xml.startTag(NS, "Period");
            xml.attribute(null, "start", "PT0S");
            representation(xml, video, "video");
            representation(xml, audio, "audio");
            xml.endTag(NS, "Period");
            xml.endTag(NS, "MPD");
            xml.endDocument();
        } catch (Exception error) { file.delete(); throw error; }
        return Uri.fromFile(file).toString();
    }
    private static void representation(XmlSerializer xml, Stream stream, String kind) throws Exception {
        ItagItem itag = stream.getItagItem();
        xml.startTag(NS, "AdaptationSet");
        xml.attribute(null, "contentType", kind);
        xml.attribute(null, "mimeType", stream.getFormat().getMimeType());
        xml.startTag(NS, "Representation");
        xml.attribute(null, "id", stream.getId());
        xml.attribute(null, "bandwidth", Integer.toString(Math.max(1, itag.getBitrate())));
        if (itag.getCodec() != null) xml.attribute(null, "codecs", itag.getCodec());
        if (kind.equals("video")) {
            xml.attribute(null, "width", Integer.toString(itag.getWidth()));
            xml.attribute(null, "height", Integer.toString(itag.getHeight()));
        }
        xml.startTag(NS, "BaseURL").text(stream.getContent()).endTag(NS, "BaseURL");
        xml.startTag(NS, "SegmentBase");
        xml.attribute(null, "indexRange", itag.getIndexStart() + "-" + itag.getIndexEnd());
        xml.startTag(NS, "Initialization");
        xml.attribute(null, "range", itag.getInitStart() + "-" + itag.getInitEnd());
        xml.endTag(NS, "Initialization");
        xml.endTag(NS, "SegmentBase");
        xml.endTag(NS, "Representation");
        xml.endTag(NS, "AdaptationSet");
    }
    @ReactMethod public void mux(String videoUri, String audioUri, String outputUri, Promise promise) {
        submit(promise, () -> {
            File video = privateFile(videoUri), audio = privateFile(audioUri), output = privateFile(outputUri);
            if (output.exists()) throw new IllegalArgumentException("Output exists");
            MediaMux.merge(video, audio, output);
            return Uri.fromFile(output).toString();
        }, true);
    }
    private File privateFile(String uri) throws Exception {
        Uri parsed = Uri.parse(uri);
        if (!"file".equals(parsed.getScheme())) throw new IllegalArgumentException();
        File file = new File(Objects.requireNonNull(parsed.getPath())).getCanonicalFile();
        File root = getReactApplicationContext().getFilesDir().getCanonicalFile();
        if (!file.getPath().startsWith(root.getPath() + File.separator)) throw new IllegalArgumentException();
        return file;
    }
    private static final class SearchPage {
        final String query; final Page page;
        SearchPage(String query, Page page) { this.query = query; this.page = page; }
    }
    private static final class Choice {
        final String id, kind, label; final Stream stream; final AudioStream audio; final boolean downloadable;
        Choice(String id, Stream stream, AudioStream audio, String kind, String label, boolean downloadable) {
            this.id = id; this.stream = stream; this.audio = audio; this.kind = kind; this.label = label; this.downloadable = downloadable;
        }
        int quality() {
            if (stream instanceof AudioStream) return ((AudioStream) stream).getAverageBitrate();
            if (stream instanceof VideoStream) {
                String digits = ((VideoStream) stream).getResolution().split("p")[0].replaceAll("[^0-9]", "");
                try { return Integer.parseInt(digits); } catch (NumberFormatException ignored) { return 0; }
            }
            return 0;
        }
    }
}
