import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),     // This is the new correct way for Tailwind v4
  ],
  server: {
    port: 5173,
  },
})