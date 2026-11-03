# GitHub-connected Cloudflare deployment

Cloudflare retrieves code from GitHub, builds it, and uploads a version. You activate the chosen version manually in Cloudflare. GitHub Actions and local direct-deployment scripts are not used.

## 1. Create the company Workers

In the company Cloudflare account, create and deploy two starter/Hello World Workers using the dashboard:

- `my-dream-photography-lite`
- `my-dream-photography-lite-telegram`

This bootstraps the Workers before version uploads. Do not attach the public domain or enable the scheduler cron while placeholder code is active. The names must match the repository configuration; service bindings resolve within this same company account.

## 2. Connect the GitHub repository

For each existing Worker, open **Settings → Builds**, connect the repository, choose `main`, and use the repository root. Authorize the Cloudflare GitHub app for this repository. Configure the following before triggering a build:

| Setting        | Website Worker                                | Scheduler Worker                                            |
| -------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Build command  | `npm run check:release && npm run build:lite` | `npm run check:release && npm run telegram:scheduler:check` |
| Deploy command | `npm run upload:lite`                         | `npm run telegram:scheduler:upload`                         |

Cloudflare installs dependencies from the lockfile. Set the build variable `NODE_VERSION=22` for both Workers. Use a Cloudflare build token scoped to the company account. You do not need Cloudflare credentials in GitHub Secrets.

Disable non-production branch builds for this simple setup. Never leave the default `wrangler deploy` command in place: it immediately activates code. The configured commands upload versions without activating them.

For the website, also set these **Build variables**:

- `LITE_SITE_URL`: exact company HTTPS origin, no trailing slash. Initially use the company Worker's workers.dev address shown in Cloudflare, then your custom domain when ready.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: company WhatsApp number, international digits only.

There is no hard-coded personal-account URL fallback. The build fails if `LITE_SITE_URL` is missing.

## 3. Runtime configuration

Under the website Worker's **Settings → Variables and Secrets**, set:

| Name                     | Value                                        |
| ------------------------ | -------------------------------------------- |
| `MONGODB_URI`            | Company database URI                         |
| `MONGODB_DATABASE`       | Company database name                        |
| `APP_ORIGIN`             | Same exact origin as build `LITE_SITE_URL`   |
| `NEXT_PUBLIC_SITE_URL`   | Same exact origin as build `LITE_SITE_URL`   |
| `TELEGRAM_BOT_TOKEN`     | Company bot token                            |
| `TELEGRAM_CHAT_ID`       | Intended chat/group ID                       |
| `TELEGRAM_ALERTS_SINCE`  | Intended notification cutoff, ISO timestamp  |
| `TELEGRAM_RETRY_SECRET`  | Strong random shared secret                  |
| `CONTENT_PUBLISH_SECRET` | Optional, for remote content publishing only |

The scheduler needs only the same `TELEGRAM_RETRY_SECRET`. Its `APP` service binding targets `my-dream-photography-lite`. Never rotate the shared secret on just one Worker.

Store credentials as secrets. `.env.local` and `.dev.vars` remain ignored local files, not GitHub uploads. `CLOUDINARY_URL` is needed for local management uploads, not lite image reads. Runtime secret changes are separate from code promotion and should be made deliberately; prepare them before uploading the version that will use them.

Provision the company database through local management, create the admin account, and verify content and prices. Atlas must permit Cloudflare runtime connections; allowing just your laptop IP is not sufficient.

## 4. Activate a release yourself

1. Push the reviewed code to GitHub and wait for a successful Cloudflare build.
2. Open the website Worker → **Deployments → Promote deployment**.
3. Select the uploaded version matching the intended commit and set it to 100%.
4. Verify home/gallery, pricing, admin login, and `/api/health`.
5. Promote the scheduler version after the website is working.

Use the new version's commit identifier, not just **Retry build** on an old build: retrying an old build may rebuild that old commit. Pushes create versions and consume build minutes but do not change the active website with these commands.

## 5. Enable the scheduler once

Version uploads do not apply Cron Triggers. After activating the scheduler code, use its Cloudflare **Settings → Trigger Events / Cron Triggers** control to add:

```text
*/15 * * * *
```

This matches `wrangler.telegram.jsonc`: 96 checks daily. Configure the cron separately in the dashboard if you change it later; promoting a version does not update it. The scheduler needs no custom domain and should have public workers.dev access disabled in the dashboard.

Check execution logs after the next scheduled run and verify an intended Telegram alert. A successful build/upload does not prove delivery or CPU-limit suitability. Website notifications are attempted immediately; this scheduler handles retries.

## Custom domain and rollback

Attach the domain to the website Worker in Cloudflare. Update build `LITE_SITE_URL` and runtime `APP_ORIGIN`/`NEXT_PUBLIC_SITE_URL`, upload a new build, then promote it. Preserve email DNS records when changing nameservers.

For rollback, promote a known-good earlier Worker version. This does not roll back database records, secrets, cron configuration, or other external resources.

## References

- [Cloudflare Git builds and inactive version uploads](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Versions and deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
