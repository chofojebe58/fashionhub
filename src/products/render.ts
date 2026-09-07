import { getProduct } from './catalog.ts';
import { getFilteredProducts, subscribe as subscribeFilters } from './filters.ts';
import { formatCurrency } from '../utils/format.ts';
import { addToCart, type AddToCartInput } from '../cart/state.ts';
import { showToast } from '../ui/toast.ts';
import type { Product } from '../types/cart.ts';

function createProductCard(product: Product): string {
  return `
    <article class="product-card" data-product-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image}" data-id="${product.id}">
      <a class="product-image-link" href="product.html?id=${product.id}" aria-label="View ${product.name}">
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}" width="700" height="560" loading="lazy" decoding="async" />
          <span class="wishlist">♡</span>
        </div>
      </a>
      <div class="product-info">
        <a class="product-name-link" href="product.html?id=${product.id}"><h3 class="product-name">${product.name}</h3></a>
        <div class="price-line">
          <span class="price-text">${formatCurrency(product.price)}</span>
          <span class="old-price">${product.oldPrice ? formatCurrency(product.oldPrice) : ''}</span>
        </div>
        <div>
          <span class="rating">${product.rating || ''}</span>
          <span class="reviews">${product.reviews || ''}</span>
        </div>
        <button class="add-to-cart" type="button">Add to cart</button>
      </div>
    </article>
  `;
}

let currentContainer: Element | null = null;

export function renderProductGrid(containerSelector = '.product-grid'): void {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  currentContainer = container;
  const products = getFilteredProducts();
  container.innerHTML = products.map(createProductCard).join('');
  bindAddToCartButtons(container);
}

function bindAddToCartButtons(container: Element): void {
  container.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', handleAddToCart);
  });

  container.querySelectorAll('.wishlist').forEach(button => {
    button.addEventListener('click', handleWishlist);
  });
}

function handleAddToCart(event: Event): void {
  const button = event.currentTarget as HTMLButtonElement;
  const productCard = button.closest('.product-card') as HTMLElement | null;
  const productDetail = button.closest('.product-detail') as HTMLElement | null;

  const productId = productCard?.dataset.productId || productDetail?.dataset.id;
  const name = productCard?.dataset.name || productDetail?.dataset.name;
  const price = Number(productCard?.dataset.price || productDetail?.dataset.price || 0);
  const image = productCard?.dataset.image || productDetail?.dataset.image || '';

  if (!productId || !name || !price) return;

  addToCart({ id: productId, name, price, image });
  showToast(`${name} added to cart`);
  setCartButtonLabel(button);
}

function handleWishlist(event: Event): void {
  const button = event.currentTarget as HTMLElement;
  button.classList.toggle('active');
  button.textContent = button.classList.contains('active') ? '♥' : '♡';
}

function setCartButtonLabel(button: HTMLButtonElement | null): void {
  if (!button) return;
  button.textContent = 'Added';
  button.disabled = true;
  setTimeout(() => {
    button.textContent = 'Add to cart';
    button.disabled = false;
  }, 700);
}

subscribeFilters(() => {
  if (currentContainer) {
    const products = getFilteredProducts();
    currentContainer.innerHTML = products.map(createProductCard).join('');
    bindAddToCartButtons(currentContainer);
  }
});

export function renderProductDetail(rootSelector = '#product-detail-root'): void {
  const root = document.querySelector(rootSelector) as HTMLElement | null;
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id') || 'linen-blend-blazer';
  const product = getProduct(productId);

  root.dataset.id = product.id;
  root.dataset.name = product.name;
  root.dataset.price = String(product.price);
  root.dataset.image = product.image;

  root.innerHTML = `
    <div class="product-detail-image">
      <img src="${product.image}" alt="${product.name}" />
    </div>
    <div class="product-detail-content">
      <p class="product-detail-breadcrumb">Fashion / New Arrivals</p>
      <h1>${product.name}</h1>
      <div class="product-detail-price">
        <strong>${formatCurrency(product.price)}</strong>
        <span>${product.oldPrice ? formatCurrency(product.oldPrice) : ''}</span>
      </div>
      <div class="product-detail-meta">
        <span>${product.rating}</span>
        <span>${product.reviews}</span>
      </div>
      <p class="product-detail-description">${product.description}</p>
      <div class="product-detail-options">
        <fieldset class="option-group">
          <legend>Size</legend>
          <div class="size-options" id="size-options"></div>
        </fieldset>
        <fieldset class="option-group">
          <legend>Color</legend>
          <div class="color-options" id="color-options"></div>
        </fieldset>
      </div>
      <div class="product-detail-actions">
        <button class="add-to-cart" type="button" disabled>Select options first</button>
        <a class="secondary-btn" href="index.html">Continue shopping</a>
      </div>
      <ul class="product-detail-list">
        ${product.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  `;

  // Load variants from API
  const detailAddToCartButton = root.querySelector('.add-to-cart') as HTMLButtonElement | null;

  fetch(`/api/products/${productId}/variants`)
    .then(r => r.json())
    .then((variants: Array<{ id: number; size: string | null; color: string | null }>) => {
      const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
      const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];

      const sizeOptions = document.getElementById('size-options');
      const colorOptions = document.getElementById('color-options');
      let selectedSize: string | null = null;
      let selectedColor: string | null = null;
      let selectedVariantId: number | null = null;

      function renderOptions() {
        if (sizeOptions) {
          sizeOptions.innerHTML = sizes
            .map(
              s => `
            <button type="button" class="option-btn size-btn ${selectedSize === s ? 'selected' : ''}" data-size="${s}">${s}</button>
          `
            )
            .join('');
        }
        if (colorOptions) {
          colorOptions.innerHTML = colors
            .map(
              c => `
            <button type="button" class="option-btn color-btn ${selectedColor === c ? 'selected' : ''}" data-color="${c}">${c}</button>
          `
            )
            .join('');
        }

        // Find matching variant
        const match = variants.find(
          v =>
            (!selectedSize || v.size === selectedSize) &&
            (!selectedColor || v.color === selectedColor)
        );
        selectedVariantId = match?.id || null;

        const addToCartBtn = root!.querySelector('.add-to-cart') as HTMLButtonElement | null;
        if (addToCartBtn) {
          if (selectedVariantId && sizes.length > 0 && colors.length > 0) {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'Add to cart';
          } else if (sizes.length === 0 && colors.length === 0) {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'Add to cart';
          } else {
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'Select options first';
          }
        }
      }

      sizeOptions?.addEventListener('click', e => {
        const btn = (e.target as HTMLElement).closest('.size-btn') as HTMLElement | null;
        if (btn) {
          selectedSize = btn.dataset.size || null;
          renderOptions();
        }
      });

      colorOptions?.addEventListener('click', e => {
        const btn = (e.target as HTMLElement).closest('.color-btn') as HTMLElement | null;
        if (btn) {
          selectedColor = btn.dataset.color || null;
          renderOptions();
        }
      });

      renderOptions();

      detailAddToCartButton?.addEventListener('click', () => {
        const productId = root.dataset.id;
        const name = root.dataset.name;
        const price = Number(root.dataset.price);
        const image = root.dataset.image || '';
        if (!productId || !name || !price) return;
        const input: AddToCartInput = {
          id: productId,
          name,
          price,
          image,
          variantId: selectedVariantId ?? undefined,
        };
        addToCart(input);
        showToast(`${name} added to cart`);
        setCartButtonLabel(detailAddToCartButton);
      });
    })
    .catch(err => {
      console.error('Failed to load variants:', err);
      // Fallback: no variants
      const addToCartBtn = root.querySelector('.add-to-cart') as HTMLButtonElement | null;
      if (addToCartBtn) {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = 'Add to cart';
      }
      detailAddToCartButton?.addEventListener('click', handleAddToCart);
    });
}
