// Android's native intent module validates and opens external YouTube links.
// Route external URLs to the home shell, never to an arbitrary Expo Router path.
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  if (/^https?:/i.test(path) || path.startsWith("harmonia:")) return "/";
  return path;
}
