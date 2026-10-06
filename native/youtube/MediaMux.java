// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import java.io.File;
import java.nio.ByteBuffer;

final class MediaMux {
    static void merge(File videoFile, File audioFile, File output) throws Exception {
        MediaExtractor video = new MediaExtractor(), audio = new MediaExtractor();
        MediaMuxer muxer = null;
        boolean success = false;
        try {
            video.setDataSource(videoFile.getPath());
            audio.setDataSource(audioFile.getPath());
            int videoIndex = select(video, "video/"), audioIndex = select(audio, "audio/");
            muxer = new MediaMuxer(output.getPath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            int videoOut = muxer.addTrack(video.getTrackFormat(videoIndex));
            int audioOut = muxer.addTrack(audio.getTrackFormat(audioIndex));
            muxer.start();
            copy(video, muxer, videoOut);
            copy(audio, muxer, audioOut);
            muxer.stop();
            success = true;
        } finally {
            video.release(); audio.release();
            if (muxer != null) muxer.release();
            if (!success) output.delete();
        }
    }
    private static int select(MediaExtractor extractor, String prefix) {
        for (int i = 0; i < extractor.getTrackCount(); i++) {
            String mime = extractor.getTrackFormat(i).getString(MediaFormat.KEY_MIME);
            if (mime != null && mime.startsWith(prefix)) { extractor.selectTrack(i); return i; }
        }
        throw new IllegalArgumentException("Downloaded media has no " + prefix + " track");
    }
    private static void copy(MediaExtractor extractor, MediaMuxer muxer, int track) throws Exception {
        ByteBuffer buffer = ByteBuffer.allocateDirect(16 * 1024 * 1024);
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        while (true) {
            if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
            buffer.clear();
            int size = extractor.readSampleData(buffer, 0);
            if (size < 0) break;
            if (size > buffer.capacity()) throw new IllegalArgumentException("Video sample too large");
            long time = extractor.getSampleTime();
            info.set(0, size, time, (extractor.getSampleFlags() & MediaExtractor.SAMPLE_FLAG_SYNC) != 0 ? MediaCodec.BUFFER_FLAG_KEY_FRAME : 0);
            muxer.writeSampleData(track, buffer, info);
            extractor.advance();
        }
    }
}
