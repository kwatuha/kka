// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true
    },
    hmr: {
      overlay: false,
      clientPort: process.env.VITE_HMR_CLIENT_PORT || 5173,
      port: 5173,
      protocol: 'ws',
      host: process.env.VITE_HMR_HOST || 'localhost',
      timeout: 3000
    },
    ...(process.env.VITE_HMR_DISABLED === 'true' ? { hmr: false } : {}),
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://api:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@zoom/meetingsdk'],         // ← don't pre-bundle Zoom (it's UMD)
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'recharts',
      'zustand',
      'zod',
      'react-hook-form',
    ],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    commonjsOptions: {                     // ← tell Rollup to handle Zoom's CJS/UMD
      include: [/@zoom\/meetingsdk/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        }
      }
    },
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
    assetsInlineLimit: 4096
  }
});