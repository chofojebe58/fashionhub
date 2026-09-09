import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        product: path.resolve(__dirname, 'public/product.html'),
        shop: path.resolve(__dirname, 'public/shop.html'),
        cart: path.resolve(__dirname, 'public/checkout.html'),
        admin: path.resolve(__dirname, 'public/admin.html'),
        lookbook: path.resolve(__dirname, 'public/lookbook.html'),
        about: path.resolve(__dirname, 'public/about.html'),
        'order-success': path.resolve(__dirname, 'public/order-success.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@styles': path.resolve(__dirname, 'src/styles')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});