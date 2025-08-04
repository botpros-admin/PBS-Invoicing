/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/styles/global.css', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#9EA0A2', // Original Gray
        secondary: '#0078D7',
      }
    },
  },
  plugins: [],
};