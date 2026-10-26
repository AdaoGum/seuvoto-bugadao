/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // npm run dev:api (wrangler, porta 8787) responde a API; o Vite só serve o site.
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
