/** Helpers for using each program's own brand colour safely on our UI. */
export const FALLBACK_BRAND = "#0B1015";

export function brandOf(color?: string | null) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK_BRAND;
}

/** Relative luminance (WCAG). */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Text colour that stays readable on top of the brand colour. */
export const onBrand = (hex: string) => (luminance(hex) > 0.45 ? "#0B1015" : "#FFFBF5");

/** Very light wash of the brand colour, for backgrounds. */
export const brandWash = (hex: string, alpha = 0.08) => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
