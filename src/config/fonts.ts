import localFont from 'next/font/local';
export const headingFont = localFont({
  src: '../assets/fonts/playfair-display-regular.ttf',
  variable: '--font-heading',
  display: 'swap',
  weight: '400',
});
export const bodyFont = localFont({
  src: [
    { path: '../assets/fonts/plus-jakarta-sans-regular.ttf', weight: '400' },
    { path: '../assets/fonts/plus-jakarta-sans-semibold.ttf', weight: '600' },
  ],
  variable: '--font-body',
  display: 'swap',
});
