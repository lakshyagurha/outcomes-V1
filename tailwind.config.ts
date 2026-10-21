import type { Config } from "tailwindcss";

/**
 * Design tokens adapted from supermemory.ai: Geist + Geist Mono, paper/ink neutrals,
 * a single electric blue, near-square corners, hairline rules and corner ticks.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0B1015", soft: "#1A2029" },
        accent: { DEFAULT: "#0562EF", hover: "#033A9A", soft: "#9EC6F7" },
        tint: "#F4F8FF",
        paper: "#F4F4F6",
        warm: "#FFFBF5",
        line: "#0B10151A",
        live: "#00C763",
        // Neutral greys re-derived from ink at fixed opacities, so every existing slate-* class follows the system.
        slate: {
          50: "#F7F7F9", 100: "#EDEDF0", 200: "#DFDFE3", 300: "#C4C6CB", 400: "#8A8D92",
          500: "#6D7075", 600: "#55595E", 700: "#3B3F45", 800: "#24282E", 900: "#14181D",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: { card: "4px", lg: "3px", xl: "4px", "2xl": "6px" },
      boxShadow: { soft: "0 1px 0 rgba(11,16,21,0.04)" },
      maxWidth: { content: "1100px" },
      keyframes: { marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } } },
      transitionTimingFunction: { out: "cubic-bezier(.22,1,.36,1)", cta: "cubic-bezier(.23,1,.32,1)" },
    },
  },
  plugins: [],
};
export default config;
