import { useLocale } from "@/utils/i18n";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
const tabs = [
  ["index", "Home", "home"],
  ["explore", "Search", "search"],
  ["downloads", "Downloads", "download"],
  ["library", "Library", "library-music"],
  ["settings", "Settings", "settings"],
] as const;
export default function TabLayout() {
  const { t } = useLocale();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarStyle: { backgroundColor: "#101010", borderTopColor: "#282d40" },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#929ab4",
      }}
    >
      {tabs.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(title),
            tabBarIcon: ({ size, color }) => (
              <MaterialIcons name={icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
