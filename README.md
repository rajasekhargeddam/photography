# My Dream Photography — Management application

Full application for local studio content management, with the same public-site and request-list optimizations as the lite deployment.

## Project roles

| Project                | Admin features                                                                 | Telegram delivery                             |
| ---------------------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| photography            | Requests, callbacks, portfolio and hero uploads, testimonials, videos, pricing | Disabled by default after cutover             |
| photography-cloudflare | Requests and callbacks only                                                    | Active sender and five-minute retry scheduler |

Both use the same MongoDB database. Cloudinary stores photos; YouTube videos are links. Content edits are shared through the database; code and local public assets require separate builds/deployments. Do not replace one project's deployment identity or environment with the other's.

## Local development

Requires Node.js 22 or newer and npm. Run commands from this project directory.

1. Run `npm ci`.
2. Create `.env.local` from `.env.example` only if it does not already exist. Configure MongoDB and the exact local origin; keep credentials private.
3. Run `npm run dev` and open `http://localhost:3000`.

Use the full admin portal for gallery/hero uploads, testimonials, video links and pricing. Run `npm run admin:seed` interactively when provisioning a new administrator; existing accounts do not need reseeding.

Admin login: `/admin/login`. Request inbox: `/admin/requests`. Callbacks: `/admin/callbacks`. Admin data is authenticated and never stored in the public edge cache.

## Content publishing

After saving content or prices through the original app, run from the original project directory:

`npm --prefix ../photography-cloudflare run content:publish`

The lite operator environment must contain CONTENT_PUBLISH_ORIGIN and CONTENT_PUBLISH_SECRET matching the deployed app. Allow about one minute for edge revision refresh, then reload the website. Existing tabs can reuse public query data for five minutes; publishing does not push updates into open tabs.

## Checks and deployment

- `npm test`: isolated automated tests; no real customer submissions or Telegram sends.
- `npm run lint`, `npm run typecheck`, `npm run format:check`.
- `npm run cf:build`: Next.js/OpenNext production build.
- `npm run cf:preview`: local Cloudflare runtime preview.
- `npm run cf:deploy`: deploy the built application; first follow [deployment instructions](docs/deployment.md), especially build-time URLs and secrets.

The code builds for Cloudflare. Guaranteed operation within free-tier limits is **not established**: previous lite cache hits measured 1–2 ms CPU, but misses measured 58–665 ms, and login hashing remains expensive. These are individual historical measurements, not guarantees or measurements of this cleanup.

## Documentation

- [Deployment and environment setup](docs/deployment.md)
- [Architecture, caching and project differences](docs/architecture.md)
- [Telegram operation and retries](docs/telegram-alerts.md)
- [SEO/domain launch checklist](docs/seo-launch.md)
- [Design system](docs/design-system.md), [interface wording](docs/interface-wording.md), [portfolio browsing](docs/portfolio-browsing.md)
- [Historical implementation records](docs/archive/README.md)

Saved quote PDFs preserve recorded prices. Historical enquiries remain readable; drafts are held in browser memory. Confirm current business rates, service details and sample content with the studio before public launch. This repository does not implement payments or guaranteed date reservations.
