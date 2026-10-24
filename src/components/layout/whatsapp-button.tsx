'use client';

import { usePathname } from 'next/navigation';
import { business } from '@/config/business';
import '@/styles/whatsapp.css';

export function WhatsAppButton() {
  const pathname = usePathname();
  const number = business.whatsapp;
  if (!number || /^\/(book|thank-you|admin)(\/|$)/.test(pathname)) return null;

  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/${number.replace(/\D/g, '')}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with My Dream Photography on WhatsApp (opens in a new tab)"
    >
      <span className="whatsapp-float-label" aria-hidden="true">
        Chat on WhatsApp
      </span>
      <svg
        viewBox="0 0 24 24"
        width="29"
        height="29"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M20.52 3.48A11.88 11.88 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.16 1.6 5.97L0 24l6.26-1.64a11.9 11.9 0 0 0 5.79 1.48h.01C18.64 23.84 24 18.49 24 11.91c0-3.19-1.24-6.18-3.48-8.43ZM12.06 21.83a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.23-.37a9.88 9.88 0 0 1-1.52-5.29c0-5.47 4.45-9.92 9.93-9.92a9.84 9.84 0 0 1 7.02 2.91 9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.89-9.97 9.89Zm5.45-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
