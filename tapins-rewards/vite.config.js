import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the built bundle runs from any path — a static host,
  // a subfolder, or a shared preview link — without rewriting asset URLs.
  base: './',
  plugins: [react(), tailwindcss()],
})
