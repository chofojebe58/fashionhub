document.addEventListener('DOMContentLoaded', () => {
  const wishlistButtons = document.querySelectorAll('.wishlist');
  const subscribeForms = document.querySelectorAll('.subscribe-form, .footer-email');
  const cartToggle = document.querySelector('.cart-toggle');
  const cartPanel = document.querySelector('.cart-panel');
  const closeCartButton = document.querySelector('.close-cart');
  const cartCount = document.querySelector('.cart-count');
  const cartItemsList = document.querySelector('.cart-items');
  const cartTotal = document.querySelector('.cart-total');
  const addToCartButtons = document.querySelectorAll('.add-to-cart');
  const productDetailRoot = document.querySelector('#product-detail-root');

  // Set lazy loading and async decoding for images for better performance
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const STORAGE_KEY = 'fashionhub-cart';

  const ORDERS_KEY = 'fashionhub-orders';
  const PRODUCTS_KEY = 'fashionhub-products';

  const getOrders = () => {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  };

  const saveOrderToOrders = (order) => {
    try {
      const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      existing.push(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(existing));
    } catch (e) {
      // ignore
    }
  };

  const loadProductsFromStorage = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || 'null');
      if (!saved) return null;
      if (Array.isArray(saved)) {
        const map = {};
        saved.forEach(p => { if (p && p.id) map[p.id] = p; });
        return map;
      }
      return saved;
    } catch (e) {
      return null;
    }
  };

  const loadCart = () => {
    try {
      const savedCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(savedCart) ? savedCart : [];
    } catch (error) {
      return [];
    }
  };

  const saveCart = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  };

  const cart = loadCart();

  const setCartButtonLabel = (button) => {
    if (!button) return;
    button.textContent = 'Added';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = 'Add to cart';
      button.disabled = false;
    }, 700);
  };

  const renderCart = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (cartCount) cartCount.textContent = String(totalItems);
    if (cartTotal) cartTotal.textContent = formatCurrency(totalPrice);

    if (!cartItemsList) return;

    if (!cart.length) {
      cartItemsList.innerHTML = '<li class="empty-cart">Your cart is empty.</li>';
      saveCart();
      return;
    }

    saveCart();

    cartItemsList.innerHTML = cart.map((item, index) => `
      <li class="cart-item" data-index="${index}">
        <img src="${item.image}" alt="${item.name}" />
        <div class="cart-item-content">
          <strong>${item.name}</strong>
          <span>${formatCurrency(item.price)} each</span>
          <div class="cart-item-actions">
            <div class="qty-control" aria-label="Quantity controls for ${item.name}">
              <button class="qty-btn qty-decrease" type="button" data-index="${index}" aria-label="Decrease quantity for ${item.name}">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn qty-increase" type="button" data-index="${index}" aria-label="Increase quantity for ${item.name}">+</button>
            </div>
            <button class="remove-item" type="button" aria-label="Remove ${item.name}">Remove</button>
          </div>
        </div>
      </li>
    `).join('');

    cartItemsList.querySelectorAll('.qty-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const productIndex = Number(button.dataset.index);
        const item = cart[productIndex];
        if (!item) return;

        if (button.classList.contains('qty-increase')) {
          item.quantity += 1;
        } else if (button.classList.contains('qty-decrease')) {
          if (item.quantity <= 1) {
            cart.splice(productIndex, 1);
          } else {
            item.quantity -= 1;
          }
        }

        saveCart();
        renderCart();
      });
    });

    cartItemsList.querySelectorAll('.remove-item').forEach((button) => {
      button.addEventListener('click', () => {
        const productName = button.getAttribute('aria-label').replace('Remove ', '');
        const productIndex = cart.findIndex((item) => item.name === productName);

        if (productIndex >= 0) {
          cart.splice(productIndex, 1);
          saveCart();
          renderCart();
        }
      });
    });
  };

  let openCart = () => {
    if (!cartPanel) return;
    cartPanel.classList.add('open');
    // mark as open for accessibility and move focus to close button
    cartToggle?.setAttribute('aria-expanded', 'true');
    cartPanel?.setAttribute('aria-hidden', 'false');
    closeCartButton?.focus();
  };

  let closeCart = () => {
    if (!cartPanel) return;
    cartPanel.classList.remove('open');
    cartToggle?.setAttribute('aria-expanded', 'false');
    cartPanel?.setAttribute('aria-hidden', 'true');
    cartToggle?.focus();
  };

  cartToggle?.addEventListener('click', () => {
    if (cartPanel?.classList.contains('open')) {
      closeCart();
    } else {
      openCart();
    }
  });

  // Close cart on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartPanel?.classList.contains('open')) {
      closeCart();
    }
  });

  closeCartButton?.addEventListener('click', closeCart);

  document.querySelectorAll('.checkout-btn').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  });

  document.addEventListener('click', (event) => {
    const clickedCartToggle = event.target.closest('.cart-toggle');
    const clickedCartPanel = event.target.closest('.cart-panel');

    if (!clickedCartToggle && !clickedCartPanel && cartPanel) {
      closeCart();
    }
  });

  const addProductToCart = (button) => {
    const productCard = button.closest('.product-card');
    const productDetail = button.closest('.product-detail');

    const name = productCard?.dataset.name || productDetail?.dataset.name;
    const price = Number(productCard?.dataset.price || productDetail?.dataset.price || 0);
    const image = productCard?.dataset.image || productDetail?.dataset.image || '';

    if (!name || !price) return;

    const existingItem = cart.find((item) => item.name === name);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ name, price, quantity: 1, image });
    }

    saveCart();
    renderCart();
    openCart();
    setCartButtonLabel(button);
    // show small toast notification
    showToast(`${name} added to cart`);
  };

  // Simple toast system
  const showToast = (text) => {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      Object.assign(container.style, {
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 9999,
      });
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    Object.assign(el.style, {
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '0.6rem 0.9rem',
      marginTop: '0.4rem',
      borderRadius: '6px',
      fontSize: '0.95rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
    });

    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 2000);
  };

  addToCartButtons.forEach((button) => {
    button.addEventListener('click', () => addProductToCart(button));
  });

  wishlistButtons.forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
      button.textContent = button.classList.contains('active') ? '♥' : '♡';
    });
  });

  subscribeForms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input');
      if (!input) return;

      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }

      // persist subscriber email for prefilling checkout
      try {
        localStorage.setItem('fashionhub-subscriber-email', value);
      } catch (e) {
        // ignore
      }

      input.value = '';
      input.placeholder = 'Thanks for subscribing!';
    });
  });

  // load product catalog from localStorage if present, otherwise use defaults
  let productCatalog = loadProductsFromStorage();
  if (!productCatalog) {
    productCatalog = {
      'linen-blend-blazer': {
        id: 'linen-blend-blazer',
        name: 'Linen Blend Blazer',
        price: 89.99,
        oldPrice: 129.99,
        image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
        description: 'A tailored, lightweight essential designed to bring structure and softness to your everyday wardrobe.',
        features: ['Premium linen blend texture', 'Relaxed tailored fit', 'Made for layering all season'],
        rating: '★★★★★',
        reviews: '(124 reviews)'
      },
      'ribbed-knit-top': {
        id: 'ribbed-knit-top',
        name: 'Ribbed Knit Top',
        price: 25.99,
        oldPrice: 49.0,
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
        description: 'Soft-touch knitwear with a flattering silhouette that layers beautifully from work to weekend.',
        features: ['Breathable cotton blend', 'Stretch comfort fit', 'Elevated everyday staple'],
        rating: '★★★★★',
        reviews: '(98 reviews)'
      },
      'wide-leg-trousers': {
        id: 'wide-leg-trousers',
        name: 'Wide Leg Trousers',
        price: 59.99,
        oldPrice: 85.99,
        image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
        description: 'Crafted to create a fluid silhouette with a polished finish that moves effortlessly through the day.',
        features: ['Soft drape fabric', 'Comfortable high-rise waist', 'Day-to-evening versatility'],
        rating: '★★★★★',
        reviews: '(181 reviews)'
      },
      'leather-shoulder-bag': {
        id: 'leather-shoulder-bag',
        name: 'Leather Shoulder Bag',
        price: 79.99,
        oldPrice: 110.0,
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
        description: 'A refined everyday companion with structured lines, room for essentials, and timeless appeal.',
        features: ['Full-grain leather finish', 'Spacious interior', 'Adjustable strap comfort'],
        rating: '★★★★★',
        reviews: '(112 reviews)'
      },
      'minimalist-strappy-heels': {
        id: 'minimalist-strappy-heels',
        name: 'Minimalist Strappy Heels',
        price: 49.99,
        oldPrice: 79.0,
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
        description: 'A sleek statement heel with a refined profile that elevates evening wear and special occasions alike.',
        features: ['Comfort cushioned insole', 'Lightweight design', 'Elegant evening-ready finish'],
        rating: '★★★★★',
        reviews: '(164 reviews)'
      }
    };
  }

  // Render product grid dynamically from productCatalog (so admin edits reflect)
  const productGrid = document.querySelector('.product-grid');
  if (productGrid) {
    productGrid.innerHTML = Object.values(productCatalog).map(p => `
      <article class="product-card" data-product-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-image="${p.image}">
        <a class="product-image-link" href="product.html?id=${p.id}" aria-label="View ${p.name}">
          <div class="product-image">
            <img src="${p.image}" alt="${p.name}" width="700" height="560" loading="lazy" decoding="async" />
            <span class="wishlist">♡</span>
          </div>
        </a>
        <div class="product-info">
          <a class="product-name-link" href="product.html?id=${p.id}"><h3 class="product-name">${p.name}</h3></a>
          <div class="price-line">
            <span class="price-text">$${p.price}</span>
            <span class="old-price">${p.oldPrice ? '$' + p.oldPrice : ''}</span>
          </div>
          <div>
            <span class="rating">${p.rating || ''}</span>
            <span class="reviews">${p.reviews || ''}</span>
          </div>
          <button class="add-to-cart" type="button">Add to cart</button>
        </div>
      </article>
    `).join('');

    // rebind add-to-cart buttons for newly rendered items
    document.querySelectorAll('.add-to-cart').forEach((button) => {
      button.removeEventListener && button.removeEventListener('click', () => {});
      button.addEventListener('click', () => addProductToCart(button));
    });
  }

  if (productDetailRoot) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id') || 'linen-blend-blazer';
    const product = productCatalog[productId] || productCatalog['linen-blend-blazer'];

    productDetailRoot.dataset.name = product.name;
    productDetailRoot.dataset.price = String(product.price);
    productDetailRoot.dataset.image = product.image;

    productDetailRoot.innerHTML = `
      <div class="product-detail-image">
        <img src="${product.image}" alt="${product.name}" />
      </div>
      <div class="product-detail-content">
        <p class="product-detail-breadcrumb">Fashion / New Arrivals</p>
        <h1>${product.name}</h1>
        <div class="product-detail-price">
          <strong>${formatCurrency(product.price)}</strong>
          <span>${formatCurrency(product.oldPrice)}</span>
        </div>
        <div class="product-detail-meta">
          <span>${product.rating}</span>
          <span>${product.reviews}</span>
        </div>
        <p class="product-detail-description">${product.description}</p>
        <div class="product-detail-actions">
          <button class="add-to-cart" type="button">Add to cart</button>
          <a class="secondary-btn" href="index.html">Continue shopping</a>
        </div>
        <ul class="product-detail-list">
          ${product.features.map((feature) => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
    `;

    const detailAddToCartButton = productDetailRoot.querySelector('.add-to-cart');
    detailAddToCartButton?.addEventListener('click', () => addProductToCart(detailAddToCartButton));
  }

  renderCart();

  // Register service worker for basic offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      // fail silently in dev
      console.warn('Service worker registration failed:', err);
    });
  }

  // Focus trap for cart panel
  const focusableSelector = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
  const trapFocusIn = (container) => {
    const focusable = Array.from(container.querySelectorAll(focusableSelector));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);

    // return a cleanup function
    return () => container.removeEventListener('keydown', onKeyDown);
  };

  let releaseFocusTrap = null;

  const enableFocusTrap = () => {
    if (!cartPanel) return;
    releaseFocusTrap = trapFocusIn(cartPanel) || null;
  };

  const disableFocusTrap = () => {
    if (typeof releaseFocusTrap === 'function') releaseFocusTrap();
    releaseFocusTrap = null;
  };

  // Attach focus trap when cart opens/closes
  const originalOpenCart = openCart;
  const originalCloseCart = closeCart;
  openCart = () => {
    originalOpenCart();
    enableFocusTrap();
  };

  closeCart = () => {
    originalCloseCart();
    disableFocusTrap();
  };
});
