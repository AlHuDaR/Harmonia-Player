import React from "react";
import { Text as NativeText, type TextProps } from "react-native";
import { useLocale } from "@/utils/i18n";
export function Text({
  children,
  style,
  raw = false,
  ...props
}: TextProps & { raw?: boolean }) {
  const { t, rtl } = useLocale();
  const localize = (v: React.ReactNode): React.ReactNode =>
    typeof v === "string" ? t(v) : Array.isArray(v) ? v.map(localize) : v;
  return (
    <NativeText
      {...props}
      style={[
        {
          textAlign: rtl ? "right" : "left",
          writingDirection: rtl ? "rtl" : "ltr",
        },
        style,
      ]}
    >
      {raw ? children : localize(children)}
    </NativeText>
  );
}
