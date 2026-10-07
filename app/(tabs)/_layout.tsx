import { Tabs } from "expo-router";
import { useTheme } from "@/utils/theme";
export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
