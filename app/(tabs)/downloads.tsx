import { Text } from "@/components/LocalizedText";
import { useState } from "react";
import { View } from "react-native";
import { Page, TrackCard, Button, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { deleteDownload, downloadTrack } from "@/utils/downloads";
import { message } from "@/types/media";
export default function DownloadsScreen() {
  const downloads = usePlayerStore((s) => s.downloads);
  const offline = downloads
    .filter((d) => d.status === "complete" && d.track.localUri)
    .map((d) => d.track);
  const [error, setError] = useState("");
  return (
    <Page title="Downloads">
      {!!offline.length && (
        <Button
          title="Play all"
          onPress={() => usePlayerStore.getState().playList(offline, 0)}
        />
      )}
      <Text style={styles.text}>
        Files are saved privately on this device for offline playback.
      </Text>
      {!downloads.length && (
        <Text style={styles.text}>
          Download a direct media file from Home or a search result.
        </Text>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {downloads.map((d) => (
        <View key={d.track.id} style={{ gap: 8 }}>
          <Text style={styles.text}>
            {d.status} · {Math.round(d.progress * 100)}%
            {d.error ? ` · ${d.error}` : ""}
          </Text>
          <TrackCard
            track={d.track}
            list={d.status === "complete" ? offline : undefined}
          />
          {d.status === "failed" && (
            <Button
              title="Retry download"
              onPress={() =>
                downloadTrack(d.track).catch((e) => setError(message(e)))
              }
            />
          )}
          {d.status !== "downloading" && (
            <Button
              title="Delete download"
              onPress={() =>
                deleteDownload(d.track).catch((e) => setError(message(e)))
              }
            />
          )}
        </View>
      ))}
    </Page>
  );
}
