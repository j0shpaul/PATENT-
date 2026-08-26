import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pipeToJsonPlugin = () => ({
  name: 'pipe-to-json',
  transform(code, id) {
    if (id.endsWith('.pipe')) {
      return {
        code: `export default ${code};`,
        map: null
      };
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), pipeToJsonPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
