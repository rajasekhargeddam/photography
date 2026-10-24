'use client';

import { useEffect } from 'react';

/** Discourages casual image saving; public images are not access-controlled. */
export function ImageProtection() {
  useEffect(() => {
    const imageSurfaces =
      'img, picture, .gallery-tile, .lightbox-photo, .hero-slide, .studio-photo, .brand-logo, .services-photo-space, .guided-card-media';
    const preventImageAction = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('.cinematic-site') &&
        target.closest(imageSurfaces)
      ) {
        event.preventDefault();
      }
    };

    // Delegation also covers images loaded later and gallery lightboxes.
    document.addEventListener('contextmenu', preventImageAction, true);
    document.addEventListener('dragstart', preventImageAction, true);
    return () => {
      document.removeEventListener('contextmenu', preventImageAction, true);
      document.removeEventListener('dragstart', preventImageAction, true);
    };
  }, []);

  return null;
}
