import { getProduct } from './catalog.ts';
import {
  getFilteredProducts,
  subscribe as subscribeFilters,
} from './filters.ts';
import { formatCurrency } from '@utils/format.ts';
import { addToCart, type AddToCartInput } from '@features/cart/state.ts';
import { openCart } from '@features/cart/ui.ts';
import { showToast } from '@components/ui/Toast.ts';
import type { Product } from '@app-types/cart.ts';


/* ================================
   Product Card
================================ */

function createProductCard(product: Product): string {
  return `
    <article
      class="product-card"
      data-product-id="${product.id}"
      data-name="${product.name}"
      data-price="${product.price}"
      data-image="${product.image}"
    >

      <a
        class="product-image-link"
        href="product.html?id=${product.id}"
        aria-label="View ${product.name}"
      >
        <div class="product-image">
          <img
            src="${product.image}"
            alt="${product.name}"
            width="700"
            height="560"
            loading="lazy"
            decoding="async"
          />

          <span class="wishlist" role="button" tabindex="0">
            ♡
          </span>
        </div>
      </a>

      <div class="product-info">

        <a
          class="product-name-link"
          href="product.html?id=${product.id}"
        >
          <h3 class="product-name">${product.name}</h3>
        </a>

        <div class="price-line">
          <span class="price-text">
            ${formatCurrency(product.price)}
          </span>

          ${
            product.oldPrice
              ? `<span class="old-price">
                   ${formatCurrency(product.oldPrice)}
                 </span>`
              : ''
          }
        </div>

        <div class="product-rating">
          <span class="rating">
            ${product.rating || ''}
          </span>

          <span class="reviews">
            ${product.reviews || ''}
          </span>
        </div>

        <button
          class="add-to-cart"
          type="button"
          data-product-id="${product.id}"
        >
          Add to cart
        </button>

      </div>
    </article>
  `;
}


/* ================================
   Product Grid
================================ */

let currentContainer: Element | null = null;

export function renderProductGrid(
  containerSelector = '.product-grid'
): void {

  const container = document.querySelector(containerSelector);

  if (!container) return;

  currentContainer = container;

  const products = getFilteredProducts();

  container.innerHTML = products
    .map(createProductCard)
    .join('');

  bindAddToCartButtons(container);
}


/* ================================
   Bind Buttons
================================ */

let addToCartBound = false;

function ensureAddToCartDelegation(): void {
  if (addToCartBound) return;
  document.addEventListener('click', onDocumentClick);
  addToCartBound = true;
}

function bindAddToCartButtons(container: Element): void {
  ensureAddToCartDelegation();

  container
    .querySelectorAll<HTMLButtonElement>('.add-to-cart')
    .forEach(button => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', handleAddToCart);
    });

  container.querySelectorAll<HTMLElement>('.wishlist').forEach(button => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', handleWishlist);
  });
}

function onDocumentClick(event: Event): void {
  const target = event.target as Element | null;
  if (!target) return;

  const addButton = target.closest('.add-to-cart') as HTMLButtonElement | null;
  if (addButton) {
    // Always handle via one path; skip if the button already has a direct listener
    if (addButton.dataset.bound === 'true') return;
    void handleAddToCart(event);
    return;
  }

  const wishlist = target.closest('.wishlist') as HTMLElement | null;
  if (wishlist && wishlist.dataset.bound !== 'true') {
    handleWishlist(event);
  }
}

/** Call once on page load so static HTML add-to-cart buttons work. */
export function initAddToCart(): void {
  ensureAddToCartDelegation();
  document.querySelectorAll('.product-grid, .product-detail').forEach(container => {
    bindAddToCartButtons(container);
  });
}


/* ================================
   Add To Cart
================================ */

async function handleAddToCart(
  event: Event
): Promise<void> {
  event.preventDefault();
  event.stopPropagation();

  const target = event.target as Element | null;
  const button =
    (event.currentTarget instanceof HTMLButtonElement &&
    event.currentTarget.classList.contains('add-to-cart')
      ? event.currentTarget
      : target?.closest('.add-to-cart')) as HTMLButtonElement | null;

  if (!button) return;

  const productCard =
    button.closest('.product-card') as HTMLElement | null;
  const productDetail =
    button.closest('.product-detail') as HTMLElement | null;
  const source = productCard || productDetail;

  if (!source) {
    console.error('Could not find product container');
    return;
  }

  const productId =
    source.dataset.productId || source.dataset.id;
  const name = source.dataset.name;
  const price = Number(source.dataset.price);
  const image = source.dataset.image || '';

  if (!productId) {
    showToast('Product ID is missing');
    return;
  }

  if (!name) {
    showToast('Product name is missing');
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    showToast('Invalid product price');
    return;
  }

  if (button.disabled) return;

  const originalText = button.textContent || 'Add to cart';
  button.disabled = true;
  button.textContent = 'Adding...';

  const input: AddToCartInput = {
    id: String(productId),
    name,
    price,
    image,
  };

  try {
    await addToCart(input);
    showToast(`${name} added to cart`);
    setCartButtonLabel(button);
    openCart();
  } catch (error) {
    console.error('Add to cart failed:', error);
    button.disabled = false;
    button.textContent = originalText;
    showToast('Could not add product to cart');
  }
}


/* ================================
   Wishlist
================================ */

function handleWishlist(
  event: Event
): void {

  event.preventDefault();
  event.stopPropagation();

  const button =
    event.currentTarget as HTMLElement;

  button.classList.toggle('active');

  button.textContent =
    button.classList.contains('active')
      ? '♥'
      : '♡';
}


/* ================================
   Button Feedback
================================ */

function setCartButtonLabel(
  button: HTMLButtonElement | null
): void {

  if (!button) return;

  button.textContent = 'Added';

  button.disabled = true;

  setTimeout(() => {
    button.textContent = 'Add to cart';
    button.disabled = false;
  }, 1200);
}


/* ================================
   Filter Subscription
================================ */

subscribeFilters(() => {

  if (!currentContainer) return;

  const products =
    getFilteredProducts();

  currentContainer.innerHTML =
    products
      .map(createProductCard)
      .join('');

  bindAddToCartButtons(
    currentContainer
  );
});


/* ================================
   Product Detail
================================ */

export function renderProductDetail(
  rootSelector = '#product-detail-root'
): void {

  const rootEl =
    document.querySelector(
      rootSelector
    ) as HTMLElement | null;

  if (!rootEl) return;

  const root = rootEl;

  const params =
    new URLSearchParams(
      window.location.search
    );

  const productId =
    params.get('id') ||
    'linen-blend-blazer';

  const product =
    getProduct(productId);

  if (!product) {
    root.innerHTML = `
      <p>Product not found.</p>
    `;

    return;
  }

  root.dataset.id =
    String(product.id);

  root.dataset.name =
    product.name;

  root.dataset.price =
    String(product.price);

  root.dataset.image =
    product.image;

  root.innerHTML = `
    <div class="product-detail-image">
      <img
        src="${product.image}"
        alt="${product.name}"
      />
    </div>

    <div class="product-detail-content">

      <p class="product-detail-breadcrumb">
        Fashion / New Arrivals
      </p>

      <h1>${product.name}</h1>

      <div class="product-detail-price">

        <strong>
          ${formatCurrency(product.price)}
        </strong>

        ${
          product.oldPrice
            ? `<span>
                 ${formatCurrency(product.oldPrice)}
               </span>`
            : ''
        }

      </div>

      <div class="product-detail-meta">
        <span>${product.rating || ''}</span>
        <span>${product.reviews || ''}</span>
      </div>

      <p class="product-detail-description">
        ${product.description}
      </p>

      <div class="product-detail-options">

        <fieldset class="option-group">
          <legend>Size</legend>
          <div
            class="size-options"
            id="size-options"
          ></div>
        </fieldset>

        <fieldset class="option-group">
          <legend>Color</legend>
          <div
            class="color-options"
            id="color-options"
          ></div>
        </fieldset>

      </div>

      <div class="product-detail-actions">

        <button
          class="add-to-cart"
          type="button"
          disabled
        >
          Loading...
        </button>

        <a
          class="secondary-btn"
          href="index.html"
        >
          Continue shopping
        </a>

      </div>

      <ul class="product-detail-list">
        ${product.features
          .map(
            feature => `<li>${feature}</li>`
          )
          .join('')}
      </ul>

    </div>
  `;


  /* ================================
     Load Product Variants
  ================================= */

  const detailAddToCartButton =
    root.querySelector(
      '.add-to-cart'
    ) as HTMLButtonElement | null;

  fetch(
    `/api/products/${encodeURIComponent(productId)}/variants`
  )
    .then(async response => {

      if (!response.ok) {
        throw new Error(
          `Variant request failed: ${response.status}`
        );
      }

      return response.json();
    })

    .then(
      (
        variants: Array<{
          id: number;
          size: string | null;
          color: string | null;
        }>
      ) => {

        const sizes = [
          ...new Set(
            variants
              .map(v => v.size)
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        ];

        const colors = [
          ...new Set(
            variants
              .map(v => v.color)
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        ];

        const sizeOptions =
          root.querySelector(
            '#size-options'
          );

        const colorOptions =
          root.querySelector(
            '#color-options'
          );

        let selectedSize:
          string | null = null;

        let selectedColor:
          string | null = null;

        let selectedVariantId:
          number | null = null;


        /* ================================
           Render Variant Options
        ================================= */

        function renderOptions(): void {

          if (sizeOptions) {

            sizeOptions.innerHTML =
              sizes
                .map(
                  size => `
                    <button
                      type="button"
                      class="option-btn size-btn ${
                        selectedSize === size
                          ? 'selected'
                          : ''
                      }"
                      data-size="${size}"
                    >
                      ${size}
                    </button>
                  `
                )
                .join('');
          }


          if (colorOptions) {

            colorOptions.innerHTML =
              colors
                .map(
                  color => `
                    <button
                      type="button"
                      class="option-btn color-btn ${
                        selectedColor === color
                          ? 'selected'
                          : ''
                      }"
                      data-color="${color}"
                    >
                      ${color}
                    </button>
                  `
                )
                .join('');
          }


          /*
           * Find the exact variant.
           *
           * If the product has both size and color,
           * require both to be selected.
           */

          const requiresSize =
            sizes.length > 0;

          const requiresColor =
            colors.length > 0;

          const hasRequiredSize =
            !requiresSize ||
            Boolean(selectedSize);

          const hasRequiredColor =
            !requiresColor ||
            Boolean(selectedColor);


          if (
            hasRequiredSize &&
            hasRequiredColor
          ) {

            const match =
              variants.find(variant => {

                const sizeMatches =
                  !requiresSize ||
                  variant.size === selectedSize;

                const colorMatches =
                  !requiresColor ||
                  variant.color === selectedColor;

                return (
                  sizeMatches &&
                  colorMatches
                );
              });

            selectedVariantId =
              match?.id ?? null;

          } else {

            selectedVariantId = null;
          }


          const addButton =
            root.querySelector(
              '.add-to-cart'
            ) as HTMLButtonElement | null;

          if (!addButton) return;


          if (
            !requiresSize &&
            !requiresColor
          ) {

            addButton.disabled = false;
            addButton.textContent =
              'Add to cart';

          } else if (
            selectedVariantId !== null
          ) {

            addButton.disabled = false;
            addButton.textContent =
              'Add to cart';

          } else {

            addButton.disabled = true;
            addButton.textContent =
              'Select options first';
          }
        }


        /* ================================
           Size Selection
        ================================= */

        sizeOptions?.addEventListener(
          'click',
          event => {

            const target =
              event.target as HTMLElement;

            const button =
              target.closest(
                '.size-btn'
              ) as HTMLElement | null;

            if (!button) return;

            selectedSize =
              button.dataset.size || null;

            renderOptions();
          }
        );


        /* ================================
           Color Selection
        ================================= */

        colorOptions?.addEventListener(
          'click',
          event => {

            const target =
              event.target as HTMLElement;

            const button =
              target.closest(
                '.color-btn'
              ) as HTMLElement | null;

            if (!button) return;

            selectedColor =
              button.dataset.color || null;

            renderOptions();
          }
        );


        renderOptions();


        /* ================================
           Detail Add To Cart
        ================================= */

        detailAddToCartButton?.addEventListener(
          'click',
          async () => {

            const id =
              root.dataset.id;

            const name =
              root.dataset.name;

            const price =
              Number(root.dataset.price);

            const image =
              root.dataset.image || '';


            if (
              !id ||
              !name ||
              !Number.isFinite(price) ||
              price <= 0
            ) {

              showToast(
                'Invalid product information'
              );

              return;
            }


            if (
              (sizes.length > 0 ||
                colors.length > 0) &&
              selectedVariantId === null
            ) {

              showToast(
                'Please select your options'
              );

              return;
            }


            const input: AddToCartInput = {
              id: String(id),
              name,
              price,
              image,
              variantId:
                selectedVariantId ??
                undefined
            };


            const button =
              detailAddToCartButton;

            if (!button) return;

            button.disabled = true;
            button.textContent = 'Adding...';


            try {

              console.log(
                'Adding detail product:',
                input
              );

              await addToCart(input);

              showToast(
                `${name} added to cart`
              );

              setCartButtonLabel(button);

            } catch (error) {

              console.error(
                'Failed to add detail product:',
                error
              );

              button.disabled = false;
              button.textContent =
                'Add to cart';

              showToast(
                'Could not add product to cart'
              );
            }
          }
        );
      }
    )

    .catch(error => {

      console.error(
        'Failed to load variants:',
        error
      );

      /*
       * If variants cannot be loaded,
       * allow normal products to be added.
       */

      const button =
        root.querySelector(
          '.add-to-cart'
        ) as HTMLButtonElement | null;

      if (!button) return;

      button.disabled = false;
      button.textContent =
        'Add to cart';


      button.addEventListener(
        'click',
        async () => {

          const id =
            root.dataset.id;

          const name =
            root.dataset.name;

          const price =
            Number(root.dataset.price);

          const image =
            root.dataset.image || '';


          if (
            !id ||
            !name ||
            !Number.isFinite(price) ||
            price <= 0
          ) {

            showToast(
              'Invalid product information'
            );

            return;
          }


          button.disabled = true;
          button.textContent =
            'Adding...';


          try {

            await addToCart({
              id: String(id),
              name,
              price,
              image
            });

            showToast(
              `${name} added to cart`
            );

            setCartButtonLabel(button);

          } catch (error) {

            console.error(
              'Add to cart failed:',
              error
            );

            button.disabled = false;
            button.textContent =
              'Add to cart';

            showToast(
              'Could not add product to cart'
            );
          }
        }
      );
    });
}
