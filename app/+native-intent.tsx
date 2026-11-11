// Android's native intent module validates and opens external web links.
// Route external URLs to the home shell, never to an arbitrary Expo Router path.
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  if (path.length > 4096 || /^(?:https?|harmonia):/i.test(path)) return "/";
  return path;
}
