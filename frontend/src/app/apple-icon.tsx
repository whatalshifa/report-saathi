import { appIcon } from "@/lib/appIcon";

// The icon an iPhone uses for "Add to Home Screen". iOS rounds the corners itself, so the plum fills
// the square, like the maskable icon in the manifest.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(size.width, true);
}
