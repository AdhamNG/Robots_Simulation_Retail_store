import { defineConfig } from 'vite';
import { resolve } from 'path';

/** Shared proxy: MultiSet API + strip browser Origin headers (avoids VPS 403). */
const multisetProxy = {
  target: 'https://api.multiset.ai',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/multiset/, ''),
  secure: true,
  configure(proxy) {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
      proxyReq.removeHeader('sec-fetch-site');
      proxyReq.removeHeader('sec-fetch-mode');
      proxyReq.removeHeader('sec-fetch-dest');
      proxyReq.removeHeader('sec-fetch-user');
    });
  },
};

const previewPort = Number(process.env.PORT) || 4173;
const previewStrictPort = Boolean(process.env.PORT);
const devPort = Number(process.env.PORT) || 3000;

export default defineConfig({
  optimizeDeps: {
    exclude: ['recast-navigation', '@recast-navigation/core', '@recast-navigation/generators', '@recast-navigation/three'],
    include: ['monaco-editor'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: devPort,
    /** If 3000 (or PORT) is taken, use the next free port instead of exiting. */
    strictPort: false,
    https: false,
    /** Bind to localhost only; use `npm run dev:lan` to listen on all interfaces. */
    host: 'localhost',
    open: true,
    proxy: {
      '/api/multiset': multisetProxy,
    },
  },
  preview: {
    host: true,
    port: previewPort,
    strictPort: previewStrictPort,
    proxy: {
      '/api/multiset': multisetProxy,
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
});
