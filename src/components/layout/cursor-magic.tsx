'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cursorOcclusion } from '@/lib/cursor-occlusion';

/** A small decorative light, kept clear of photography and working controls. */
export function CursorMagic() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector('.cinematic-site');
    if (!root || !CSS.supports('clip-path', 'path(evenodd, "M0 0H1V1H0Z")'))
      return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const light = document.createElement('div');
    light.className = 'cinematic-cursor-magic';
    light.setAttribute('aria-hidden', 'true');
    light.innerHTML =
      '<span class="cursor-aurora"></span><span class="cursor-orbit"></span><span class="cursor-dust"></span>';
    document.body.append(light);
    const protectedAreas =
      'dialog[open], form, input, textarea, select, [data-cursor-magic="off"]';
    const surfaces =
      'img, video, iframe, .gallery-tile, .public-photo, .studio-photo, .depth-frame, .studio-map-card, .hero-slide, form, dialog[open], [data-cursor-magic="off"]';
    let frame = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const hide = () => {
      cancelAnimationFrame(frame);
      clearTimeout(idle);
      light.classList.remove('is-visible');
    };
    const showAt = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      if (
        reduced.matches ||
        !pointer.matches ||
        document.hidden ||
        document.pointerLockElement
      ) {
        hide();
        return;
      }
      frame = requestAnimationFrame(() => {
        const target = document.elementFromPoint(x, y);
        if (
          !(target instanceof Element) ||
          !root.contains(target) ||
          getComputedStyle(target).cursor === 'none' ||
          target.closest(protectedAreas)
        ) {
          hide();
          return;
        }
        const left = x - 180;
        const top = y - 180;
        const updateMask = () => {
          const hovered = document.elementFromPoint(x, y);
          const navbar = hovered?.closest('.header-inner');
          if (navbar) {
            const rect = navbar.getBoundingClientRect();
            // The navigation floats above hero imagery: keep its light inside
            // the glass capsule rather than masking it with the photo below.
            light.style.clipPath = `inset(${rect.top - top}px ${360 - (rect.right - left)}px ${360 - (rect.bottom - top)}px ${rect.left - left}px round ${rect.height / 2}px)`;
            frame = requestAnimationFrame(updateMask);
            return;
          }
          const rectangles = Array.from(root.querySelectorAll(surfaces))
            .filter((element) => !element.parentElement?.closest(surfaces))
            .map((element) => element.getBoundingClientRect());
          light.style.clipPath = cursorOcclusion(rectangles, left, top, 360);
          // Follow existing photo tilt/reveal animations until the light fades.
          frame = requestAnimationFrame(updateMask);
        };
        updateMask();
        light.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        light.classList.add('is-visible');
        clearTimeout(idle);
        idle = setTimeout(hide, 1400);
      });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        hide();
        return;
      }
      showAt(event.clientX, event.clientY);
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        hide();
        return;
      }
      showAt(event.clientX, event.clientY);
    };
    const scroll = () => {
      if (!light.classList.contains('is-visible')) return;
      clearTimeout(idle);
      idle = setTimeout(hide, 1400);
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) hide();
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave);
    window.addEventListener('blur', hide);
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true, capture: true });
    window.addEventListener('keydown', hide);
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('pointerlockchange', hide);
    reduced.addEventListener('change', hide);
    pointer.addEventListener('change', hide);
    return () => {
      hide();
      light.remove();
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
      window.removeEventListener('blur', hide);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('keydown', hide);
      document.removeEventListener('visibilitychange', hide);
      document.removeEventListener('pointerlockchange', hide);
      reduced.removeEventListener('change', hide);
      pointer.removeEventListener('change', hide);
    };
  }, [pathname]);
  return null;
}
