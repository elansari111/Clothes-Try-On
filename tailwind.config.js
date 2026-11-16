/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0D13',
        surface: {
          DEFAULT: '#131620',
          hover: '#1B1F2D',
          border: '#24293D',
        },
        primary: {
          DEFAULT: '#6366F1', // Electric Indigo / Violet
          hover: '#4F46E5',
          light: '#818CF8',
          subtle: 'rgba(99, 102, 241, 0.12)',
        },
        accent: {
          cyan: '#06B6D4',
          purple: '#A855F7',
          pink: '#EC4899',
        },
        muted: {
          DEFAULT: '#8E95AA',
          light: '#BEC4D5',
          dark: '#58607A',
        }
      },
    },
  },
  plugins: [],
}
