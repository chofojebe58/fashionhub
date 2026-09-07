export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }
}
