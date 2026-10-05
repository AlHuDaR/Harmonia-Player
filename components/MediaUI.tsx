import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayerStore } from "@/store/playerStore";
import { downloadTrack } from "@/utils/downloads";
import { message, type Track } from "@/types/media";
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0c0e16" },
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  title: { color: "#fff", fontSize: 30, fontWeight: "700" },
  heading: { color: "#fff", fontSize: 20, fontWeight: "600" },
  text: { color: "#c2c7d9", fontSize: 15 },
  input: {
    color: "#fff",
    backgroundColor: "#202333",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#333e6c",
    borderRadius: 10,
    padding: 12,
    minHeight: 44,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { padding: 14, borderRadius: 12, backgroundColor: "#191d2b", gap: 8 },
  error: { color: "#ff9c9c" },
});
export function Page({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#929ab4"
      style={styles.input}
      autoCapitalize="none"
      {...props}
    />
  );
}
export function TrackCard({
  track,
  playlistId,
}: {
  track: Track;
  playlistId?: string;
}) {
  const favorite = usePlayerStore((s) => s.favorites.includes(track.id));
  const playlists = usePlayerStore((s) => s.playlists);
  const download = usePlayerStore((s) =>
    s.downloads.find((d) => d.track.id === track.id),
  );
  const [error, setError] = useState("");
  const [choose, setChoose] = useState(false);
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{track.title}</Text>
      <Text style={styles.text}>
        {track.artist}
        {track.localUri ? " · Offline" : ""}
      </Text>
      <View style={{ ...styles.row, flexWrap: "wrap" }}>
        <Button
          title="Play"
          onPress={() => {
            const local = usePlayerStore
              .getState()
              .downloads.find(
                (d) => d.track.id === track.id && d.status === "complete",
              )?.track;
            usePlayerStore.getState().setCurrentTrack(local || track);
          }}
        />
        <Button
          title={favorite ? "♥ Saved" : "♡ Favorite"}
          onPress={() => {
            usePlayerStore.getState().addTrack(track);
            usePlayerStore.getState().toggleFavorite(track.id);
          }}
        />
        {!track.localUri && (
          <Button
            title={
              download?.status === "downloading"
                ? `${Math.round(download.progress * 100)}%`
                : download?.status === "complete"
                  ? "Downloaded"
                  : "Download"
            }
            disabled={
              download?.status === "downloading" ||
              download?.status === "complete"
            }
            onPress={() => {
              setError("");
              downloadTrack(track).catch((e) => setError(message(e)));
            }}
          />
        )}
        <Button
          title={playlistId ? "Remove" : "Playlist"}
          onPress={() =>
            playlistId
              ? usePlayerStore
                  .getState()
                  .removeFromPlaylist(playlistId, track.id)
              : setChoose(!choose)
          }
        />
      </View>
      {choose && (
        <View style={{ gap: 8 }}>
          <Text style={styles.text}>
            {playlists.length
              ? "Add to playlist"
              : "Create a playlist in Library first."}
          </Text>
          {playlists.map((p) => (
            <Button
              key={p.id}
              title={p.name}
              onPress={() => {
                usePlayerStore.getState().addTrack(track);
                usePlayerStore.getState().addToPlaylist(p.id, track.id);
                setChoose(false);
              }}
            />
          ))}
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
