import { router } from "expo-router";
import { useMemo } from "react";
import { Page, TrackCard, EmptyState, Button } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
export default function RecentScreen() {
  const tracks = usePlayerStore((state) => state.tracks);
  const history = usePlayerStore((state) => state.history);
  const recent = useMemo(() => {
    if (!history.length) return [];
    const tracksById = new Map<string, (typeof tracks)[number]>();
    for (const track of tracks) {
      if (!tracksById.has(track.id)) tracksById.set(track.id, track);
    }
    return [...new Set(history)]
      .map((id) => tracksById.get(id))
      .filter((track) => !!track);
  }, [tracks, history]);
  return (
    <Page title="Recent">
      {!recent.length ? (
        <EmptyState
          icon="history"
          title="No listening history yet"
          description="Play a file or stream to start your listening history."
          action="Search"
          onPress={() => router.navigate("/explore")}
        />
      ) : (
        <>
          <Button
            title="Play all"
            onPress={() => usePlayerStore.getState().playList(recent, 0)}
          />
          {recent.map((track) => (
            <TrackCard key={track.id} track={track} list={recent} compact />
          ))}
        </>
      )}
    </Page>
  );
}
