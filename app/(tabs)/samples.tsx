import { router } from "expo-router";
import { Page, TrackCard, EmptyState, Button } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
export default function RecentScreen() {
  const { tracks, history, playList } = usePlayerStore();
  const recent = [...new Set(history)]
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track) => !!track);
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
          <Button title="Play all" onPress={() => playList(recent, 0)} />
          {recent.map((track) => (
            <TrackCard key={track.id} track={track} list={recent} compact />
          ))}
        </>
      )}
    </Page>
  );
}
