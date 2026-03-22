import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Base path is set per deploy target:
//   nareshka.ru:   npx vite build --base=/poozix/
//   GitHub Pages:  npx vite build --base=/breakIntoMLbyPOOZIX/
//   Local dev:     npx vite (defaults to /)
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
