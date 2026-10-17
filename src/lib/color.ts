const DARK_INK = "#1D2B28";
const LIGHT_INK = "#F3F1E7";

/** Luminans relatif WCAG dari warna "#RRGGBB". */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Warna tulisan di atas sampul `bg`: tinta gelap atau terang, mana yang kontrasnya lebih tinggi. */
export function readableInk(bg: string) {
  const l = luminance(bg);
  return contrast(l, luminance(DARK_INK)) >= contrast(l, luminance(LIGHT_INK)) ? DARK_INK : LIGHT_INK;
}
