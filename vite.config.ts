import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        shop: 'shop.html',
        product: 'product.html',
        checkout: 'checkout.html',
        'order-success': 'order-success.html',
        lookbook: 'lookbook.html',
        about: 'about.html',
        admin: 'admin.html'
      }
    }
  },
  server: {
    port: 3000
  }
});