# My Dream Photography — one codebase, two modes

Use this **photography** repository for development, content management and lite deployment. Shared fixes are made once. The old sibling photography-cloudflare directory is a backup/reference, not a dependency of these commands.

| Capability                                             | Management mode       | Lite mode                                 |
| ------------------------------------------------------ | --------------------- | ----------------------------------------- |
| Public site, quote builder and callbacks               | Yes                   | Yes                                       |
| Admin requests, read receipts and saved PDFs           | Yes                   | Yes                                       |
| Gallery/hero uploads, testimonials, videos and pricing | Yes                   | No; pages and APIs reject access          |
| Default local URL                                      | http://localhost:3000 | http://localhost:3001                     |
| Telegram from a local run                              | Disabled              | Disabled                                  |
| Deployment target                                      | Local operation       | Existing my-dream-photography-lite Worker |

## First-time setup

Requires Node.js 22 or newer and npm.

1. Open a terminal in this repository and run `npm ci`.
2. If `.env.local` does not exist, create it from `.env.example`. Do not overwrite an existing environment file.
3. Configure `MONGODB_URI`, `MONGODB_DATABASE`, `CLOUDINARY_URL` and the optional public WhatsApp number. Existing local settings can remain; no secrets need to be copied from the old lite folder.
4. Run `npm run dev:management`. Existing admin accounts work against the same database. Seed an account only when setting up a new installation.

The commands set the mode and local URL themselves. Do not manually set APP_VARIANT. Local runs can still read/write the database selected in `.env.local`; use a separate database for disposable test requests. Disabling local Telegram does not make a production database a sandbox: the hosted scheduler can discover new confirmed requests in that shared database.

## Everyday content updates

```powershell
npm run dev:management
```

Open http://localhost:3000/admin/login. Manage photos, hero images, testimonials, video links or pricing. Once saved, use a second terminal in this same repository:

```powershell
npm run content:publish
```

Publishing increments the revision directly in the configured shared MongoDB database. It needs no copied publishing secret and no running local website. Allow about 60 seconds for deployed edge caches to adopt the revision, then reload the website. Existing browser tabs can otherwise reuse public query data for five minutes. Content updates do not require a code deployment.

### Large photos

Portfolio and hero uploads automatically prepare photos above 9 MiB as high-quality website copies before uploading. Your local originals remain untouched. The queue shows the output size, dimensions and preview. See [large-photo upload behavior](docs/image-uploads.md).

## Preview the lite experience locally

Stop management with Ctrl+C, then run:

```powershell
npm run dev:lite
```

Open http://localhost:3001. The website and request admin work; management pages/APIs are blocked. Telegram is disabled. To choose another local port, use `npm run dev:lite -- --port 3101` (also supported for management and start commands).

**Run one app/build/preview/typecheck command at a time.** Both modes deliberately share `.next` and `.open-next`. A command lock prevents concurrent processes from corrupting the output. Stop the running command before switching modes. Tests, lint and content publishing may run in another terminal. Cookies belong to the hostname, not the port; use a private browser window to keep separate test sessions.

## Deploy a shared-code change

```powershell
npm test
npm run lint
npm run typecheck
npm run format:check
npm run deploy:lite
```

`deploy:lite` always builds a fresh lite bundle, validates it, then deploys to the existing **my-dream-photography-lite** Worker. It does not deploy the full management app. Existing Cloudflare secrets stay in that Worker's store. The default production URL is the existing workers.dev origin; set `LITE_SITE_URL` for an intentional domain change and update runtime origins as described in [deployment.md](docs/deployment.md).

Use `npm run build:lite` followed by `npm run check:bundle` to validate without deploying. Scheduler changes require a separate scheduler deployment; ordinary app updates do not.

## Every npm command

### Run and build

| Command                    | What it does                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run dev:management`   | Full local development app on port 3000; Telegram off.                                                                 |
| `npm run dev:lite`         | Requests-only local development app on port 3001; Telegram off.                                                        |
| `npm run build:management` | Production-mode Next.js build for local management.                                                                    |
| `npm run start:management` | Serve the matching management build on port 3000. Build first.                                                         |
| `npm run build:lite`       | Next.js + OpenNext build with lite access rules and the production canonical origin. Does not deploy.                  |
| `npm run start:lite`       | Serve the matching lite build locally with Node on port 3001; Telegram off. This is not the Cloudflare runtime.        |
| `npm run preview:lite`     | Preview a verified lite build in the local Cloudflare runtime. Configure isolated `.dev.vars`; Telegram is forced off. |
| `npm run check:bundle`     | Wrangler dry-run for a verified lite build; no deployment.                                                             |
| `npm run deploy:lite`      | Fresh lite build, verification, then deployment to the existing lite Worker.                                           |
| `npm run dev`              | Alias for dev:management.                                                                                              |
| `npm run build`            | Alias for build:management.                                                                                            |
| `npm start`                | Alias for start:management.                                                                                            |

Development invalidates the build stamp. After switching modes or running development, rebuild before start/preview. The launcher checks mode, build ID and, for Cloudflare operations, canonical origin. Wrangler also rejects a management bundle before upload. Use the documented commands instead of raw Next/OpenNext commands to retain those checks. A crashed command's lock is recovered when its process no longer exists; do not manually remove a lock belonging to a live process.

### Quality checks

| Command                | What it does                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `npm test`             | All isolated unit/regression tests, including both mode policies. No real Telegram delivery. |
| `npm run lint`         | ESLint, with warnings treated as failures.                                                   |
| `npm run typecheck`    | Generate route types and run TypeScript; stop the app first.                                 |
| `npm run format:check` | Verify formatting without changing files.                                                    |
| `npm run format`       | Apply Prettier formatting. Review the resulting diff.                                        |

### Content and account administration

| Command                          | What it does                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run content:publish`        | Increment the content revision in the configured MongoDB database after intended content/pricing edits.                                                     |
| `npm run content:publish:remote` | Optional alternative: call the HTTPS publishing endpoint using CONTENT_PUBLISH_ORIGIN and CONTENT_PUBLISH_SECRET. Not needed for the normal local workflow. |
| `npm run admin:seed`             | Interactively create an admin; does not overwrite an existing account.                                                                                      |
| `npm run admin:disable`          | Disable the selected admin and revoke access.                                                                                                               |
| `npm run admin:reset-password`   | Set a new password and invalidate sessions; does not reactivate a disabled account.                                                                         |

These operator commands load `.env.local` and act on its configured database. Password prompts are private. Never paste credentials into source files or chat.

### Cloudflare and Telegram

| Command                             | What it does                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run cf:login`                  | Sign in to Cloudflare through Wrangler.                                                                                                                       |
| `npm run cf:build`                  | Compatibility alias for build:lite.                                                                                                                           |
| `npm run cf:preview`                | Compatibility alias for preview:lite.                                                                                                                         |
| `npm run cf:deploy`                 | Compatibility alias for deploy:lite, including a fresh build. **Now targets lite, not the old full app.**                                                     |
| `npm run telegram:scheduler:check`  | Dry-run the separate retry scheduler.                                                                                                                         |
| `npm run telegram:scheduler:deploy` | Deploy the existing lite scheduler with its five-minute cron and APP binding.                                                                                 |
| `npm run telegram:worker`           | Advanced local retry loop; refuses to run unless APP_VARIANT=lite and TELEGRAM_DISPATCH_ENABLED=true are explicitly configured. Not part of normal operation. |
| `npm run telegram:worker -- --once` | Same advanced worker, but process one batch and exit. Use only an isolated destination or intentional cutover.                                                |

The deployed lite runtime enables Telegram through wrangler.jsonc. Management never enables delivery, even if the runtime flag is true. Local run/preview commands disable it. The existing hosted scheduler handles retries while your laptop is off. See [Telegram operation](docs/telegram-alerts.md).

## Further documentation and limits

- [Verification results](docs/verification.md)
- [Deployment, secrets, custom domains and rollback](docs/deployment.md)
- [Architecture and mode isolation](docs/architecture.md)
- [Telegram](docs/telegram-alerts.md)
- [SEO/domain checklist](docs/seo-launch.md)
- [Design system](docs/design-system.md), [interface wording](docs/interface-wording.md), [portfolio browsing](docs/portfolio-browsing.md)
- [Historical records](docs/archive/README.md)

A single repository does not guarantee Cloudflare free-tier suitability. Prior lite cache hits measured 1–2 ms CPU; misses measured 58–665 ms, and login hashing remains expensive. Confirm business rates, terms and sample content before launch. No payments or guaranteed date reservations are implemented.
