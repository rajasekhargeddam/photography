# One codebase, two build modes

The original photography repository is the maintained source. Management and lite share the public UI, booking logic, MongoDB services, caching, admin request inbox and Telegram formatter. The old sibling lite folder is not imported, modified or required.

## Mode boundaries

`src/config/app-variant.ts` validates the mode. `next.config.ts` embeds the non-secret APP_VARIANT value in both server and client bundles. Management is the default for local development; explicit lite build commands select lite.

Lite rejects management API paths before database/auth access. Management layouts and pages call notFound in lite, and the navigation omits those groups. This is server-enforced access control, not just hidden links. Full management source stays in the same repository and may appear in build manifests; it is inaccessible in lite. Request viewing still requires authentication in both modes.

Telegram requires both the compiled lite mode and TELEGRAM_DISPATCH_ENABLED=true at runtime. Management cannot send even with that flag. Local web commands force false. The deployed lite Worker sets true, and the existing scheduler remains the only scheduled dispatcher.

## Commands and build safety

`scripts/app.ts` loads shared local settings, selects a validated mode/origin, and launches tools without shell interpolation. It rejects arbitrary option passthrough. Dev/start allow an explicit --port and update local origin checks accordingly.

Commands share `.next` and `.open-next`; a PID lock enforces one app/build/preview/typecheck command at a time. Builds write `.app-build.json` only on success. Start/preview verify the expected mode and build ID. Cloudflare Builds builds lite, then uploads an inactive version for manual promotion. Wrangler independently checks the stamp and built Next config before upload. OpenNext invokes Next directly to avoid recursive launcher calls.

This deliberately favors a simple single-repository workflow over simultaneous management/lite servers. Stop one mode before switching; use separate browser profiles when checking sessions because cookies are not isolated by port.

## Data and cache behavior

The database remains shared. Local management edits content; `npm run content:publish` atomically increments its publication revision directly through MongoDB. The optional remote command still supports the authenticated HTTP endpoint. Neither command needs the old folder.

Public queries are fresh for five minutes. The homepage bundles four preview feeds. Public edge entries use a publication revision whose lookup expires after 60 seconds. The custom Worker entrypoint returns eligible cache hits before Next.js/database work. Private, credentialed and mutation requests never use the public cache. Private request queries are cached separately for 60 seconds and cleared at login/logout.

Cloudflare Mongo connections are request-scoped; local Node uses pooling. Schema/index/sample initialization runs in Node, not in Cloudflare visitor requests. Quote snapshots preserve recorded prices; changing the catalogue does not rewrite confirmed enquiries.

## Source and tests

- src/app: public, admin and API routes.
- src/features: booking, content, pricing, contact and admin UI.
- src/server: persistence, auth, API, publishing and durable Telegram queue.
- workers: app cache entrypoint and hosted retry scheduler.
- scripts: mode launcher and operator commands.
- tests: isolated coverage of shared behavior, both mode policies and command/build guards.

The API entrypoint keeps origin checks, mode restrictions and route recognition together. Authenticated admin operations live in `src/server/admin-api.ts`; authentication remains inside that handler. `api-services.ts` defines the injected service contract used by both handlers and tests.

Admin content loading and mutations live in `use-content-manager.ts`, while `content-manager.tsx` renders the controls. The inbox composes separate list, detail/drawer and notice components. Keep booking calculations in the existing pure quote/model modules rather than moving pricing into UI components.

## Diagnostics

Unexpected API failures return a generic 503 with a `requestId` and `X-Request-ID`. Search server/Cloudflare logs for that ID to find the fixed failure category. `database-authentication` indicates rejected credentials; `database-permission` indicates insufficient privileges; connectivity/network categories indicate a connection failure requiring investigation, not proof of an IP allowlist problem. `unexpected` needs reproduction in an isolated development environment.

Diagnostics deliberately omit error messages, stack traces, connection strings, request bodies, query parameters and customer records. Expected validation/authentication failures keep their ordinary status without error logging. Content publishing and Telegram retries log their operation and category too.

## Repeatable integration verification

Run `npm run check:integration` with the app stopped and `.env.local` configured. This builds management mode, creates a random `qa_` database on the configured MongoDB cluster, exercises real HTTP requests, and drops only that temporary database in cleanup. The database user needs permission to create and drop that database. Telegram delivery is explicitly disabled. The ordinary check does not upload or delete Cloudinary assets.

For interactive browser verification after a management build, run `npx tsx --env-file=.env.local scripts/verify-unified.ts --browser`. It keeps the isolated server at `http://localhost:3100` open after the integration checks; press Enter in that terminal when finished to clean up. Synthetic credentials are defined in that script, never use this account in production.

Check sign-in, quote drawer/full detail, portfolio category filtering, quote event selection/back navigation, and mobile layout. The browser pass is manual; it is not implied by the unit-test count. Rebuild lite afterward before Cloudflare bundle checks. Production secrets, cron execution and real network performance require post-deployment verification in `deployment.md`.

The optional `scripts/verify-unified.ts` belongs to full management integration testing and creates an isolated QA database. Its --cloudinary mode creates/deletes real assets and is not run as part of ordinary deployment checks. Ignored secrets, legacy private backups and customer media are never cleanup targets.
