/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          400: '#00f5a0',
          500: '#00d68f',
        }
      }
    },
  },
  plugins: [],
}