import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/vegvesen': {
        target: 'https://kjoretoyoppslag.atlas.vegvesen.no',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/api\/vegvesen/, '')
      }
    }
  }
})