import { Page, Button, useMediaStyles } from "@/components/MediaUI";
import { Text } from "@/components/LocalizedText";
import RepositoryLink from "@/components/RepositoryLink";
export default function SupportScreen() {
  const styles = useMediaStyles();
  return (
    <Page title="Support the Developer">
      <Text raw style={styles.heading}>
        Coded By AlHuDaR
      </Text>
      <Text style={styles.text}>
        Enjoying Harmonia? Your support helps development and improvements.
      </Text>
      <Text style={styles.text}>
        Report issues or suggest improvements on GitHub.
      </Text>
      <RepositoryLink issues />
      <Button title="Donations coming soon" disabled onPress={() => {}} />
      <Text style={styles.text}>
        Donations will be available here once a payment method is added.
      </Text>
    </Page>
  );
}
