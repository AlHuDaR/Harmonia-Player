import { router } from "expo-router";
import AboutIdentity from "@/components/AboutIdentity";
import { Page, Button, useMediaStyles } from "@/components/MediaUI";
import { Text } from "@/components/LocalizedText";
export default function AboutScreen() {
  const styles = useMediaStyles();
  return (
    <Page title="About Harmonia">
      <AboutIdentity />
      <Text style={styles.text}>
        Your music and videos, online and offline.
      </Text>
      <Text style={styles.heading}>Developer</Text>
      <Text raw style={styles.text}>
        AlHuDaR
      </Text>
      <Text style={styles.text}>
        An independent player developed by AlHuDaR.
      </Text>
      <Button
        title="Support the Developer"
        onPress={() => router.navigate("/support")}
      />
      <Button
        title="Source Code & Licenses"
        onPress={() => router.navigate("/licenses")}
      />
    </Page>
  );
}
