import { useState } from "react";
import { Text, View } from "react-native";
import { Page, TrackCard, Input, Button, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
export default function LibraryScreen() {
  const { tracks, favorites, playlists } = usePlayerStore();
  const [name, setName] = useState("");
  return (
    <Page title="Library">
      <Text style={styles.heading}>Favorites</Text>
      {!favorites.length && (
        <Text style={styles.text}>Tap Favorite on a track to save it.</Text>
      )}
      {tracks
        .filter((t) => favorites.includes(t.id))
        .map((t) => (
          <TrackCard key={t.id} track={t} />
        ))}
      <Text style={styles.heading}>Playlists</Text>
      <Input
        accessibilityLabel="Playlist name"
        placeholder="New playlist name"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Button
        title="Create playlist"
        disabled={!name.trim()}
        onPress={() => {
          usePlayerStore.getState().createPlaylist(name);
          setName("");
        }}
      />
      {playlists.map((p) => (
        <View key={p.id} style={{ gap: 12 }}>
          <Text style={styles.heading}>{p.name}</Text>
          {!p.trackIds.length && (
            <Text style={styles.text}>
              Use the Playlist button on a track to add it here.
            </Text>
          )}
          {p.trackIds
            .map((id) => tracks.find((t) => t.id === id))
            .filter((t) => !!t)
            .map((t) => (
              <TrackCard key={t.id} track={t} playlistId={p.id} />
            ))}
          <Button
            title={`Delete playlist ${p.name}`}
            onPress={() => usePlayerStore.getState().deletePlaylist(p.id)}
          />
        </View>
      ))}
      <Text style={styles.heading}>Local media & saved tracks</Text>
      {!tracks.length && (
        <Text style={styles.text}>
          Import a file from Home to add local media.
        </Text>
      )}
      {tracks.map((t) => (
        <TrackCard key={t.id} track={t} />
      ))}
    </Page>
  );
}
