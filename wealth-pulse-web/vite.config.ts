import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 9000,
        host: '0.0.0.0',
        proxy: {
          // 本地开发时，将以 /api 开头的请求转发到本地 Java 后端
          '/api': {
            target: 'http://localhost:9090',
            changeOrigin: true,
            // 保留 /api 前缀，和线上保持一致
            rewrite: (urlPath) => urlPath,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify("aaa"),
        'process.env.GEMINI_API_KEY': JSON.stringify("bbb")
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
