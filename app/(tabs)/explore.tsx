import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { searchYouTubeMusic, downloadSong } from '@/utils/youtube';
import * as MediaLibrary from 'expo-media-library';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchYouTubeMusic(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (track) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save songs');
        return;
      }

      setDownloading(track.id);
      await downloadSong(track.id, track.title);
      Alert.alert('Success', 'Song downloaded successfully!');
    } catch (error) {
      Alert.alert('Download Failed', error.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Explore</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs, artists, or albums"
            placeholderTextColor={Colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <Pressable onPress={handleSearch} style={styles.searchButton}>
            <MaterialIcons name="search" size={24} color={Colors.white} />
          </Pressable>
        </View>

        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.white} />
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {searchResults.map((track) => (
              <Pressable
                key={track.id}
                style={styles.resultItem}
                onPress={() => setCurrentTrack(track)}
              >
                <View style={styles.resultContent}>
                  <Image 
                    source={{ uri: track.cover }}
                    style={styles.resultImage}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={2}>{track.title}</Text>
                    <Text style={styles.resultArtist}>{track.artist}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <Pressable onPress={() => setCurrentTrack(track)}>
                      <MaterialIcons name="play-arrow" size={24} color={Colors.white} />
                    </Pressable>
                    <Pressable 
                      onPress={() => handleDownload(track)}
                      style={styles.downloadButton}
                    >
                      {downloading === track.id ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <MaterialIcons name="file-download" size={24} color={Colors.white} />
                      )}
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  title: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: 'bold',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.gray[800],
    borderRadius: 24,
    paddingHorizontal: 20,
    color: Colors.white,
    fontSize: 16,
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.gray[800],
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    padding: 16,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[800],
    padding: 12,
    borderRadius: 8,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  resultTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resultArtist: {
    color: Colors.gray[400],
    fontSize: 14,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});