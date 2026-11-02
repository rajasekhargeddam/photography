# Your first-project deployment and maintenance guide

Prepared for My Dream Photography on 30 October 2026. Read sections 1–5 before your first release; keep the checklists nearby afterward.

**Recommended workflow: keep code in GitHub, test locally, and manually deploy the chosen GitHub commit to Cloudflare. Pushing code must not publish it.** Your existing scripts support this workflow.

This guide describes the checked-out project. It does not certify the live website: hosting settings, GitHub integrations, database plans, backups and domain ownership still need checking in their dashboards. No deployment or account changes were performed while preparing it. There are substantial existing uncommitted changes in this checkout; review and save those before treating GitHub as the complete copy.

## 1. Understand what you are managing

| Component                 | Its job                                        | What needs protecting                                                |
| ------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| GitHub repository         | Stores code and its history                    | Source, branches, release tags and access                            |
| Cloudflare app Worker     | Runs the public lite website and request admin | Deployed version, settings, secrets and domain                       |
| MongoDB                   | Stores application records                     | Customer requests, content, pricing, accounts and notification state |
| Cloudinary                | Stores uploaded media                          | Images, original files and asset identifiers                         |
| Local management app      | Edits content and pricing                      | Laptop security and management credentials                           |
| Telegram scheduler Worker | Retries notifications every five minutes       | Matching retry secret, app binding and queue state                   |
| Domain registrar/DNS      | Connects the company address to hosting        | Ownership, renewal, DNS and recovery access                          |

The app Worker is `my-dream-photography-lite`. The scheduler is `my-dream-photography-lite-telegram`. The configured default website is [the lite Worker](https://my-dream-photography-lite.ganeshrajasekhar219.workers.dev).

Management runs on your laptop; the hosted public website and scheduler continue running when your laptop is off. Hosted lite deliberately blocks content and pricing management. This application requires a server and database; GitHub Pages is not the deployment target.

Words you will encounter:

- **Commit:** a saved code revision. Its SHA is its unique identifier.
- **Branch:** a separate line of work, such as a bug fix.
- **Pull request (PR):** a place to review changes before merging them into `main`.
- **Build:** preparing source code to run in production.
- **Deploy:** replacing the running website with a built version.
- **Production:** the real website and real customer data.
- **Rollback:** returning the running code to an earlier version.
- **Restore:** recovering data from a backup. This is separate from code rollback.

## 2. Establish company ownership and recovery

Use company-controlled accounts and billing. Give the owner recovery access to GitHub, Cloudflare, MongoDB, Cloudinary, the registrar and the Telegram bot. You can be the only developer without being the only person who can recover the business accounts.

Enable two-factor authentication, use individual accounts where possible, and store passwords and recovery codes in a company password manager. Keep a private inventory with account owner, service URL, plan, renewal date, billing contact, recovery procedure and where its credentials are stored. Do not put credentials into this guide or GitHub issues.

Agree with your manager on a maintenance window, monthly budget, who receives incident alerts, and how customers should contact the company during an outage. Record which work needs business approval, especially prices, public content, paid services and destructive data changes.

## 3. Make deployment manual only

GitHub itself stores code. Connected hosting integrations and workflows are what turn a push into a deployment.

1. In Cloudflare, inspect both Workers under Workers & Pages. Look in Settings → Builds for connected Git repositories. Remove the Git build connection or disable its automatic build/deploy triggers using the available controls. Keep the existing Worker, domain and secrets. Labels can change; the required outcome is **no push-triggered deployment**. See [Cloudflare build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).
2. In GitHub, inspect Actions and `.github/workflows/`. Remove or disable deployment jobs triggered by `push`, `pull_request`, schedules or external dispatches. Automated tests can remain. This checkout currently has no `.github` directory, but that does not prove remote hosting integrations are absent.
3. Check for other hosting connections, deploy hooks and external automation that point at this repository. Disable only the relevant deployment connection, not company-wide integrations used by other sites.
4. Record the active Cloudflare version ID and time. Push a harmless documentation change. Check build history, deployment history and GitHub Actions: no deploy job or new app/scheduler version should appear after the provider has processed the push.
5. Repeat this check whenever someone changes hosting integrations.

Your deployment button is the terminal command `npm run deploy:lite`. Only run it when you intend to change production.

If you later want a GitHub “Run workflow” button, build a separate manual-only `workflow_dispatch` workflow with restricted production credentials and release checks. That is optional future work; it is not installed by this guide.

## 4. Separate development from live data

Use a development checkout with an isolated database and separate media environment. Use a separate, clearly labelled operations/release checkout for intentional production content management and releases. Both can come from the same GitHub repository. This reduces accidental switching of credentials.

| Environment              | Database/media                                                          | Purpose                                        |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Local development        | Test database, restricted test DB user, separate Cloudinary environment | Coding, fake enquiries and upload/delete tests |
| Local Cloudflare preview | Isolated database in `.dev.vars`                                        | Check behavior in the Worker runtime           |
| Production management    | Real database and real media                                            | Intentional business content changes only      |
| Hosted production        | Real database; stored Worker secrets                                    | Customer traffic                               |

Use a database user restricted to its intended database. A different database name with an account that can modify everything is weaker isolation. Use synthetic customer data in development.

**Local Telegram being disabled does not make production data safe for testing.** If local testing creates a confirmed request in the live database, the hosted scheduler can discover it and notify the real Telegram group.

The current launcher fixes the production Worker identity. A second hosted staging Worker needs deliberate changes to the launcher checks, Worker name, self-reference, scheduler binding, database, domains and secrets. Do not assume adding `--env staging` to an existing npm command creates safe staging. Until that work is done, use isolated local preview.

## 5. First setup and manual deployment from GitHub

### A. Put the complete project in GitHub

If the repository already exists, keep using it. If it does not, create a private repository under the company account and publish the reviewed project using GitHub Desktop or Git. Do not initialize a second unrelated history inside this existing Git checkout.

Before uploading, inspect `git status` and review the files. Commit source files, `package.json`, `package-lock.json`, configuration and documentation. Exclude `.env.local`, `server/.env`, `.dev.vars`, credentials, customer exports, backups, `.next`, `.open-next` and `node_modules`.

The existing `.gitignore` excludes local environment files, but ignored files can still be tracked if committed earlier. Inspect tracked filenames with `git ls-files`; check repository history for previous leaks. If a secret was committed, revoke/rotate it immediately and arrange history cleanup. Deleting the visible line alone does not revoke it.

### B. Prepare your computer

Install Git and a supported Node.js version meeting this project's `>=22` requirement. Use the same tested Node version for development and releases and record it in the release log. Open PowerShell in the intended parent folder, replacing the example repository address:

```powershell
git clone https://github.com/YOUR-COMPANY/YOUR-REPOSITORY.git photography-release
cd photography-release
npm ci
```

`npm ci` installs the lockfile's dependencies. Run commands one at a time and stop on any error. A successful later command does not cancel an earlier failure.

Create `.env.local` from `.env.example` only if it does not already exist. Fill it from the company password manager. Do not overwrite existing settings blindly. A copied example's localhost MongoDB address is not a hosted production database.

The launcher loads root `.env.local`. `server/.env` is not the environment file for these npm commands. Cloudflare local preview uses `.dev.vars` as described in [deployment.md](deployment.md).

### C. Check runtime configuration

For an existing working deployment, preserve its secrets. Your local `.env.local` is **not automatically uploaded** to Cloudflare.

| Setting                                                           | Where it belongs                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `MONGODB_URI`, `MONGODB_DATABASE`                                 | Isolated local files for testing; real values in app Worker secrets         |
| `CLOUDINARY_URL`                                                  | Local management credentials; not required for lite image reads             |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`                                     | Build input; public digits including country code                           |
| `LITE_SITE_URL`                                                   | Build input for an intentional custom HTTPS origin                          |
| `APP_ORIGIN`, `NEXT_PUBLIC_SITE_URL`                              | App runtime; must match the real public HTTPS origin                        |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ALERTS_SINCE` | App Worker secrets; preserve the existing cutoff                            |
| `TELEGRAM_RETRY_SECRET`                                           | Same value in app and scheduler secret stores                               |
| `CONTENT_PUBLISH_SECRET`                                          | Optional remote publishing endpoint, not needed for normal local publishing |

Values prefixed `NEXT_PUBLIC_` can be exposed to browsers; never use that prefix for passwords. Public build values require a rebuild to change.

Authenticate and confirm the correct company account:

```powershell
npm run cf:login
npx wrangler whoami
```

For first provisioning or an intentional secret change, use the interactive prompt, replacing `NAME` with the setting name:

```powershell
npx wrangler secret put NAME --config wrangler.jsonc
```

The scheduler's retry secret uses its own config:

```powershell
npx wrangler secret put TELEGRAM_RETRY_SECRET --config wrangler.telegram.jsonc
```

Changing production secrets is itself an operational change. Preserve secure copies and check dependent services afterward. Do not reset secrets on every release.

For a genuinely new database, provision it with the correct access/network rules, run management against that new database, request local `/api/health` to initialize it, and run `npm run admin:seed` interactively. Review/remove labelled sample content before launch. Do not reseed an existing production installation. Verify connectivity from Cloudflare as well as your laptop; do not broadly relax database network access as an unexplained quick fix.

### D. Choose and check the release

In the release checkout, first confirm that `git status --short` is empty. If it is not, save/review those changes before switching or pulling.

```powershell
git switch main
git pull --ff-only origin main
git rev-parse HEAD
git status --short
npm ci
```

Record the SHA. Do not change source files after validation. The deploy command builds the **local checkout**, not whatever happens to be on GitHub at that moment.

Stop any dev/start/preview process with Ctrl+C. The project shares build directories and allows only one app/build/preview/typecheck command at a time.

```powershell
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build:lite
npm run check:bundle
```

Every command must succeed. These are checks, not deployments. If formatting fails, format only intended files, review the changes, commit/push them and validate that new revision. Avoid a whole-project formatting change mixed into an unrelated release.

Use `npm run preview:lite` with isolated `.dev.vars` for a local Worker-runtime smoke test. Stop preview afterward. `npm run start:lite` is a Node server, not a Cloudflare-runtime check. OpenNext has Windows limitations; if documented symlink/build issues occur, use a properly configured WSL checkout and reinstall dependencies there rather than sharing Windows `node_modules`.

### E. Release intentionally

Before deployment, record the previous Cloudflare version, verify a recent recoverable backup, and tell the company when the release is happening. Prefer business hours when you can watch the result.

```powershell
npm run deploy:lite
```

This rebuilds, validates and deploys to the existing lite Worker. Plain `npm run build` builds management mode and is not the production release command.

Only for initial scheduler setup or a scheduler code/configuration change:

```powershell
npm run telegram:scheduler:check
npm run telegram:scheduler:deploy
```

If changing domains, first attach the intended custom domain to the correct Worker and confirm DNS/TLS. Set `LITE_SITE_URL` for the build and matching runtime origins, then rebuild/deploy. Check canonical URLs, sitemap, admin links and HTTPS. Preserve existing DNS mail records. Follow [the SEO checklist](seo-launch.md).

### F. Verify the live result

- Open the homepage, gallery, service/pricing pages and quote builder on mobile and desktop.
- Check images, navigation, WhatsApp link, missing-page handling and visible prices.
- Check admin login/logout and request/PDF functions with authorized data.
- Confirm anonymous visitors cannot read admin request data and lite management routes remain blocked.
- For an end-to-end live submission, arrange an explicitly approved test with the company. Expect a real record and Telegram alert; do not create surprise notifications or silently delete customer records.
- Check app errors, CPU usage, database connections and scheduler execution. Watch for roughly 15–30 minutes, including multiple scheduler runs.
- Save the new Worker version ID, commit SHA and verification result in the release log.

Do not mark a release complete merely because the homepage opens. Existing project notes identify CPU-heavy cold reads and login hashing; a passing build does not prove the hosting plan can handle real traffic.

## 6. Your normal coding and content workflows

For a code change, start from a clean, updated development checkout:

```powershell
git switch main
git pull --ff-only origin main
git switch -c codex/fix-gallery-spacing
```

Make one focused change, test with isolated data, and review `git diff`. Stage only intended files, commit with a clear message, and push the branch. Open a PR even as the only developer: record the problem, screenshots where relevant, checks and rollback considerations. Review your own diff after a short break. Ask the business owner to confirm customer-facing behavior or prices. Merge when ready; merging must not deploy. Release separately using section 5.

Use an issue list with “To do”, “In progress”, “Ready to release” and “Done”. Keep bugs separate from enhancements. Add a regression test for important logic bugs when practical. Prefer small releases over large unrelated batches.

For intentional content changes, use the production management checkout:

```powershell
npm run dev:management
```

Open `http://localhost:3000/admin/login`, edit approved content and then, in a second terminal in that same checkout:

```powershell
npm run content:publish
```

This increments the revision in the configured database; it does not deploy code. Saves already change database state, so do not treat publishing as a draft/approval barrier. Allow about 60 seconds for edge caches and reload the browser; existing tabs can retain query data for five minutes. Record pricing changes and keep the previous values. Check public content after publishing.

## 7. Backups: protect more than code

**GitHub does not back up MongoDB records or Cloudinary images. A backup is trustworthy only after you successfully restore it.**

Agree on two business targets: the maximum data the company can afford to lose (RPO), and the acceptable recovery time (RTO). A daily backup can lose nearly a day's requests. If that is unacceptable, arrange more frequent backups or suitable point-in-time recovery. Recovery time must be measured in a drill, not guessed.

Suggested starting policy, subject to company retention and privacy requirements:

| What                        | When                                        | Where/how                                                                    |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| Code                        | Each meaningful change; tag releases        | GitHub plus weekly independent encrypted repository backup including history |
| Entire application database | Daily minimum and before risky data changes | Managed snapshots or monitored encrypted exports                             |
| Media                       | Automatic backup plus original-file copies  | Cloudinary backup and independent company storage                            |
| Credentials/configuration   | Whenever changed                            | Company vault; record DNS/settings separately without exposing secrets       |
| Release/incident records    | Every event                                 | Company-accessible private records                                           |

For independently managed backups, a starting retention is 7 daily, 4 weekly and 3 monthly copies. Keep multiple copies, including an off-site copy and a copy protected from accidental deletion. Keep backups outside this repository. Encrypt them, restrict access, and store recovery keys separately. Provider-managed backup storage has its own rules; do not apply arbitrary cleanup policies to it.

### Database backup setup

In MongoDB, identify your actual deployment and plan. Atlas Free clusters do not provide Atlas backups; use a properly managed export process or an appropriate backup-enabled plan. Verify the schedule, retention, last successful backup and restore options in the dashboard. See [MongoDB backup and restore](https://www.mongodb.com/docs/atlas/backup-restore-cluster/).

For manual exports, install MongoDB Database Tools. Use `mongodump` to export the whole application database, including metadata and index definitions. Supply credentials through a protected configuration or password prompt, not pasted into shell history. Write to an encrypted backup directory outside the repository, check the exit result and file size, and copy it to independent protected storage. Record database name, time, tool/server versions and backup location. [MongoDB's mongodump guide](https://www.mongodb.com/docs/database-tools/mongodump/) describes supported options and consistency limitations.

A basic dump while writes continue is not necessarily a single consistent point-in-time view across collections. Choose a supported consistent backup strategy; do not assume adding `--oplog` works with every tier or database-only export. For ongoing business use, favor monitored managed backups where available. A laptop task misses backups when the laptop is off; unattended backup jobs need an always-on environment, restricted credentials and failure alerts. This guide does not install a backup job.

Back up all application collections, including notification progress, rather than only customer names. Reconstructing or clearing queue state can resend old notifications.

### Photo backup setup

In Cloudinary Console Settings → Backup, explicitly enable automatic backup, save, and also run the backup for existing assets. Confirm successful completion. Review storage usage. Keep original photography files and an asset-ID/metadata inventory in separate company storage so database references can be reconciled during recovery. See [Cloudinary backup instructions](https://cloudinary.com/documentation/backups_and_version_management).

### Monthly restore drill

1. Choose a recent backup and record its date.
2. Restore it into a new, isolated database or cluster using compatible versions; never overwrite production as a practice exercise.
3. Use restricted credentials. Keep all schedulers and real Telegram sending disconnected from the restored database.
4. Check collection counts, representative requests, content, pricing, indexes and admin access. Confirm image references still work. Restore a sample backed-up asset into an isolated media environment.
5. Run the local app against that isolated restore and verify important flows without real notifications.
6. Record recovery time, missing items and fixes. Securely remove temporary customer-data copies when the approved drill is complete.

## 8. Recover safely when something breaks

### Bad code deployment

Stop further releases. Record the failing version, time and symptoms. In Cloudflare's deployment history, choose the recorded known-good compatible version and perform a rollback. Check configuration/secret compatibility before confirming and repeat the live checks afterward. The scheduler has separate deployments; roll it back only if needed. See [Cloudflare rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).

A code rollback does not undo MongoDB writes, restore deleted photos or reverse DNS changes. Old code must still understand current data. Prefer backward-compatible database changes: add fields first, deploy compatible readers/writers, migrate with a tested script, and remove old fields only in a later release.

After emergency recovery, revert/fix the bad commit through GitHub so the next deployment cannot accidentally reintroduce it. If a usable hosted version is unavailable, build the known-good GitHub revision in a clean release checkout and manually deploy after checks. Never use a destructive Git reset to discard unsaved work.

### Accidental data or image deletion

Stop the affected writes, preserve the current database and document the incident. Restore the backup into an isolated target first. Compare and recover the affected records/assets while preserving customer activity since the backup. A full production restore can erase newer legitimate requests; use a planned recovery window and business sign-off. Protect Telegram notification state during any restore to avoid replaying old alerts.

### Exposed credentials

Revoke/rotate the affected secret, update dependent stores, check access logs, invalidate affected sessions where applicable, and remove the exposure from code/history. Inform the company owner and follow the company's incident process. Never post customer payloads or secrets into public support tickets.

### Quick diagnosis

| Symptom                                       | First checks                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Entire website fails                          | Last release, Cloudflare errors, DNS/TLS, provider status                                                |
| Pages work but submissions fail               | API errors, MongoDB availability/permissions/connections, runtime secrets                                |
| Photos missing                                | Cloudinary asset existence, URL, quota and deletion history                                              |
| Telegram missing                              | Scheduler errors, bot permissions, cutoff, matching retry secret and queue state; do not clear the queue |
| Content looks old                             | Correct database, content publication revision, cache delay and browser refresh                          |
| Command reports a lock                        | Stop the owning app/build process; do not delete a live process's lock                                   |
| Hosted content-management page is unavailable | Expected in lite mode; use local management                                                              |
| CPU/quota errors                              | Worker metrics, expensive requests and actual plan limits; investigate before retrying repeatedly        |

Use redacted logs and narrow time windows. Keep customer submissions intact. Tell the owner what is affected and when the next update will be; document the cause and prevention after recovery.

## 9. Maintenance calendar

| Frequency               | Tasks                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Every release           | Checks, reviewed commit, backup verification, previous version recorded, live smoke test, release log           |
| Daily working-day check | Public availability, failed requests, Telegram backlog, backup success and error alerts                         |
| Weekly                  | Review errors, dependency/security alerts, database/media growth, costs and outstanding issues                  |
| Monthly                 | Restore drill, access review, small tested dependency updates, mobile/accessibility check, performance trends   |
| Quarterly               | Recovery-access drill with owner, domain/billing review, retention cleanup, capacity and recovery-target review |
| Before expiry           | Renew domain, billing method and expiring credentials/certificates; verify service afterward                    |

Set up external uptime monitoring for a public read-only page and alerts for elevated errors, CPU limits, database failures and backup failure. Monitoring must not submit enquiries or trigger notifications. Alert a second company contact as well as yourself. Review hosting, database and media usage against the actual subscribed limits and set billing alerts where available.

For dependencies, review `npm outdated` and `npm audit`, then update small groups on a branch. Read release notes and rerun checks and preview. Do not blindly run `npm audit fix --force`. Handle applicable serious security fixes promptly. Keep the lockfile and record runtime upgrades. Before modifying Next.js code, read the relevant installed `node_modules/next/dist/docs/` guide as required by this project's `AGENTS.md`.

## 10. Copyable release record

Store this without credentials or customer personal data:

```text
Release name/tag:
Date and time (include timezone):
Operator:
Business reason / issue / PR:
Git commit SHA:
Node and npm versions:
Checks completed:
Database/media backup time and protected location:
Last successful restore drill:
Previous app Worker version:
New app Worker version:
Scheduler changed? Previous/new version if applicable:
Configuration or data changes:
Live verification and observation results:
Rollback compatibility / procedure:
Known limitations and follow-up owner:
```

## 11. Your first-week priorities

1. Secure company ownership, recovery access and the complete reviewed repository.
2. Verify GitHub pushes cannot deploy either Worker.
3. Establish isolated development data and clearly labelled production operations.
4. Enable database/media backups and prove one isolated restore works.
5. Practice the checks and local preview; learn where errors and versions appear.
6. Make one small planned manual release, verify it, and write the release record.
7. Set up monitoring and agree on budget, recovery targets and incident contacts.

These are ongoing operating practices, not a guarantee that every bug is prevented. They make changes traceable, problems visible, and recovery practical for you and the company.
