import { subscribe as subscribeFilters, setFilters, resetFilters, getFilters } from './filters.ts';
import { renderProductGrid } from './render.ts';
import type { FilterState } from './filters.ts';

let searchInput: HTMLInputElement | null = null;
let categoryFilters: HTMLFieldSetElement | null = null;
let priceMinInput: HTMLInputElement | null = null;
let priceMaxInput: HTMLInputElement | null = null;
let sortSelect: HTMLSelectElement | null = null;
let clearFiltersBtn: HTMLButtonElement | null = null;
let resultsCount: HTMLElement | null = null;
let filtersToggle: HTMLButtonElement | null = null;
let filtersPanel: HTMLElement | null = null;
let closeFiltersBtn: HTMLButtonElement | null = null;
let filtersOverlay: HTMLElement | null = null;

const CATEGORIES = ['Women', 'Men', 'Dresses', 'Tops', 'Shoes', 'Bags', 'Accessories'];

export function initSearchFilters(): void {
  searchInput = document.querySelector('#search-input');
  categoryFilters = document.querySelector('#category-filters');
  priceMinInput = document.querySelector('#price-min');
  priceMaxInput = document.querySelector('#price-max');
  sortSelect = document.querySelector('#sort-by');
  clearFiltersBtn = document.querySelector('#clear-filters');
  resultsCount = document.querySelector('#results-count');
  filtersToggle = document.querySelector('#filters-toggle');
  filtersPanel = document.querySelector('#filters-panel');
  closeFiltersBtn = document.querySelector('#close-filters');
  filtersOverlay = document.querySelector('#filters-overlay');

  if (!searchInput && !categoryFilters && !sortSelect) return;

  // Create overlay if it doesn't exist
  if (!filtersOverlay) {
    filtersOverlay = document.createElement('div');
    filtersOverlay.id = 'filters-overlay';
    filtersOverlay.className = 'filters-overlay';
    document.body.appendChild(filtersOverlay);
  }

  // Read initial search query from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q');
  if (initialQuery) {
    setFilters({ query: initialQuery });
  }

  renderCategoryCheckboxes();
  bindEvents();
  subscribeFilters(onFiltersChange);
  updateUIFromFilters(getFilters());
}

function renderCategoryCheckboxes(): void {
  if (!categoryFilters) return;
  categoryFilters.innerHTML = `
    <legend>Categories</legend>
    ${CATEGORIES.map(
      cat => `
      <label class="filter-option">
        <input type="checkbox" value="${cat}" />
        <span>${cat}</span>
      </label>
    `
    ).join('')}
  `;
}

function bindEvents(): void {
  searchInput?.addEventListener(
    'input',
    debounce(() => {
      setFilters({ query: searchInput?.value || '' });
    }, 300)
  );

  categoryFilters?.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'checkbox') {
      const current = getFilters();
      const categories = target.checked
        ? [...current.categories, target.value]
        : current.categories.filter(c => c !== target.value);
      setFilters({ categories });
    }
  });

  priceMinInput?.addEventListener('change', () => {
    setFilters({ priceRange: [Number(priceMinInput?.value || 0), getFilters().priceRange[1]] });
  });
  priceMaxInput?.addEventListener('change', () => {
    setFilters({ priceRange: [getFilters().priceRange[0], Number(priceMaxInput?.value || 1000)] });
  });

  sortSelect?.addEventListener('change', () => {
    setFilters({ sortBy: sortSelect?.value as FilterState['sortBy'] });
  });

  clearFiltersBtn?.addEventListener('click', () => {
    resetFilters();
    updateUIFromFilters(getFilters());
  });

  // Mobile filters panel toggle
  filtersToggle?.addEventListener('click', openFiltersPanel);
  closeFiltersBtn?.addEventListener('click', closeFiltersPanel);
  filtersOverlay?.addEventListener('click', closeFiltersPanel);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && filtersPanel?.classList.contains('active')) {
      closeFiltersPanel();
    }
  });
}

function openFiltersPanel(): void {
  filtersPanel?.classList.add('active');
  filtersOverlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFiltersPanel(): void {
  filtersPanel?.classList.remove('active');
  filtersOverlay?.classList.remove('active');
  document.body.style.overflow = '';
}

function onFiltersChange(filters: FilterState, results: Product[]): void {
  updateResultsCount(results.length);
  renderProductGrid('.product-grid');
}

function updateUIFromFilters(filters: FilterState): void {
  if (searchInput) searchInput.value = filters.query;
  if (priceMinInput) priceMinInput.value = String(filters.priceRange[0]);
  if (priceMaxInput) priceMaxInput.value = String(filters.priceRange[1]);
  if (sortSelect) sortSelect.value = filters.sortBy;
  categoryFilters?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
    cb.checked = filters.categories.includes(cb.value);
  });
}

function updateResultsCount(count: number): void {
  if (resultsCount) resultsCount.textContent = `${count} product${count !== 1 ? 's' : ''} found`;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  description: string;
  features: string[];
  rating: string;
  reviews: string;
}
