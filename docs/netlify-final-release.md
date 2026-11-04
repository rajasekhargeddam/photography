# Netlify final release

Prepare these settings together before the final deployment. DNS record changes and domain verification do not rebuild the application; changes to application environment variables require a new deploy.

## Production configuration

Use the following public values in Netlify's Production environment, available to Builds and Functions (or all scopes). Do not mark these as secrets:

```dotenv
APP_ORIGIN=https://mydreamphotography.in
NEXT_PUBLIC_SITE_URL=https://mydreamphotography.in
APP_ALLOWED_ORIGINS=https://mydreamphotography.netlify.app,https://www.mydreamphotography.in
```

The final domain is canonical for SEO and Telegram links. The explicit aliases permit forms on the Netlify address and www address during the domain transition. No wildcard hosts are accepted. Use origins only: no paths or trailing slashes. Local development continues to use localhost automatically.

The build command is `npm run build`; Netlify sets `NETLIFY=true` automatically. The build now rejects missing or mismatched production origins instead of silently building with localhost URLs.

Preserve existing MONGODB_URI, MONGODB_DATABASE, CLOUDINARY_URL and Telegram settings. Credentials (database URI, Cloudinary URL, bot token and retry secret) must be secret and available to Functions. Keep TELEGRAM_ALERTS_SINCE unchanged unless intentionally changing historical eligibility. Do not empty notification records. Scheduled retries may still send previously unsent requests.

## Domain and deployment

1. Add the custom domain in Netlify and configure the exact DNS records shown under Pending DNS verification. Preserve existing email records.
2. Wait for DNS verification and HTTPS certificate provisioning. No code deployment is needed just for DNS propagation.
3. Confirm all environment variables above, plus existing service credentials, before deploying the reviewed code once.
4. Check the final HTTPS URL, portfolio, login and a controlled booking submission after deployment. Confirm the saved request and Telegram delivery. These hosted checks cannot be certified by local tests.

Avoid pushing changes to a branch connected to automatic Netlify deployment until ready for this release. Local builds and tests do not create Netlify deployments.

## Local verification

Run tests, lint, type checks and formatting checks. Build in an isolated local copy when the development server holds the app command lock. The integration runner creates and removes its own synthetic database and clears Telegram credentials in its child server so QA cannot send real alerts.
