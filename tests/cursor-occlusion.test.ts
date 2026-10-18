import test from 'node:test';
import assert from 'node:assert/strict';
import { cursorOcclusion } from '../src/lib/cursor-occlusion';

test('cursor light is clipped at image edges rather than disabled near the gallery', () => {
  assert.equal(
    cursorOcclusion(
      [{ left: 100, right: 300, top: 50, bottom: 250 }],
      80,
      30,
      360,
    ),
    'path(evenodd, "M0 0H360V360H0ZM20 20H220V220H20Z")',
  );
});
test('overlapping media masks union so the light cannot leak onto photographs', () => {
  assert.equal(
    cursorOcclusion(
      [
        { left: 0, right: 100, top: 0, bottom: 100 },
        { left: 50, right: 200, top: 50, bottom: 200 },
      ],
      0,
      0,
      360,
    ),
    'path(evenodd, "M0 0H360V360H0ZM0 0H200V200H0Z")',
  );
});
test('image masks clamp to the glow bounds and ignore distant media', () => {
  assert.equal(
    cursorOcclusion(
      [
        { left: -100, right: 500, top: -100, bottom: 500 },
        { left: 600, right: 800, top: 0, bottom: 100 },
      ],
      0,
      0,
      360,
    ),
    'path(evenodd, "M0 0H360V360H0ZM0 0H360V360H0Z")',
  );
});
