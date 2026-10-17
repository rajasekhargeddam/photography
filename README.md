# My Dream Photography — current application

Updated: 2026-10-14 (Asia/Kolkata). This is the single application handoff. Built behaviour and completed verification are documented below.

## Working agreement

- All three phases were authorized and completed on 2026-10-14. Wait for new instructions before further changes or deployment. On resuming, read the tracker below; do not repeat completed work.
- Work token-efficiently: read this document first, inspect only relevant files, reuse completed findings, avoid duplicate plans and broad reference exploration. Run focused checks for changed behaviour; do not repeat unchanged tests without a reason. Keep updates and handoffs concise.
- Reference: [Grit Photography](https://gritphotography.netlify.app/), particularly [Build Your Quote](https://gritphotography.netlify.app/build-your-quote). The quote builder follows its question-by-question layout and flow, with My Dream Photography branding, local images and sample prices. Public pages use the agreed managed-content layouts. No reference enquiry was submitted.
- No plans/packages. Rates remain clearly labelled development samples until the user supplies confirmed business details.
- User authorized main-database testing on 2026-10-14 and reported it contains no real data. Future tests may use it; check current contents and identify test records before cleanup. Do not delete unrelated records. The temporary PDF QA database has been deleted.
- Preserve private configuration. No real admin accounts have been seeded and nothing has been deployed.

## Built experience

Public pages: Home, About, Portfolio (category filters, lightbox and YouTube videos), Services, Testimonials and Contact. `/reviews` permanently redirects to `/testimonials`. No Blog, customer accounts or payments. The footer contains a small **Admin portal** link to `/admin/requests`: valid admin sessions enter directly; unauthenticated visitors are redirected to login by the server-side route guard. `/packages` permanently redirects to `/book`; historical package enquiries remain readable.

- Home hero: **BOOK YOUR DATE** links to Contact; **BUILD YOUR QUOTE** links to `/book`. Home Services and How it works sections are removed; the Services page remains.
- Home and full pages share managed galleries, testimonial cards and videos. Portfolio uses four desktop columns, two tablet columns and one mobile column with natural image proportions. Tiles have tight 10px spacing and no captions or arrow overlays; sample disclosure is shown once per collection. Categories: All, Wedding, Pre-Wedding, Engagement, Makeover, Half Sari, Haldi, Birthday, Others. Lightbox supports keyboard arrows/Escape and only browses the displayed collection.
- Home displays up to eight photos, three testimonials and one film. Full collections have Load more; filters apply server-side across the entire gallery. No-cache fetches on navigation/focus reflect admin changes without a rebuild. Empty, loading, error/retry and unavailable-image states are included.
- Testimonials show initials, person name, supplied date and text in review cards; no fabricated ratings. Samples remain labelled with no invented dates. YouTube players load after Play; a direct YouTube link remains available if embedding fails. Videos are not stored in Cloudinary.
- Contact includes name, ten-digit phone, event date, event type including Others, optional note and **Request a Call**. Validated requests persist in MongoDB and appear under **Admin → Requests → Callback requests**, separate from quotes. Retries reuse an insert-only request ID; duplicate clicks are blocked. Requests are rate-limited globally and per hashed phone, with existing same-origin checks. Submission requests a callback, not a date reservation. The quote builder remains date-free.

Quote flow at `/book`:

- Six category cards: Wedding, Pre-/Post-Wedding, Engagement, Birthday/Pre-Birthday, Maternity and Other Events. Other Events includes baby/corporate/other choices.
- One question per screen, optional wedding ceremonies, one-/two-day couple shoots, eligible coverage, running total, Back/Next and direct summary editing. Shared rules live in `src/features/booking/quote.ts`; the question sequence is in `questions.ts`.
- Albums: 12×36 or 14×40, one-/three-month delivery preference and editable quantity. These are sample choices, not confirmed specifications or deadlines. Streaming/LED/crane options are available where eligible.
- **No customer date questions or date/place editing.** Internal empty/undecided date fields remain for API compatibility and historical records.
- Name and ten-digit mobile save the enquiry as **ATTEMPTED before revealing the full summary**, with a follow-up notice. Customers can edit services, quantities, ceremonies, albums and notes. Edits must be saved before sending.
- Sending confirms the same saved revision as **CONFIRMED** without displaying a booking/reference ID. This requests studio follow-up; it does not reserve a date or collect payment.
- **Save as PDF / Print** appears on the saved summary, confirmation and admin quote detail. The browser print window offers Save as PDF. A4 output contains business/contact details, status, all selected services, unit prices, quantities, group subtotals, album preferences, notes and total. Export uses saved prices, supports historical enquiries and is disabled for unsaved client edits. Booking/reference IDs are omitted. Turn off browser headers and footers in the print window to omit the page URL; internal IDs and routes remain unchanged.
- Drafts and the post-confirmation PDF snapshot are held in memory and clear on refresh. Saved database enquiries remain. Persistent recovery and external sharing are not implemented.

## Architecture and data

One Next.js 16 / React 19 / TypeScript application serves the public website, API and admin. Redux holds the quote draft; Axios handles quote/inbox `/api` calls; native fetch handles content management; Zod validates input; MongoDB stores enquiries, admins, sessions, rate limits and managed content. One application deployment plus MongoDB and Cloudinary image storage is required. The retired admin app, duplicate dependency folders and obsolete build assets have been removed. Only the private legacy `server/.env` backup remains; the app loads root `.env.local`.

- Public/booking routes: `src/app/(site)`; admin: `src/app/admin`; API adapter: `src/app/api/[...path]/route.ts`.
- Backend: `src/server`; booking UI/domain: `src/features/booking`; inbox/auth UI: `src/features/admin`; catalogue: `src/data/catalog.ts`; company details: `src/config/business.ts`.
- Shared client/admin PDF document: `src/features/booking/components/quote-print.tsx`; print styling: `src/styles/quote-print.css`. No PDF service or extra package is required.
- Server calculates prices and rejects client totals, unknown/ineligible services and invalid quantities. Contract version 2 stores ceremony selections, duration, service quantities (1–5), album count (0–5), preferences, contact and notes. Sample snapshots identify `guided-sample-v3` / `DEVELOPMENT_SAMPLE`.
- Guest UUID plus private bearer token protects save/confirm. Only the token hash is stored server-side. Revisions reject stale confirmation; retries are idempotent; confirmed snapshots are not repriced or overwritten. Historical package records are read-only.

## API and admin

- `PUT /api/enquiries/:id`: save/update guest enquiry; `POST /api/enquiries/:id/confirm`: confirm saved revision. Both require the guest bearer token.
- `POST /api/auth/login` and `/logout`: seeded admin access. No public registration.
- `GET /api/admin/enquiries` and `/:id`: authenticated list/detail. Inbox is read-only, newest-first, grouped in India time, with Attempted/Confirmed status, saved breakdown, notes, click-to-call, refresh, pagination and saved-snapshot Print / Save as PDF.
- `/admin/login`, `/admin/requests`, `/admin/requests/[id]` share the same app. Passwords use scrypt; seven-day HttpOnly SameSite=Strict cookies (Secure in production), with matching server expiry. Existing sessions retain their original expiry; sign in again for seven days. Server checks active account/session on every private request. Disabling/resetting credentials revokes access.
- `/admin/content/gallery`, `/admin/content/testimonials`, `/admin/content/videos`: shared navigation, View website, validated add forms, previews, paginated lists and inline delete confirmation. Gallery supports Wedding, Pre-Wedding, Engagement, Makeover, Half Sari, Haldi, Birthday and Others. Testimonials require name, date and text; YouTube entries require title and supported HTTPS link.
- `GET /api/content/{gallery|testimonials|videos}` exposes ready content with `offset`, `limit` (1–30), and optional gallery `category`. Authenticated `/api/admin/content/{kind}` supports GET/POST, and `/{id}` supports DELETE. Public home/gallery/testimonial/video components consume these endpoints.
- `POST /api/callbacks` accepts validated contact requests and returns success without personal data. `GET /api/admin/callbacks?offset=0` returns authenticated, newest-first pages of 30 requests. The `callbacks` collection is separate from quote enquiries.
- Images are server-signed Cloudinary uploads: JPEG/PNG/WebP, maximum 4 MB, validated headers and returned dimensions/URL. Only app-owned assets can be deleted. Pending entries survive interrupted uploads; after two minutes, delete and retry. Failed Cloudinary deletion retains the record for retry. API secrets never reach the browser.
- Mongo `content` stores metadata, review text and normalized YouTube IDs. Existing local samples are imported idempotently and remain labelled. Deleted entries retain tombstones so samples cannot reappear after restart. Sample reviews have no invented customer dates. Videos are linked, not uploaded to Cloudinary.
- Same-origin write checks, Mongo-backed rate limits, 16 KiB JSON limit and no-store private responses are implemented. Secrets stay server-side.

## Run and configuration

Node.js 22+ and npm. Install with `npm ci`. Create `.env.local` from `.env.example` only if absent; never overwrite existing secrets.

| Variable               | Purpose                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| `MONGODB_URI`          | Private database connection                                                       |
| `MONGODB_DATABASE`     | Database name; default `photography`                                              |
| `APP_ORIGIN`           | Exact trusted write origin; HTTPS in production                                   |
| `NEXT_PUBLIC_SITE_URL` | Public canonical origin; local default `http://localhost:3000`                    |
| `CLOUDINARY_URL`       | Server-only `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`; configured and verified |

`npm run dev` starts the app at `http://localhost:3000`. `npm run build` / `npm start` build and serve production. Old shared admin keys, separate API origins and legacy ports are unused.

Admin operator commands: `npm run admin:seed`, `npm run admin:disable`, `npm run admin:reset-password`. They prompt for email and, where needed, a hidden password. Seed reruns preserve existing accounts; reset invalidates sessions and does not reactivate disabled accounts.

Checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`. Opt-in integration script: `npx tsx --env-file=.env.local scripts/verify-unified.ts` (build first). It creates/cleans an isolated QA database; `--browser` holds port 3100 until Enter. Add `--cloudinary` to test a real signed image upload and deletion with configured credentials. Main-database permission does not change that script automatically.

## Verified state and known limits

Cleanup removed unused wizard/progress/breakdown/form components, obsolete styles, unused Redux actions and the unnecessary booking query provider. Quantity controls and album pricing are shared; PDF export reuses the common button. Empty scaffolding and obsolete tool exclusions were removed. App behaviour and historical-record compatibility are retained.

Phase 2 passed 25 tests, production build/TypeScript, lint and formatting. Isolated Next.js/MongoDB checks verified callback persistence, retry deduplication, throttling, access/origin protection, gallery filtering, public routes and the Reviews redirect. In-app browser checks verified four desktop gallery columns with natural heights, filtering/empty states, keyboard lightbox navigation, YouTube embed creation, 320px callback submission matching admin details, and public testimonial creation/deletion updates. Contact and testimonial layouts were visually inspected without horizontal overflow. The interrupted session's exact isolated QA database was cleaned up on resume; no studio data was deleted.

Phase 3 passed 27 tests, production build/TypeScript, lint and formatting. Real Next.js/MongoDB integration verified saved/confirmed snapshots, historical enquiries, access and logout. Browser and rendered-PDF checks verified the saved ₹78,000 confirmed quote, ₹45,000 historical estimate and a 24-line, three-page ₹59,232 quote, including repeated table headers and long notes. Normal output fits one A4 page. Visible reference fields and admin navigation are excluded from quote documents. All isolated QA databases and temporary PDF files were removed; the studio database was untouched.

Final rates, eligibility, crew units, deliverables, album specifications, travel/tax/delivery charges and availability remain unconfirmed. Travel/tax/delivery are not calculated. Photography/testimonial content includes development samples. YouTube embedding depends on the video owner's permissions; direct links provide a fallback. Real admin provisioning, hosting and deployment await future instructions.

## Delivery tracker — 2026-10-14

All three requested phases are complete. No deployment or real admin provisioning was performed. Real photos, dated testimonials and YouTube links can be managed through admin; confirmed rates and business specifications still await the owner.

| Phase                                    | Status   | Completion evidence                                                                                                                                                              |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Admin access and managed content      | Complete | 22 tests; build/TypeScript; lint; Next/Mongo CRUD/auth; Cloudinary upload/delete; browser and mobile checks. Synthetic assets removed.                                           |
| 2. Public home, gallery and testimonials | Complete | 25 tests; build/TypeScript, lint, format; callback/filter/redirect integration; desktop/mobile and admin-to-public checks. QA database removed.                                  |
| 3. Quote output and final verification   | Complete | 27 tests; build/TypeScript, lint, format; saved/confirmed and historical integration; browser and single/multipage PDF verification. QA databases and temporary exports removed. |

For token efficiency, inspect only files relevant to the next requested change and reuse existing components. Do not re-audit completed phases unless a dependency changes or a check fails.

Phase 1 handoff: shared contracts in `src/features/content/model.ts`, persistence/API actions in `src/server/content.ts`, Cloudinary integration in `src/server/cloudinary.ts`, and reusable admin screen in `src/features/admin/content-manager.tsx`.

Phase 2 handoff: shared public feeds/cards in `src/features/content/public-content.tsx`, pagination in `src/lib/use-paged-feed.ts`, gallery/lightbox in `src/features/gallery/components/gallery-lightbox.tsx`, callback form/schema in `src/features/contact`, persistence in `src/server/callbacks.ts`, and admin request switching in `src/features/admin/requests-dashboard.tsx`.

Phase 3 handoff: `src/features/booking/components/quote-print.tsx` shares saved-snapshot rendering and print controls between client and `src/features/admin/inbox.tsx`; `src/styles/quote-print.css` handles both layouts. Historical fields are optional and stored prices are never recalculated. Client confirmation and admin detail no longer display reference IDs. Internal IDs, ownership/revision checks and routes remain intact. Regression coverage is in `tests/quote-print.test.ts`. No new dependency or API/auth change was needed.

Portfolio update: public/admin Gallery labels are now Portfolio; `/portfolio` is the public route and `/gallery` permanently redirects to it. Existing content API/storage identifiers remain unchanged. Home and Portfolio share the image-only masonry tiles, natural aspect ratios, category filtering and accessible full-size viewer.

Home hero update: Admin → Home hero (`/admin/content/hero`) uploads/deletes up to five Cloudinary photos (JPEG/PNG/WebP, 4 MB each). A unique Mongo slot index enforces the limit across concurrent requests, including pending uploads; deletion frees the slot. Public `/api/content/hero` exposes ready photos only. Newest appears first; homepage backgrounds rotate every six seconds with manual selection, pause/play and reduced-motion support. One photo stays static. Empty/error/unavailable images fall back to the new local default (`stitch-7.jpg`). No real photos were uploaded for this update. Use landscape images; backgrounds crop responsively to fill the hero.

Hero verification: production build/TypeScript and 29 tests passed, including hero access protection and the five-slot limit. Formatting passed. Verified on 2026-10-15: real Cloudinary hero upload/public read/deletion, browser upload of two photos, image loading, automatic rotation, manual selection, pause/resume and fallback after cleanup. The reported admin crash was an older open client bundle (missing hero title); a full reload restored the current working form. All disposable uploads and the isolated QA database were removed. Repeat hero integration with `npx tsx --env-file=.env.local scripts/verify-unified.ts --cloudinary --hero` after building.

Image uploads: Home hero and Portfolio no longer ask for descriptions. The server generates a basic image label from the category (or Studio hero photo); existing saved descriptions remain compatible. Other website text is unchanged.
