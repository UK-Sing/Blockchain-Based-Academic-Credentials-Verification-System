/** @type {import('tailwindcss').Config} */
// Design rule: solid colours only (no alpha/opacity) and no shadows. Every tint below is a
// pre-mixed solid hex, so use these tokens instead of `/opacity` modifiers.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        rule: "#E3E0D6",
        ink: {
          DEFAULT: "#14213D",
          light: "#2B3A5C",
          muted: "#5B6B8C",
          placeholder: "#9AA5BC",
          line: "#C9CFDB",
          faint: "#EEF0F4",
          soft: "#F6F7F9",
          deep: "#0D1730",
        },
        seal: {
          DEFAULT: "#0F5C52",
          dark: "#0A3F38",
          line: "#A9CFC8",
          light: "#E4F0EE",
          bright: "#5FD1BE",
        },
        amber: {
          DEFAULT: "#B45309",
          line: "#EBC79E",
          light: "#FBEBD9",
        },
        danger: {
          DEFAULT: "#9F1D22",
          dark: "#841519",
          line: "#EDB4B1",
          light: "#FBE7E6",
        },
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
