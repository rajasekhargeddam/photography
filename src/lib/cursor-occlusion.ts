type Rect = { left: number; right: number; top: number; bottom: number };
/** Punch photo-shaped holes through the light, including overlapping media bounds. */
export function cursorOcclusion(
  rects: Rect[],
  left: number,
  top: number,
  size: number,
) {
  const holes: Rect[] = [];
  for (const rect of rects) {
    let hole = {
      left: Math.max(0, rect.left - left),
      right: Math.min(size, rect.right - left),
      top: Math.max(0, rect.top - top),
      bottom: Math.min(size, rect.bottom - top),
    };
    if (hole.left >= hole.right || hole.top >= hole.bottom) continue;
    // Union overlapping holes so even-odd clipping can never reveal a photograph.
    for (let i = 0; i < holes.length; i++) {
      const other = holes[i];
      if (
        hole.left <= other.right &&
        hole.right >= other.left &&
        hole.top <= other.bottom &&
        hole.bottom >= other.top
      ) {
        hole = {
          left: Math.min(hole.left, other.left),
          right: Math.max(hole.right, other.right),
          top: Math.min(hole.top, other.top),
          bottom: Math.max(hole.bottom, other.bottom),
        };
        holes.splice(i, 1);
        i = -1;
      }
    }
    holes.push(hole);
  }
  return `path(evenodd, "M0 0H${size}V${size}H0Z${holes.map((r) => `M${r.left} ${r.top}H${r.right}V${r.bottom}H${r.left}Z`).join('')}")`;
}
