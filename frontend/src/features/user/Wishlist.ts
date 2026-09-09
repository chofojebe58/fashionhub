export function initWishlist(): void {
  document.querySelectorAll<HTMLButtonElement>('.wishlist').forEach(button => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
      button.textContent = button.classList.contains('active') ? '♥' : '♡';
    });
  });
}
