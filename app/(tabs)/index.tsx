import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { usePlayerStore } from '@/store/playerStore';

const QUICK_PICKS = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    cover: 'https://images.unsplash.com/photo-1618609377864-68609b857e90?w=300&h=300&fit=crop',
  },
  {
    id: '2',
    title: 'As It Was',
    artist: 'Harry Styles',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  },
  {
    id: '3',
    title: 'Stay With Me',
    artist: 'Calvin Harris',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
  },
];

export default function HomeScreen() {
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <MaterialIcons name="music-note" size={24} color={Colors.white} />
          <Text style={styles.headerTitle}>YouTube Music</Text>
          <MaterialIcons name="cast" size={24} color={Colors.white} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick picks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUICK_PICKS.map((track) => (
              <Pressable
                key={track.id}
                style={styles.track}
                onPress={() => setCurrentTrack(track)}>
                <Image source={{ uri: track.cover }} style={styles.trackCover} />
                <Text style={styles.trackTitle}>{track.title}</Text>
                <Text style={styles.trackArtist}>{track.artist}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mixed for you</Text>
          {/* Similar structure as Quick picks */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  track: {
    marginRight: 16,
    width: 150,
  },
  trackCover: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  trackTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  trackArtist: {
    color: Colors.gray[400],
    fontSize: 14,
  },
});