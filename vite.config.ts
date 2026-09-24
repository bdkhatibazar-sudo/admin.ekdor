import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/steadfast': {
          target: 'https://portal.steadfast.com.bd/api/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/steadfast/, ''),
        },
      },
    },
  };
});
