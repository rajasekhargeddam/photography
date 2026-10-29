# Architecture and project boundaries

Next.js App Router serves the public site, API and authenticated admin. React Query handles public and private request caches in separate providers; Redux stores the quote draft; Zod validates data; MongoDB stores requests, auth, content, publication revisions and Telegram jobs.

## Request reduction

- /api/home aggregates hero (5), gallery (8), testimonials (3) and videos (1).
- Public browser queries stay fresh for five minutes, without focus/reconnect polling or automatic retries. Explicit error recovery remains available.
- Public edge entries last five minutes and include a publication revision in their key. Revision lookups are cached for up to 60 seconds.
- workers/app.mjs returns eligible edge hits before entering Next.js. Credentials, mutations, private URLs and unrecognized query parameters bypass this fast path.
- Private request queries stay fresh for 60 seconds and are cleared at login/logout. Read receipts update cached badges and deduplicate repeated writes. Admin browsing does not scan the Telegram queue.
- Worker MongoDB connections are request-scoped; local Node development pools connections. Production requests do not create indexes or import samples.

Caching reduces repeated reads and CPU work, but edge hits still invoke a Worker. Cold requests, revision refreshes, authentication and scheduled reconciliation still consume resources.

## Source layout

- src/app: routes and layouts; src/app/api: HTTP adapters.
- src/features: booking, public content, pricing, contact and admin UI.
- src/server: auth, persistence, API routing, publishing and Telegram queue.
- src/lib: public query/cache helpers and shared utilities.
- workers/app.mjs: Cloudflare public-cache entrypoint.
- tests: isolated regression coverage; scripts: operator commands.

## Intentional differences

The original retains full management routes and UI. Lite rejects management API routes before database access and omits their UI components. Shared server content/upload contracts and tests remain for schema compatibility; do not remove them merely because lite hides the management UI. The configured image loader is referenced by next.config.ts and must remain.

Original Telegram dispatch is opt-in through TELEGRAM_LOCAL_DISPATCH_ENABLED; lite owns the active sender and scheduler. The original has no scheduler deployment configuration. Worker names, origins and secrets remain project-specific.

## Data and verification

Customer requests are not public cache content. Quotes store server-calculated snapshots; confirmed quotes are never repriced. Password hashing and session checks remain intact.

The optional scripts/verify-unified.ts creates an isolated QA database. Build first, then invoke it explicitly with tsx and .env.local. Its --cloudinary mode creates and deletes real test assets; it is not part of routine unit tests or deployment. Never treat old test-data permissions as permission to alter current customer records.

Keep ignored environment files and any legacy private backups private. They are not deployment source; cleanup does not delete credentials, customer data or uploaded media.
