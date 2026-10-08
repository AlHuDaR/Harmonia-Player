import { router } from "expo-router";
import { Text } from "@/components/LocalizedText";
import OpenMedia from "@/components/OpenMedia";
import { useState } from "react";
import { View } from "react-native";
import {
  Page,
  TrackCard,
  Input,
  Button,
  ChoiceChip,
  SurfaceCard,
  EmptyState,
  SectionHeader,
  useMediaStyles,
} from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
const collections = [
  "Favorites",
  "Playlists",
  "Local media",
  "Saved tracks",
] as const;
export default function LibraryScreen() {
  const styles = useMediaStyles();
  const { tracks, favorites, playlists, downloads } = usePlayerStore();
  const [collection, setCollection] =
    useState<(typeof collections)[number]>("Favorites");
  const [name, setName] = useState("");
  const [openPlaylist, setOpenPlaylist] = useState<string | null>(null);
  const downloadedIds = new Set(downloads.map((d) => d.track.id));
  const visible = tracks.filter((track) =>
    collection === "Favorites"
      ? favorites.includes(track.id)
      : collection === "Local media"
        ? !!track.localUri && !downloadedIds.has(track.id)
        : !track.localUri && !downloadedIds.has(track.id),
  );
  return (
    <Page title="Library">
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          title="Downloads"
          onPress={() => router.navigate("/downloads")}
        />
        <Button
          title="View recent"
          onPress={() => router.navigate("/samples")}
        />
      </View>
      <SurfaceCard>
        <OpenMedia />
      </SurfaceCard>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        {collections.map((label) => (
          <ChoiceChip
            key={label}
            label={label}
            selected={collection === label}
            onPress={() => setCollection(label)}
          />
        ))}
      </View>
      <SectionHeader title={collection} />
      {collection === "Playlists" ? (
        <>
          <SurfaceCard>
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
          </SurfaceCard>
          {!playlists.length && (
            <EmptyState
              icon="queue-music"
              title="Your playlists start here"
              description="Create a playlist, then use Add To in the player to save tracks to it."
            />
          )}
          {playlists.map((p) => {
            const list = p.trackIds
              .map((id) => tracks.find((track) => track.id === id))
              .filter((track) => !!track);
            return (
              <SurfaceCard key={p.id}>
                <Button
                  raw
                  expanded={openPlaylist === p.id}
                  title={p.name}
                  onPress={() =>
                    setOpenPlaylist(openPlaylist === p.id ? null : p.id)
                  }
                />
                {openPlaylist === p.id && (
                  <>
                    {!list.length && (
                      <Text style={styles.text}>
                        Use the Playlist button on a track to add it here.
                      </Text>
                    )}
                    {!!list.length && (
                      <Button
                        title="Play all"
                        onPress={() =>
                          usePlayerStore.getState().playList(list, 0)
                        }
                      />
                    )}
                    {list.map((track) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        playlistId={p.id}
                        list={list}
                        compact
                      />
                    ))}
                    <Button
                      title="Delete playlist"
                      onPress={() =>
                        usePlayerStore.getState().deletePlaylist(p.id)
                      }
                    />
                  </>
                )}
              </SurfaceCard>
            );
          })}
        </>
      ) : (
        <>
          {!visible.length && (
            <EmptyState
              icon={
                collection === "Favorites" ? "favorite-border" : "folder-open"
              }
              title={
                collection === "Favorites"
                  ? "Keep what you love"
                  : "Nothing here yet"
              }
              description={
                collection === "Favorites"
                  ? "Tap Favorite on a track to save it."
                  : collection === "Local media"
                    ? "Import local audio or video using the button above."
                    : "Tracks you open or play are saved here. Downloads have their own space."
              }
            />
          )}
          {visible.map((track) => (
            <TrackCard key={track.id} track={track} list={visible} compact />
          ))}
        </>
      )}
    </Page>
  );
}
