import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

const API_KEY = 'AIzaSyCOyHZDLTgo6eod53lSS4egQNhix4SZIXI';
const DOWNLOAD_SERVER = 'https://harmonia-player.onrender.com'; // We'll update this after deployment

interface YouTubeSearchResult {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default: {
        url: string;
      };
      high: {
        url: string;
      };
    };
  };
}

export async function searchYouTubeMusic(query: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(
        query
      )}&type=video&videoCategoryId=10&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();
    return data.items.map((item: YouTubeSearchResult) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      cover: item.snippet.thumbnails.high.url,
    }));
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

export async function downloadSong(videoId: string, title: string): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      throw new Error('Downloads are not supported on web platform');
    }

    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission not granted');
    }

    // Create downloads directory if it doesn't exist
    const downloadDir = `${FileSystem.documentDirectory}downloads/`;
    const dirInfo = await FileSystem.getInfoAsync(downloadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    }

    // Sanitize filename
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedTitle}.mp3`;
    const fileUri = `${downloadDir}${filename}`;

    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      return fileUri;
    }

    // Download the file
    const downloadResumable = FileSystem.createDownloadResumable(
      `${DOWNLOAD_SERVER}/download/${videoId}`,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        // You can use this progress value to update a progress bar
      }
    );

    const { uri } = await downloadResumable.downloadAsync();

    // Save to media library
    await MediaLibrary.saveToLibraryAsync(uri);

    return uri;
  } catch (error) {
    console.error('Error downloading song:', error);
    throw error;
  }
}
