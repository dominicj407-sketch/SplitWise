/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Gold -- the app's single brand/action color (buttons, links, active states, accents).
        primary: {
          50: '#fbf4e1',
          100: '#f5e6be',
          200: '#ecd08a',
          300: '#e3b94f',
          400: '#d4af37',
          500: '#c29a2e',
          600: '#a67f22',
          700: '#83631a',
          800: '#614815',
          900: '#453310',
          950: '#2b1f0a',
        },
        accent: {
          50: '#fbf4e1',
          100: '#f5e6be',
          200: '#ecd08a',
          300: '#e3b94f',
          400: '#d4af37',
          500: '#c29a2e',
          600: '#a67f22',
          700: '#83631a',
          800: '#614815',
          900: '#453310',
        },
        // Warm charcoal/black -- replaces Tailwind's default cool gray everywhere in the app,
        // since the app is now permanently dark-themed (see ThemeContext.tsx).
        gray: {
          50: '#ecebe9',
          100: '#d9d7d3',
          200: '#bfbcb6',
          300: '#a5a29a',
          400: '#85827a',
          500: '#666359',
          600: '#4a4842',
          700: '#302e2a',
          800: '#1c1b18',
          900: '#0f0e0d',
          950: '#060605',
        },
      },
    },
  },
  plugins: [],
};
