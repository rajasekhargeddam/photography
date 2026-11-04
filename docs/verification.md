# Verification record

## Netlify release preparation — 4 November 2026

- Fixed management builds on Netlify overwriting the public URL with localhost. Hosted builds now require matching APP_ORIGIN and NEXT_PUBLIC_SITE_URL HTTPS origins.
- Added explicit APP_ALLOWED_ORIGINS aliases for the Netlify address and domain transition. Foreign origins, cross-site submissions and missing POST origins remain rejected.
- All 90 automated tests, ESLint, formatting and TypeScript checks passed. An isolated production build passed using https://mydreamphotography.in; generated sitemap URLs use that origin.
- Real Next.js/MongoDB integration passed for login/logout, protected routes, callbacks and retries, rate limits, content validation and operations, quote save/edit/retry/confirm, and admin snapshots. The trusted-alias request reached input validation. Telegram was disabled by clearing the test server's credentials. The temporary QA database was removed; studio records were not changed.
- The first restricted local build stalled; the isolated build passed with normal local process access. The existing development server was left running. The nested QA copy produced a workspace-root warning, but the production build completed.
- No deployment or push was performed. Netlify runtime configuration, DNS/HTTPS, real message delivery and a live browser submission still require verification at release. This pass did not include a new visual/mobile audit. See [final release settings](netlify-final-release.md).

## Maintenance phases — 3 November 2026

- Added safe diagnostic categories and correlation IDs for unexpected API failures; tests confirm raw credential-bearing error messages are not returned or logged.
- Separated authenticated admin API handling, content-manager state/mutations, and inbox list/detail/notice components while preserving existing behavior.
- Corrected the outdated architecture deployment statement and an integration assertion tied to retired homepage wording.
- All 88 tests, lint, type checks and formatting passed. Management and lite production builds passed; lite and Telegram Worker dry runs passed. The lite validation build used the temporary origin `https://example.in`, not a production domain; Cloudflare must build with the real `LITE_SITE_URL`.
- Real Next.js/MongoDB integration passed: synthetic admin login, authorization, callback persistence and throttling, content operations, quote save/edit/retry/confirm, recorded totals and logout. Temporary QA databases were removed; studio records were not modified.
- Browser checks passed for synthetic admin login, quote drawer rendering, portfolio category filtering, and lite booking event selection, required-coverage validation, running total, contact dialog and back navigation. No real booking was submitted in the studio database.
- Added `npm run check:integration` and documented interactive browser QA. Browser checks remain manual; a full mobile/accessibility audit and production load testing were not performed.
- No push, deployment, real Telegram delivery or live Cloudinary upload was performed. Verify company runtime secrets, cron execution and real Cloudflare resource usage after deployment; local checks cannot certify those settings.

## Unified-mode verification — 29 October 2026

## Dependency and release checks — 30 October 2026

- Updated Zod to 4.6.7, OpenNext Cloudflare to 1.20.14 and Wrangler to 4.155.0.
- Scoped the `@node-minify/core` dependency override to patched `glob` 10.5.0; remove this override when upstream adopts a patched dependency. This older major still carries an npm deprecation warning.
- Full npm audit reported zero known vulnerabilities. All 86 automated tests, ESLint and formatting passed; both production builds passed their TypeScript checks.
- Management and lite production builds, lite Worker dry-run and Telegram scheduler dry-run passed.
- Updated local Cloudflare runtime: homepage 200, management content API 404, anonymous enquiry API 401 and disabled Telegram retry 503.
- No live deployment or real Telegram delivery was performed. Free-tier CPU suitability still requires production measurement; passing these checks does not establish that all traffic stays within free limits.

- 83 isolated automated tests passed, covering existing behavior plus mode restrictions, Telegram enablement, command arguments and build identity/origin checks.
- ESLint, TypeScript and formatting passed.
- Management production build and lite OpenNext build passed.
- Management Node smoke checks: homepage 200, management pages redirect anonymous users to login, management/request APIs return 401, local Telegram retry returns disabled 503.
- Lite Node and local Cloudflare smoke checks: homepage 200, content/pricing pages and APIs return 404, request APIs return 401, local Telegram retry returns disabled 503.
- Lite Worker and scheduler deployment dry-runs passed.
- A management build was rejected by both lite startup and the pre-upload check. Concurrent build while a server was running was rejected by the command lock.
- Every npm script is documented in README.md; local Markdown links resolve.

No live deployment, secret transfer, customer-record mutation or real Telegram message was performed. Local probes were anonymous/read-only except POST to the disabled retry endpoint, which returns before database access. Existing production sender/secrets remain unchanged. Full authenticated upload workflows retain automated regression coverage but were not repeated against production during this conversion. Free-tier CPU suitability remains unresolved.
