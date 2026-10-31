import React from "react";
import { Text as NativeText, type TextProps } from "react-native";
import { useLocale } from "@/utils/i18n";
import { textDirection } from "@/utils/textDirection";
export function Text({
  children,
  style,
  raw = false,
  ...props
}: TextProps & { raw?: boolean }) {
  const { t, rtl } = useLocale();
  const direction =
    raw && typeof children === "string"
      ? textDirection(children, rtl ? "rtl" : "ltr")
      : rtl
        ? "rtl"
        : "ltr";
  const localize = (v: React.ReactNode): React.ReactNode =>
    typeof v === "string" ? t(v) : Array.isArray(v) ? v.map(localize) : v;
  return (
    <NativeText
      {...props}
      style={[
        {
          textAlign: direction === "rtl" ? "right" : "left",
          writingDirection: direction,
        },
        style,
      ]}
    >
      {raw ? children : localize(children)}
    </NativeText>
  );
}
