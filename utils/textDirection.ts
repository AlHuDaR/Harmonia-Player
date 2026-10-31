export type TextDirection = "rtl" | "ltr";

/** First strong letter, ignoring digits, punctuation, combining marks and bidi controls. */
export function textDirection(
  text: string,
  fallback: TextDirection = "ltr",
): TextDirection {
  for (const character of text) {
    if (!/\p{Letter}/u.test(character)) continue;
    return /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u.test(
      character,
    )
      ? "rtl"
      : "ltr";
  }
  return fallback;
}

/** Normalize only at the search boundary; never rewrite the editable input. */
export const searchTerm = (text: string) => text.trim().normalize("NFC");
