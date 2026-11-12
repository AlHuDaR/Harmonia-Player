import { FocusablePressable as Pressable } from "@/components/FocusablePressable";
import { useState } from "react";
import { Image, Modal, ScrollView, View } from "react-native";
import Constants from "expo-constants";
import { MaterialIcons } from "@expo/vector-icons";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./LocalizedText";
import { useLocale } from "@/utils/i18n";
import { useTheme } from "@/utils/theme";
import { usePlayerStore } from "@/store/playerStore";
const menu = [
  ["Settings", "/settings", "settings"],
  ["About Harmonia", "/about", "info-outline"],
  ["Support the Developer", "/support", "favorite-border"],
] as const;
const tabs = [
  ["Home", "/", "home"],
  ["Recent", "/samples", "history"],
  ["Search", "/explore", "search"],
  ["Library", "/library", "library-music"],
] as const;
export function Header() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const { t, rtl } = useLocale();
  const insets = useSafeAreaInsets();
  const currentPath = usePathname();
  const version = Constants.expoConfig?.version ?? require("../package.json").version;
  const dismiss = () => setOpen(false);
  return (
    <>
      <View
        style={{
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View
          style={{
            height: 44,
            flexDirection: "row",
            direction: "ltr",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Open menu")}
            onPress={() => setOpen(true)}
            style={{
              width: 44,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="menu" size={22} color={theme.text} />
          </Pressable>
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 22, height: 22, borderRadius: 6 }}
          />
          <Text
            raw
            style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}
          >
            Harmonia
          </Text>
        </View>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View
          style={{
            flex: 1,
            flexDirection: rtl ? "row-reverse" : "row",
            backgroundColor: theme.scrim,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: "86%",
              maxWidth: 350,
              height: "100%",
              backgroundColor: theme.background,
              borderTopLeftRadius: rtl ? 24 : 0,
              borderBottomLeftRadius: rtl ? 24 : 0,
              borderTopRightRadius: rtl ? 0 : 24,
              borderBottomRightRadius: rtl ? 0 : 24,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                direction: rtl ? "rtl" : "ltr",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                paddingBottom: 20,
              }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={{ width: 44, height: 44, borderRadius: 12 }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    raw
                    style={{ color: theme.text, fontSize: 20, fontWeight: "800" }}
                  >
                    Harmonia
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}
                  >
                    Your music and videos, online and offline.
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Close menu")}
                onPress={dismiss}
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 24,
                }}
              >
                <MaterialIcons name="close" size={23} color={theme.text} />
              </Pressable>
            </View>
            <View style={{ height: 1, backgroundColor: theme.border, opacity: 0.55 }} />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {menu.map(([label, path, icon], index) => {
                const selected = currentPath === path;
                return (
                  <View key={path}>
                    {index === 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: theme.border,
                          opacity: 0.45,
                          marginVertical: 16,
                          marginHorizontal: 10,
                        }}
                      />
                    )}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t(label)}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        dismiss();
                        usePlayerStore.getState().setExpanded(false);
                        router.navigate(path as Href);
                      }}
                      style={({ pressed }) => ({
                        minHeight: 64,
                        flexDirection: "row",
                        direction: rtl ? "rtl" : "ltr",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        backgroundColor:
                          selected || pressed ? theme.selected : "transparent",
                      })}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: selected ? theme.selected : theme.elevated,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons
                          name={icon}
                          size={22}
                          color={selected ? theme.accent : theme.text}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: selected ? theme.accent : theme.text,
                          fontSize: 16,
                          fontWeight: selected ? "700" : "500",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {label}
                      </Text>
                      <MaterialIcons
                        name={rtl ? "chevron-left" : "chevron-right"}
                        size={20}
                        color={theme.muted}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
            <View
              style={{
                borderTopWidth: 1,
                borderColor: theme.border,
                paddingTop: 20,
                paddingHorizontal: 10,
                gap: 6,
              }}
            >
              <Text
                raw
                style={{
                  color: theme.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Coded by AlHuDaR
              </Text>
              <Text
                raw
                style={{ color: theme.muted, fontSize: 12 }}
              >
                {(rtl ? "الإصدار " : "Version ") + version}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Close menu")}
            onPress={dismiss}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </>
  );
}
export function BottomNavigation() {
  const theme = useTheme();
  const { t } = useLocale();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityLabel={t("Main navigation")}
      style={{
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderColor: theme.border,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        flexDirection: "row",
        flexShrink: 0,
      }}
    >
      {tabs.map(([label, href, icon]) => {
        const selected =
          path === href || (href === "/library" && path === "/downloads");
        const color = selected ? theme.accent : theme.muted;
        return (
          <Pressable
            key={href}
            accessibilityRole="tab"
            accessibilityLabel={t(label)}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => {
              usePlayerStore.getState().setExpanded(false);
              router.navigate(href as Href);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 54,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <MaterialIcons name={icon} size={22} color={color} style={{ backgroundColor: selected ? theme.selected : "transparent", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 3 }} />
            <Text style={{ color, fontSize: 11, textAlign: "center" }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
