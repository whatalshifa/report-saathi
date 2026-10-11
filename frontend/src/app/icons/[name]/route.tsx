import { appIcon } from "@/lib/appIcon";

// The app icons in the web app manifest, made once at build time. "maskable" fills the whole square and
// keeps the heart inside the middle, because phones crop it to a circle or a rounded square of their own.
const ICONS = {
  "192.png": { size: 192, maskable: false },
  "512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
} as const;

type Name = keyof typeof ICONS;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const icon = ICONS[name as Name];
  if (!icon) return new Response("Not found", { status: 404 });
  return appIcon(icon.size, icon.maskable);
}
