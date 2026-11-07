/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        surface: {
          base: "#0a0a0c",       // Deep slate dark canvas
          card: "#121215",       // Elevated cards, sidebars, drawer shells
          elevated: "#18181c",   // Modals, dropdowns, elevated headers
          hover: "#1f1f26",      // Hover states, active tabs
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.06)",
          normal: "rgba(255, 255, 255, 0.10)",
          active: "rgba(255, 255, 255, 0.18)",
        },
        content: {
          primary: "#ededef",
          secondary: "#a1a1aa",
          muted: "#71717a",
        },
        difficulty: {
          easy: "#00b8a3",
          medium: "#ffc01e",
          hard: "#ff375f",
        },
      },
      letterSpacing: {
        tighter: "-0.035em",
        tight: "-0.02em",
      },
    },
  },
  plugins: [],
};
