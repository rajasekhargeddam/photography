# My Dream Photography

One codebase: full management locally, lite website on Cloudflare Workers.

## Local use

Requires Node.js 22+ and `npm ci`. Configure `.env.local` using `.env.example` as a template; never overwrite existing credentials.

- `npm run dev:management`: website and content/pricing management at http://localhost:3000.
- `npm run dev:lite`: lite preview at http://localhost:3001.
- `npm run admin:seed`: create an admin interactively in the configured database.
- `npm run content:publish`: publish intended content changes to the shared database.

Local web commands disable Telegram delivery. A deployed scheduler can still discover confirmed requests in a shared database. Use isolated data for testing.

## GitHub → Cloudflare → manual activation

Push code to GitHub. Cloudflare builds and uploads an inactive version. Select that version in Cloudflare **Deployments → Promote deployment** when ready to make it live. No GitHub Actions workflows or immediate-deployment npm commands are included.

See [the deployment setup](docs/deployment.md) for the exact company-account configuration, secrets, first-time setup, and scheduler setup.

| Cloudflare setting | Lite website                                  | Telegram scheduler                                          |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| Worker name        | `my-dream-photography-lite`                   | `my-dream-photography-lite-telegram`                        |
| Root directory     | Repository root                               | Repository root                                             |
| Build command      | `npm run check:release && npm run build:lite` | `npm run check:release && npm run telegram:scheduler:check` |
| Deploy command     | `npm run upload:lite`                         | `npm run telegram:scheduler:upload`                         |

The fields called **Deploy command** above upload versions only. Disable non-production branch builds unless intentionally needed. Builds still run on pushes; production changes only when you promote a version.

## Verification and previews

`npm run check:release` runs tests, lint, types and formatting. `npm run build:lite` builds only; `npm run check:bundle` validates its bundle without publishing. Lite builds require `LITE_SITE_URL` explicitly; there is no old-account URL fallback.

`npm run check:integration` builds management and checks real HTTP/database behavior using a disposable synthetic MongoDB database. It requires local database credentials and is not part of Cloudflare Builds. See [integration verification and diagnostics](docs/architecture.md) for cleanup, browser checks and safe error logs.

Run only one app/build/preview/typecheck command at a time because output directories are shared. `npm run start:lite` serves a matching build with Node. `npm run preview:lite` uses the local Cloudflare runtime and `.dev.vars`. Windows OpenNext builds may require WSL

## Further documentation

- [Deployment and secrets](docs/deployment.md)
- [Telegram operation](docs/telegram-alerts.md)
- [Image uploads](docs/image-uploads.md)
- [Architecture](docs/architecture.md)
- [SEO/domain checklist](docs/seo-launch.md)
- [Historical notes](docs/archive/README.md)
