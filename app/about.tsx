import { router } from "expo-router";
import AboutIdentity from "@/components/AboutIdentity";
import { Page, Button, SurfaceCard, useMediaStyles } from "@/components/MediaUI";
import { Text } from "@/components/LocalizedText";
export default function AboutScreen() {
  const styles = useMediaStyles();
  return (
    <Page title="About Harmonia">
      <AboutIdentity />
      <SurfaceCard>
        <Text style={styles.text}>
          Play music and videos, save supported media for offline playback, and cast to compatible devices.
        </Text>
        <Button
          title="Support the Developer"
          onPress={() => router.navigate("/support")}
        />
        <Button
          title="Source Code & Licenses"
          onPress={() => router.navigate("/licenses")}
        />
      </SurfaceCard>
    </Page>
  );
}
