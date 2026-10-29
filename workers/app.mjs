import { edgePublicHit } from '../src/lib/edge-public-hit.ts';
const worker = {
  async fetch(request, env, ctx) {
    const hit = await edgePublicHit(request, caches.default, env.APP_ORIGIN);
    if (hit) return hit;
    const { default: app } = await import('../.open-next/worker.js');
    return app.fetch(request, env, ctx);
  },
};
export default worker;
