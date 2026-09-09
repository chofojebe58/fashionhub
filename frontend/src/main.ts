import { initCart } from './cart/state.ts';
import { initCartUI } from './cart/ui.ts';
import { renderProductGrid, renderProductDetail } from './products/render.ts';
import { initSearchFilters } from './products/search-ui.ts';
import { initWishlist } from './ui/wishlist.ts';
import { initNewsletter } from './ui/newsletter.ts';
import { registerServiceWorker } from './ui/service-worker.ts';
import { initLazyImages } from './utils/images.ts';

document.addEventListener('DOMContentLoaded', async () => {
  initLazyImages();
  await initCart();
  initCartUI();
  initWishlist();
  initNewsletter();
  initSearchFilters();
  registerServiceWorker();

  if (document.querySelector('.product-grid')) {
    renderProductGrid();
  }

  if (document.querySelector('#product-detail-root')) {
    renderProductDetail();
  }
});
