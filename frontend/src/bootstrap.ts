import { initSession } from '@features/auth/session.ts';
import { initAccountHeader } from '@features/auth/header.ts';
import { applySiteSettings } from '@features/content/siteSettings.ts';
import { initLazyImages } from '@utils/images.ts';

/**
 * Shared boot sequence for *every* page, including the ones that don't load
 * `main.ts` (checkout, order confirmation).
 *
 * Renders the signed-out header immediately using the cached user, then
 * re-renders once `GET /api/auth/me` confirms or clears the session — so there
 * is no flash of "Sign in" for a logged-in visitor.
 */
export async function bootstrapCommon(): Promise<void> {
  initLazyImages();
  initAccountHeader();

  // Admin-editable copy and the session are independent — run them together.
  await Promise.all([applySiteSettings(), initSession()]);
}

/** Runs `fn` on DOM ready (or immediately if the document is already parsed). */
export function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}
