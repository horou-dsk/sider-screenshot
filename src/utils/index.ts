export function getDpiPx(px: number) {
  return Math.ceil(px / window.devicePixelRatio);
}
