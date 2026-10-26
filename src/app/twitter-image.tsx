import { renderShareImage, SHARE_ALT } from "@/lib/og/share-image";

export const alt = SHARE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderShareImage();
}
