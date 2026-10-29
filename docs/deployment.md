# Deployment guide

Target Worker: **my-dream-photography**. Config: wrangler.jsonc. Public entrypoint: workers/app.mjs. Existing origin: https://my-dream-photography.ganeshrajasekhar219.workers.dev.

The original has an earlier hosted deployment, but its latest optimization/cleanup changes have not been deployed. Its intended day-to-day role is local content management. Do not deploy it over the lite Worker.

## 1. Install and provision

Run npm ci with Node.js 22 or newer. Use the existing database for this installation. For a genuinely new database, first run the original app locally with its intended MongoDB configuration and request /api/health to initialize collections/indexes and labelled sample content; provision an admin with npm run admin:seed. Cloudflare requests deliberately skip schema setup. Review new-database initialization before pointing it at any existing production data.

## 2. Environment

| Variable                                                    | Where                          | Purpose                                                   |
| ----------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| NEXT_PUBLIC_SITE_URL                                        | Build and runtime              | Canonical origin and Telegram admin links                 |
| NEXT_PUBLIC_WHATSAPP_NUMBER                                 | Build                          | Public number; blank hides the button                     |
| APP_ORIGIN                                                  | Runtime                        | Exact allowed origin for request checks                   |
| MONGODB_URI, MONGODB_DATABASE                               | Runtime                        | Shared database connection/name                           |
| CLOUDINARY_URL                                              | Original runtime only          | Signed uploads and image management                       |
| CONTENT_PUBLISH_SECRET                                      | Runtime and local operator     | At least 32 characters; authenticated revision publishing |
| CONTENT_PUBLISH_ORIGIN                                      | Local operator only            | Destination of npm run content:publish                    |
| TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_ALERTS_SINCE | Lite runtime                   | Active sender and eligible request cutoff                 |
| TELEGRAM_RETRY_SECRET                                       | Lite app and scheduler runtime | Matching private retry authorization                      |

Use Cloudflare secret stores for private runtime values; set one interactively with npx wrangler secret put NAME. The lite scheduler has a separate store: append --config wrangler.telegram.jsonc when setting its TELEGRAM_RETRY_SECRET. Never copy credentials into committed files, NEXT_PUBLIC_ variables or command output. Preserve existing secret values and the Telegram activation cutoff during redeployments.

.env.local is local configuration, not an automatic Worker secret upload. For local Worker preview, use ignored .dev.vars configured for an isolated test environment. No second production Telegram sender should run from preview or the original app.

## 3. Verify and build

Run npm test, npm run lint, npm run typecheck and npm run format:check. Set the production origin **before** building, since canonical URLs are embedded in generated pages:

```powershell
$env:NEXT_PUBLIC_SITE_URL = 'https://my-dream-photography.ganeshrajasekhar219.workers.dev'
# Set NEXT_PUBLIC_WHATSAPP_NUMBER to the intended public value if needed.
npm run cf:build
# Optional local Worker preview with isolated runtime configuration:
npm run cf:preview
```

Use the same origin in runtime APP_ORIGIN and NEXT_PUBLIC_SITE_URL. Confirm the generated sitemap/canonical URLs and WhatsApp button. Restart/rebuild after changing build-time public values. Do not deploy a development-origin build.

OpenNext warns about Windows support; if packaging requires symbolic links, enable Windows Developer Mode or build in WSL. A sandbox-stalled build is not a successful build.

## 4. Deploy

Authenticate with npm run cf:login if needed. Check the Worker name and self-reference in wrangler.jsonc, then run npm run cf:deploy after the verified build. Secret changes can themselves create a deployment; do not use placeholder secrets on a live Worker.

No scheduler is configured for the original. Leave TELEGRAM_LOCAL_DISPATCH_ENABLED unset/false and do not restore the old hosted Telegram sender while lite owns delivery.

## 5. Verify the release

Check public pages and assets, successive public API MISS/HIT responses, admin login/logout, anonymous private API rejection and the appropriate admin feature set. Validate content publishing with an intended edit. Verify request submission and Telegram delivery only with an explicitly intended request; avoid generating customer-looking test records or unsolicited group messages.

Inspect Cloudflare CPU/error metrics and scheduler status. The prior lite fast path measured 1–2 ms CPU for hits and 58–665 ms for misses. Cold reads and scrypt login remain CPU risks; successful builds/HTTP responses do not establish free-tier suitability. No paid upgrade is required by this configuration, and no guarantee of zero cost is made.

Keep the previous deployment version available for rollback. Roll back code through Cloudflare deployment history if needed; do not roll back or delete customer data. Run publishing after content edits rather than deploying unchanged code.

## Cleanup verification — 29 October 2026

Both projects passed 78 automated tests each, ESLint, TypeScript, formatting, the OpenNext production build and Wrangler deployment dry-run. Lite scheduler dry-run also passed. Documentation links resolve. No deployment, credential change, customer-data mutation or real Telegram send was performed during cleanup. Live runtime checks remain a post-deployment step; free-tier CPU suitability remains unresolved.
