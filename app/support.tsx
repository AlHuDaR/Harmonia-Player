import { Page, SurfaceCard, useMediaStyles } from "@/components/MediaUI";
import { Text } from "@/components/LocalizedText";
import RepositoryLink from "@/components/RepositoryLink";
export default function SupportScreen() {
  const styles = useMediaStyles();
  return (
    <Page title="Support the Developer">
      <SurfaceCard>
        <Text style={styles.text}>
          Report issues or suggest improvements on GitHub.
        </Text>
        <RepositoryLink issues />
      </SurfaceCard>
    </Page>
  );
}
