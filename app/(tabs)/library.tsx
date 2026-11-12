import SharedLinkCard from "@/components/SharedLinkCard";
import { classifyLink } from "@/utils/linkProviders";
import { router } from "expo-router";
import { Text } from "@/components/LocalizedText";
import OpenMedia from "@/components/OpenMedia";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import SearchInput from "@/components/SearchInput";
import { searchTerm } from "@/utils/textDirection";
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
  "Saved links",
  "Favorites",
  "Playlists",
  "Local media",
  "Saved tracks",
] as const;
export default function LibraryScreen() {
  const styles = useMediaStyles();
  const { tracks, favorites, playlists, savedLinks } = usePlayerStore(
    useShallow((state) => ({
      tracks: state.tracks,
      favorites: state.favorites,
      playlists: state.playlists,
      savedLinks: state.savedLinks,
    })),
  );
  const downloadedIds = usePlayerStore(
    useShallow((state) => state.downloads.map((download) => download.track.id)),
  );
  const [collection, setCollection] =
    useState<(typeof collections)[number]>("Favorites");
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [openPlaylist, setOpenPlaylist] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const collectionTracks = useMemo(() => {
    if (collection === "Saved links" || collection === "Playlists") return [];
    if (collection === "Favorites") {
      const ids = new Set(favorites);
      return tracks.filter((track) => ids.has(track.id));
    }
    const ids = new Set(downloadedIds);
    const local = collection === "Local media";
    return tracks.filter((track) => !!track.localUri === local && !ids.has(track.id));
  }, [collection, tracks, favorites, downloadedIds]);
  const openedTracks = useMemo(() => {
    if (collection !== "Playlists") return [];
    const playlist = playlists.find((item) => item.id === openPlaylist);
    if (!playlist?.trackIds.length) return [];
    const tracksById = new Map(tracks.map((track) => [track.id, track]));
    return playlist.trackIds.map((id) => tracksById.get(id)).filter((track) => !!track);
  }, [collection, openPlaylist, playlists, tracks]);
  const term = searchTerm(query).toLocaleLowerCase();
  const visible = term
    ? collectionTracks.filter(({ title, artist }) =>
        searchTerm(`${title} ${artist}`).toLocaleLowerCase().includes(term),
      )
    : collectionTracks;
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
            onPress={() => {
              if (collection !== label) setQuery("");
              setCollection(label);
            }}
          />
        ))}
      </View>
      <SectionHeader title={collection} />
      {collection === "Saved links" ? (
        <>
          {!savedLinks.length && (
            <Text style={styles.text}>
              Share a web link to Harmonia, then choose Save Link.
            </Text>
          )}
          {savedLinks.map((link) => (
            <SurfaceCard key={link.url}>
              <Button
                raw
                title={link.url}
                onPress={() => setSelectedLink(link.url)}
              />
              {selectedLink === link.url && (
                <SharedLinkCard
                  key={link.url}
                  link={classifyLink(link.url)}
                  onClose={() => setSelectedLink(null)}
                />
              )}
              <Button
                title="Remove saved link"
                onPress={() =>
                  usePlayerStore.getState().removeSavedLink(link.url)
                }
              />
            </SurfaceCard>
          ))}
        </>
      ) : collection === "Playlists" ? (
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
          {playlists.map((p) => (
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
                  {!openedTracks.length && (
                    <Text style={styles.text}>
                      Use the Playlist button on a track to add it here.
                    </Text>
                  )}
                  {!!openedTracks.length && (
                    <Button
                      title="Play all"
                      onPress={() =>
                        usePlayerStore.getState().playList(openedTracks, 0)
                      }
                    />
                  )}
                  {openedTracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      playlistId={p.id}
                      list={openedTracks}
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
          ))}
        </>
      ) : (
        <>
          {!!collectionTracks.length && (
            <SearchInput
              accessibilityLabel="Search library"
              placeholder="Search by title or artist"
              value={query}
              onChangeText={setQuery}
            />
          )}
          {!visible.length && !!term && <Text style={styles.text}>No matching tracks.</Text>}
          {!collectionTracks.length && (
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
