import '@styles/main.css';

import { initCart } from '@features/cart/state.ts';
import { initCartUI } from '@features/cart/ui.ts';
import {
  renderProductGrid,
  renderProductDetail,
  initAddToCart,
} from '@features/products/render.ts';
import { initSearchFilters } from '@features/products/search-ui.ts';
import { initWishlist } from '@features/user/Wishlist.ts';
import { initNewsletter } from '@features/auth/Newsletter.ts';
import { initLazyImages } from '@utils/images.ts';

document.addEventListener('DOMContentLoaded', async () => {
  initLazyImages();
  await initCart();
  initCartUI();
  initWishlist();
  initNewsletter();
  initSearchFilters();
  initAddToCart();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }

  if (document.querySelector('.product-grid')) {
    renderProductGrid();
  }

  if (document.querySelector('#product-detail-root')) {
    renderProductDetail();
  }
});
