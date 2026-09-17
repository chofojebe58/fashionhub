import { setSubscriberEmail } from '@utils/storage.ts';

export function initNewsletter(): void {
  const forms = document.querySelectorAll<HTMLFormElement>('.subscribe-form, .footer-email');
  forms.forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = form.querySelector<HTMLInputElement>('input');
      if (!input) return;

      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }

      setSubscriberEmail(value);
      input.value = '';
      input.placeholder = 'Thanks for subscribing!';
    });
  });
}
