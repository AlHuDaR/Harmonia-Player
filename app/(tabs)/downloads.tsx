import { useState } from "react";
import { Text, View } from "react-native";
import { Page, TrackCard, Button, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { deleteDownload, downloadTrack } from "@/utils/downloads";
import { message } from "@/types/media";
export default function DownloadsScreen() {
  const downloads = usePlayerStore((s) => s.downloads);
  const [error, setError] = useState("");
  return (
    <Page title="Downloads">
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
          <TrackCard track={d.track} />
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
