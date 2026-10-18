'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Progressive enhancement: content remains visible without JavaScript or motion. */
export function CinematicEffects() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector('.cinematic-site');
    if (
      !root ||
      !('IntersectionObserver' in window) ||
      !Element.prototype.animate
    )
      return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const seen = new WeakSet<Element>();
    const animations = new Set<Animation>();
    const scene = root.querySelector('.route-scene');
    if (scene && !preference.matches) {
      const entrance = scene.animate(
        [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 500, easing: 'cubic-bezier(.2,.65,.25,1)' },
      );
      animations.add(entrance);
      void entrance.finished
        .then(() => animations.delete(entrance))
        .catch(() => {});
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (preference.matches) continue;
          const animation = entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(28px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 850, easing: 'cubic-bezier(.2,.65,.25,1)' },
          );
          animations.add(animation);
          void animation.finished
            .then(() => animations.delete(animation))
            .catch(() => {});
        }
      },
      { threshold: 0.08 },
    );
    const collect = () => {
      root
        .querySelectorAll(
          '.section-heading, .public-intro h1, .gallery-item, .studio-photo, .public-photo, .testimonial-card, .video-card, .guided-question',
        )
        .forEach((element) => {
          if (seen.has(element)) return;
          seen.add(element);
          observer.observe(element);
        });
    };
    collect();
    const mutations = new MutationObserver(collect);
    mutations.observe(root, { childList: true, subtree: true });
    let frame = 0;
    let active: HTMLElement | null = null;
    const reset = () => {
      active?.style.removeProperty('--tilt-x');
      active?.style.removeProperty('--tilt-y');
      active = null;
    };
    const move = (event: Event) => {
      if (preference.matches || !finePointer.matches) return;
      const pointer = event as PointerEvent;
      const target = (pointer.target as Element).closest<HTMLElement>(
        '.depth-frame, .gallery-tile, .guided-card',
      );
      if (active !== target) reset();
      if (!target) return;
      active = target;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = target.getBoundingClientRect();
        target.style.setProperty(
          '--tilt-x',
          `${((pointer.clientY - bounds.top) / bounds.height - 0.5) * -3}deg`,
        );
        target.style.setProperty(
          '--tilt-y',
          `${((pointer.clientX - bounds.left) / bounds.width - 0.5) * 3}deg`,
        );
      });
    };
    const leave = (event: Event) => {
      const related = (event as PointerEvent).relatedTarget;
      if (active && (!(related instanceof Node) || !active.contains(related)))
        reset();
    };
    const stopMotion = () => {
      if (!preference.matches) return;
      animations.forEach((animation) => animation.cancel());
      reset();
    };
    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerout', leave);
    preference.addEventListener('change', stopMotion);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      animations.forEach((animation) => animation.cancel());
      cancelAnimationFrame(frame);
      reset();
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerout', leave);
      preference.removeEventListener('change', stopMotion);
    };
  }, [pathname]);
  return null;
}
