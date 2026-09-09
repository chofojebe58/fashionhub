import {
  getCartCount,
  getCartTotal,
  getCart,
  updateQuantity,
  removeFromCart,
  subscribe,
} from './state.ts';
import { formatCurrency } from '../utils/format.ts';
import type { CartItem } from '../types/cart.ts';

let cartPanel: HTMLElement | null = null;
let cartToggle: HTMLElement | null = null;
let closeCartButton: HTMLElement | null = null;
let cartCountEl: HTMLElement | null = null;
let cartTotalEl: HTMLElement | null = null;
let cartItemsList: HTMLElement | null = null;
let releaseFocusTrap: (() => void) | null = null;

const focusableSelector = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export function initCartUI(): void {
  cartPanel = document.querySelector('.cart-panel');
  cartToggle = document.querySelector('.cart-toggle');
  closeCartButton = document.querySelector('.close-cart');
  cartCountEl = document.querySelector('.cart-count');
  cartTotalEl = document.querySelector('.cart-total');
  cartItemsList = document.querySelector('.cart-items');

  if (!cartPanel || !cartToggle) return;

  cartToggle.addEventListener('click', toggleCart);
  closeCartButton?.addEventListener('click', closeCart);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cartPanel?.classList.contains('open')) {
      closeCart();
    }
  });

  document.addEventListener('click', event => {
    const clickedCartToggle =
      event.target instanceof Element ? event.target.closest('.cart-toggle') : null;
    const clickedCartPanel =
      event.target instanceof Element ? event.target.closest('.cart-panel') : null;
    if (!clickedCartToggle && !clickedCartPanel && cartPanel) {
      closeCart();
    }
  });

  document.querySelectorAll('.checkout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  });

  subscribe(renderCartUI);
  renderCartUI();
}

function toggleCart(): void {
  if (cartPanel?.classList.contains('open')) {
    closeCart();
  } else {
    openCart();
  }
}

function openCart(): void {
  cartPanel?.classList.add('open');
  cartToggle?.setAttribute('aria-expanded', 'true');
  cartPanel?.setAttribute('aria-hidden', 'false');
  closeCartButton?.focus();
  enableFocusTrap();
}

function closeCart(): void {
  cartPanel?.classList.remove('open');
  cartToggle?.setAttribute('aria-expanded', 'false');
  cartPanel?.setAttribute('aria-hidden', 'true');
  cartToggle?.focus();
  disableFocusTrap();
}

export function renderCartUI(): void {
  const cart = getCart();
  const totalItems = getCartCount();
  const totalPrice = getCartTotal();

  if (cartCountEl) cartCountEl.textContent = String(totalItems);
  if (cartTotalEl) cartTotalEl.textContent = formatCurrency(totalPrice);

  if (!cartItemsList) return;

  if (!cart.length) {
    cartItemsList.innerHTML = '<li class="empty-cart">Your cart is empty.</li>';
    return;
  }

  cartItemsList.innerHTML = cart
    .map(
      (item: CartItem) => `
    <li class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" />
      <div class="cart-item-content">
        <strong>${item.name}</strong>
        ${item.size || item.color ? `<span>${[item.size, item.color].filter(Boolean).join(' / ')}</span>` : ''}
        <span>${formatCurrency(item.price)} each</span>
        <div class="cart-item-actions">
          <div class="qty-control" aria-label="Quantity controls for ${item.name}">
            <button class="qty-btn qty-decrease" type="button" data-id="${item.id}" aria-label="Decrease quantity for ${item.name}">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn qty-increase" type="button" data-id="${item.id}" aria-label="Increase quantity for ${item.name}">+</button>
          </div>
          <button class="remove-item" type="button" data-id="${item.id}" aria-label="Remove ${item.name}">Remove</button>
        </div>
      </div>
    </li>
  `
    )
    .join('');

  bindCartActions();
}

function bindCartActions(): void {
  cartItemsList?.querySelectorAll('.qty-btn').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number((button as HTMLElement).dataset.id);
      const item = getCart().find(i => i.id === id);
      if (!item) return;
      if (button.classList.contains('qty-increase')) {
        updateQuantity(id, 1);
      } else if (button.classList.contains('qty-decrease')) {
        updateQuantity(id, -1);
      }
    });
  });

  cartItemsList?.querySelectorAll('.remove-item').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number((button as HTMLElement).dataset.id);
      removeFromCart(id);
    });
  });
}

function trapFocusIn(container: HTMLElement): () => void {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
  if (!focusable.length) return () => {};
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const onKeyDown = (e: KeyboardEvent): void => {
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
  return () => container.removeEventListener('keydown', onKeyDown);
}

function enableFocusTrap(): void {
  if (!cartPanel) return;
  releaseFocusTrap = trapFocusIn(cartPanel) || null;
}

function disableFocusTrap(): void {
  if (typeof releaseFocusTrap === 'function') releaseFocusTrap();
  releaseFocusTrap = null;
}
