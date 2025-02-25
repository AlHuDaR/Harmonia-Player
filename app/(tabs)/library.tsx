import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

export default function LibraryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Library</Text>
          <MaterialIcons name="search" size={24} color={Colors.white} />
        </View>

        <View style={styles.filters}>
          <Text style={styles.filterActive}>Playlists</Text>
          <Text style={styles.filter}>Albums</Text>
          <Text style={styles.filter}>Songs</Text>
          <Text style={styles.filter}>Artists</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.playlistItem}>
            <MaterialIcons name="favorite" size={24} color={Colors.red[500]} />
            <Text style={styles.playlistTitle}>Liked Songs</Text>
          </View>
          
          <View style={styles.playlistItem}>
            <MaterialIcons name="history" size={24} color={Colors.gray[400]} />
            <Text style={styles.playlistTitle}>Recently played</Text>
          </View>
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
    padding: 16,
  },
  title: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
  },
  filter: {
    color: Colors.gray[400],
    marginRight: 16,
    fontSize: 16,
  },
  filterActive: {
    color: Colors.white,
    marginRight: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  playlistTitle: {
    color: Colors.white,
    fontSize: 16,
    marginLeft: 16,
  },
});