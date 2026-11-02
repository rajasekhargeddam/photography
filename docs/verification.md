# Unified-mode verification — 29 October 2026

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
