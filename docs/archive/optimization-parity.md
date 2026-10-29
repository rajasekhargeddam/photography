> Historical implementation record. Status and instructions may be superseded. Use [the current deployment guide](../deployment.md).

# Original and lite optimization parity

The original photography project now uses the lite project's shared public query caching, bundled homepage API, publication-aware edge caching, outer Worker fast path, requests-only notification trigger, admin request caching and Telegram formatting/multipart queue code.

Intentional differences:

- Original keeps all content and pricing admin routes, navigation, uploads, edits and deletion. Lite keeps its requests-only portal.
- Original retains TELEGRAM_LOCAL_DISPATCH_ENABLED opt-in so the existing lite sender remains the sole production dispatcher. The retry worker source is shared, but no second scheduler is configured or deployed.
- Each project retains its own Worker identity, environment and credentials. No environment files were copied or changed.
- Original retains management API tests; lite's disabled-management tests do not apply here.

## Content updates

Continue editing shared database content through the original local admin. After completing edits, use the existing configured publishing command:

    npm --prefix ../photography-cloudflare run content:publish

This only calls the existing deployment; it does not modify the lite project. Allow about one minute for edge revision refresh, then reload the public website. Existing browser query data can otherwise remain fresh for five minutes. The original also contains the same publishing endpoint and script if separately configured later.

Node/local database initialization still provisions indexes. Cloudflare request handlers assume the database was provisioned beforehand. Public cache hits avoid Next.js/database work, but cache misses and password hashing may still exceed free-tier CPU budgets.

No deployment or production-data mutation was performed as part of this synchronization.

## Verification

78 tests passed, including full admin upload/edit/pricing protections and the original-only Telegram dispatch safeguard. ESLint, TypeScript and the OpenNext Cloudflare production build passed. The build includes /admin/content/[kind] and /admin/pricing. Shared src files match lite except admin-shell.tsx (full navigation), server/api.ts (management enabled), and server/telegram-queue.ts (dispatch opt-in); original-only management page/layout files remain intact.
