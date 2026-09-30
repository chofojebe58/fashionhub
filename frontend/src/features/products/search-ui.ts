import {
  getAvailableCategories,
  getFilteredProducts,
  getFilters,
  PRICE_BOUNDS,
  resetFilters,
  setFilters,
  subscribe as subscribeFilters,
  type FilterState,
} from './filters.ts';
import { escapeAttr, escapeHtml } from '@utils/escape.ts';
import type { Product } from '@app-types/product.ts';

let searchInput: HTMLInputElement | null = null;
let categoryFilters: HTMLFieldSetElement | null = null;
let priceMinInput: HTMLInputElement | null = null;
let priceMaxInput: HTMLInputElement | null = null;
let inStockInput: HTMLInputElement | null = null;
let onSaleInput: HTMLInputElement | null = null;
let sortSelect: HTMLSelectElement | null = null;
let clearFiltersBtn: HTMLButtonElement | null = null;
let resultsCount: HTMLElement | null = null;
let filtersToggle: HTMLButtonElement | null = null;
let filtersPanel: HTMLElement | null = null;
let closeFiltersBtn: HTMLElement | null = null;
let filtersOverlay: HTMLElement | null = null;

export function initSearchFilters(): void {
  searchInput = document.querySelector<HTMLInputElement>('#search-input');
  categoryFilters = document.querySelector<HTMLFieldSetElement>('#category-filters');
  priceMinInput = document.querySelector<HTMLInputElement>('#price-min');
  priceMaxInput = document.querySelector<HTMLInputElement>('#price-max');
  inStockInput = document.querySelector<HTMLInputElement>('#in-stock');
  onSaleInput = document.querySelector<HTMLInputElement>('#on-sale');
  sortSelect = document.querySelector<HTMLSelectElement>('#sort-by');
  clearFiltersBtn = document.querySelector<HTMLButtonElement>('#clear-filters');
  resultsCount = document.querySelector<HTMLElement>('#results-count');
  filtersToggle = document.querySelector<HTMLButtonElement>('#filters-toggle');
  filtersPanel = document.querySelector<HTMLElement>('#filters-panel');
  closeFiltersBtn = document.querySelector<HTMLElement>('#close-filters');
  filtersOverlay = document.querySelector<HTMLElement>('#filters-overlay');

  const hasControls = searchInput || categoryFilters || sortSelect || priceMinInput;
  if (!hasControls) return;

  if (!filtersOverlay && filtersPanel) {
    filtersOverlay = document.createElement('div');
    filtersOverlay.id = 'filters-overlay';
    filtersOverlay.className = 'filters-overlay';
    document.body.appendChild(filtersOverlay);
  }

  applyUrlParams();
  renderCategoryCheckboxes();
  bindEvents();
  subscribeFilters(onFiltersChange);
  updateUIFromFilters(getFilters());
  updateResultsCount(getFilteredProducts().length);
}

/** Supports `shop.html?q=linen` and `shop.html?category=Bags`. */
function applyUrlParams(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const patch: Partial<FilterState> = {};

  const query = urlParams.get('q');
  if (query) patch.query = query;

  const category = urlParams.get('category');
  if (category) patch.categories = [category];

  const sort = urlParams.get('sort');
  if (sort && ['name', 'price-asc', 'price-desc', 'newest'].includes(sort)) {
    patch.sortBy = sort as FilterState['sortBy'];
  }

  if (Object.keys(patch).length > 0) setFilters(patch);
}

function renderCategoryCheckboxes(): void {
  if (!categoryFilters) return;

  const categories = getAvailableCategories();

  categoryFilters.innerHTML = `
    <legend>Categories</legend>
    ${
      categories.length
        ? categories
            .map(
              (c) => `
      <label class="filter-option">
        <input type="checkbox" value="${escapeAttr(c.name)}" />
        <span>${escapeHtml(c.name)}</span>
        <span class="filter-count">${escapeHtml(c.count)}</span>
      </label>`
            )
            .join('')
        : '<p class="filter-empty">No categories available yet.</p>'
    }
  `;
}

function bindEvents(): void {
  searchInput?.addEventListener(
    'input',
    debounce(() => {
      setFilters({ query: searchInput?.value ?? '' });
    }, 300)
  );

  categoryFilters?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.type !== 'checkbox') return;

    const current = getFilters();
    setFilters({
      categories: target.checked
        ? [...current.categories, target.value]
        : current.categories.filter((c) => c !== target.value),
    });
  });

  priceMinInput?.addEventListener('change', () => {
    setFilters({
      priceRange: [clampPrice(priceMinInput?.value), getFilters().priceRange[1]],
    });
  });

  priceMaxInput?.addEventListener('change', () => {
    setFilters({
      priceRange: [getFilters().priceRange[0], clampPrice(priceMaxInput?.value, PRICE_BOUNDS[1])],
    });
  });

  inStockInput?.addEventListener('change', () => {
    setFilters({ inStock: Boolean(inStockInput?.checked) });
  });

  onSaleInput?.addEventListener('change', () => {
    setFilters({ onSale: Boolean(onSaleInput?.checked) });
  });

  sortSelect?.addEventListener('change', () => {
    setFilters({ sortBy: (sortSelect?.value ?? 'name') as FilterState['sortBy'] });
  });

  clearFiltersBtn?.addEventListener('click', () => {
    resetFilters();
    updateUIFromFilters(getFilters());
  });

  // The "no results" state renders its own clear button.
  document.addEventListener('fashionhub:clear-filters', () => {
    resetFilters();
    updateUIFromFilters(getFilters());
  });

  filtersToggle?.addEventListener('click', openFiltersPanel);
  closeFiltersBtn?.addEventListener('click', closeFiltersPanel);
  filtersOverlay?.addEventListener('click', closeFiltersPanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filtersPanel?.classList.contains('active')) closeFiltersPanel();
  });
}

function clampPrice(value: string | undefined, fallback = PRICE_BOUNDS[0]): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, PRICE_BOUNDS[0]), PRICE_BOUNDS[1]);
}

function openFiltersPanel(): void {
  filtersPanel?.classList.add('active');
  filtersOverlay?.classList.add('active');
  filtersToggle?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeFiltersPanel(): void {
  filtersPanel?.classList.remove('active');
  filtersOverlay?.classList.remove('active');
  filtersToggle?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/**
 * Only the results count lives here — `features/products/render.ts` subscribes
 * to the same store and re-renders the grid itself.
 */
function onFiltersChange(_filters: FilterState, results: Product[]): void {
  updateResultsCount(results.length);
}

function updateUIFromFilters(filters: FilterState): void {
  if (searchInput) searchInput.value = filters.query;
  if (priceMinInput) priceMinInput.value = String(filters.priceRange[0]);
  if (priceMaxInput) priceMaxInput.value = String(filters.priceRange[1]);
  if (inStockInput) inStockInput.checked = filters.inStock;
  if (onSaleInput) onSaleInput.checked = filters.onSale;
  if (sortSelect) sortSelect.value = filters.sortBy;

  categoryFilters?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
    cb.checked = filters.categories.includes(cb.value);
  });
}

function updateResultsCount(count: number): void {
  if (resultsCount) {
    resultsCount.textContent = `${count} product${count === 1 ? '' : 's'} found`;
  }
}

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/** Re-render the category list once the catalogue has loaded from the API. */
export function refreshCategories(): void {
  renderCategoryCheckboxes();
  updateUIFromFilters(getFilters());
}
