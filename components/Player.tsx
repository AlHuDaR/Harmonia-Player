import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { usePlayerStore } from '@/store/playerStore';

export default function Player() {
  const { currentTrack, isPlaying, togglePlayback } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <View style={styles.container}>
      <Image source={{ uri: currentTrack.cover }} style={styles.cover} />
      <View style={styles.info}>
        <Text style={styles.title}>{currentTrack.title}</Text>
        <Text style={styles.artist}>{currentTrack.artist}</Text>
      </View>
      <Pressable onPress={togglePlayback}>
        <MaterialIcons
          name={isPlaying ? 'pause' : 'play-arrow'}
          size={32}
          color={Colors.white}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 85 : 60,
    left: 0,
    right: 0,
    backgroundColor: Colors.gray[800],
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  artist: {
    color: Colors.gray[400],
    fontSize: 14,
  },
});