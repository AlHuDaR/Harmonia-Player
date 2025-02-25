const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

app.use(cors());

// Add a health check endpoint
app.get('/', (req, res) => {
  res.send('Harmonia Player Download Server');
});

app.get('/download/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Get video info
    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    
    // Set up file paths
    const tempFilePath = path.join(tempDir, `${videoId}.mp4`);
    const outputPath = path.join(tempDir, `${videoId}.mp3`);

    // Download and convert video
    await new Promise((resolve, reject) => {
      ytdl(videoUrl, {
        quality: 'highestaudio',
        filter: 'audioonly',
      })
      .pipe(fs.createWriteStream(tempFilePath))
      .on('finish', () => {
        // Convert to MP3
        ffmpeg(tempFilePath)
          .toFormat('mp3')
          .on('end', () => {
            // Clean up temp video file
            fs.unlinkSync(tempFilePath);
            resolve();
          })
          .on('error', reject)
          .save(outputPath);
      })
      .on('error', reject);
    });

    // Set headers for download
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);

    // Stream the file
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);

    // Clean up MP3 file after streaming
    stream.on('end', () => {
      fs.unlinkSync(outputPath);
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Cleanup temp files on server start
fs.readdir(tempDir, (err, files) => {
  if (err) return;
  for (const file of files) {
    fs.unlink(path.join(tempDir, file), err => {
      if (err) console.error(`Error deleting ${file}:`, err);
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});