> Historical implementation record. Status and instructions may be superseded. Use [the current deployment guide](../deployment.md).

# Cloudflare deployment

Target: Workers Free with OpenNext, using the existing MongoDB and Cloudinary services.
Deployed on 24 October 2026 at https://my-dream-photography.ganeshrajasekhar219.workers.dev.
Latest version: `3bdb65de-3d6a-49f5-9190-01c94006fbfa` (sign-in error handling).
Public smoke checks pass; the owner confirmed real admin sign-in works on retry. Uploads, production CPU metrics, and scheduled Telegram retries still need verification/configuration.

## Live checks

- Homepage, portfolio, admin login page, health, pricing, gallery API, and sitemap return 200.
- Unauthenticated admin API requests return 401.
- Checked pages and sitemap contain no `localhost:3000` URL.
- Final compressed Worker upload: 1,773.62 KiB. No paid services were enabled.
- Runtime credentials were uploaded as Worker secrets. The temporary local secrets bundle was deleted after deployment.
- An initial admin sign-in returned HTML instead of JSON; a subsequent owner sign-in succeeded. The underlying intermittent failure was not captured. The form now handles non-JSON responses with a readable temporary-unavailability message; two regression tests cover this and response validation.
- For future builds, set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin before running `npm run cf:build`; then run `npm run cf:deploy`. Local `.env.local` remains configured for development.

## Verified locally (24 October 2026)

- Next.js and OpenNext builds pass. Windows Developer Mode was required for the packager's symbolic links.
- Wrangler dry-run measured the initial Worker at 1,770.76 KiB compressed. Recheck after final changes.
- Public pages load in the local Workers runtime; unauthenticated admin API requests return 401.
- Repeated database reads now pass: health, pricing, gallery, pricing again, and hero all return 200. The original shared MongoDB connection failed on later requests.
- Worker operations now use lazy, operation-scoped MongoDB connections and close them on completion/failure. Node development retains its connection pool. Background Telegram work gets its own connection scope.
- All 57 tests and lint pass. Production CPU usage, real admin sign-in, uploads, and final deployment remain unverified.
- Local preview uses ignored `.dev.vars`; never commit or publish that file. Telegram credentials are deliberately omitted from local smoke checks.

## Account and deployment

1. Create a Cloudflare Free account and verify your email. Do not enable paid services.
2. Use Wrangler login on your computer; never put passwords, API tokens, or database credentials in chat or Git.
3. Choose a workers.dev subdomain. Set `NEXT_PUBLIC_SITE_URL` to the resulting HTTPS origin before building. This value is embedded in the client and metadata at build time.
4. Set runtime `APP_ORIGIN` to the same origin. Supply `MONGODB_URI`, `MONGODB_DATABASE`, and `CLOUDINARY_URL` as Worker secrets/configuration, not committed files.
5. For Telegram, also supply the existing `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ALERTS_SINCE`, and `TELEGRAM_RETRY_SECRET`. Preserve the activation time. Configure the protected retry schedule described in `telegram-alerts.md`.
6. Build and inspect Worker upload size before deployment. No R2 or Cloudflare Images paid bindings are configured. Local images are served directly, Cloudinary images use the existing loader, and fullscreen originals remain unchanged.

## Required preview checks

- Public pages, local images, Cloudinary photos, and static assets load.
- MongoDB reads work across multiple successive requests in the deployed Worker as they do in local preview.
- Admin sign-in, logout, revoked sessions, and same-origin checks work.
- Quotes, callbacks, original uploads, and Telegram retries work with isolated test data.
- Actual Worker CPU and compressed bundle size fit the Free plan. Local Node timing is not a substitute for Worker metrics; password hashing is a known CPU risk.
- Confirm final canonical URLs and sitemap after setting the deployed origin.

Do not weaken password hashing, expose MongoDB credentials, or upgrade to a paid plan to bypass a failing check.
