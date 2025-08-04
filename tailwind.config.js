/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/styles/global.css', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        secondary: '#0078D7',
      }
    },
  },
  plugins: [],
};