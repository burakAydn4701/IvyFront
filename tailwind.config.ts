import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme colors
        light: {
          primary: '#16a34a', // green-600
          background: '#fafaf9', // stone-50
          foreground: '#1c1917', // stone-900
          muted: '#78716c', // stone-500
          accent: '#dcfce7', // green-100
          surface: '#ffffff', // white
        },
        // Dark theme colors
        dark: {
          primary: '#a855f7', // purple-500
          background: '#1c1917', // stone-900
          foreground: '#fafaf9', // stone-50
          muted: '#78716c', // stone-500
          accent: '#2e1065', // purple-950
          surface: '#292524', // stone-800
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
