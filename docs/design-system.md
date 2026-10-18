# Cinematic public design system

The public-facing application uses `src/styles/cinematic.css`, scoped to
`.cinematic-site`. Studio admin retains the original theme in `tokens.css`.

## Visual direction

The default experience is a deep forest/charcoal gallery with champagne accents,
large Playfair Display headings, and restrained Plus Jakarta Sans body text.
The existing theme switch also offers an ivory daylight treatment and remembers
an existing preference. Fonts are bundled locally; no new dependencies were added.

Daylight uses warm ivory (`#f7f4ee`), charcoal (`#242622`), bronze (`#80603d`),
and off-white raised surfaces. Night uses deep forest (`#0d1512`), ivory text
(`#f3f0e6`), and champagne actions (`#e2cea7`). Supporting text has at least
5.35:1 contrast on the daylight background and 9.54:1 on the night background.
Large editorial headings retain the serif; card titles, controls, form labels,
and numeric information use the body family. Primary actions are filled,
secondary actions outlined, and tertiary actions text-only. Contact forms stack
below 900px to keep tablet fields comfortably wide. These refinements are scoped
to the public site; the compact admin workspace and quote print palette remain separate.

The opening photograph fills the viewport. Navigation floats on a translucent
surface with an opaque fallback. Gallery images form a staggered editorial wall;
the lightbox retains uncropped photographs, keyboard navigation, and native dialog
focus handling. Existing content, sample labels, links, and integrations remain.

## Shared rules

- Public colour, spacing, type, radius, and glass tokens live in `cinematic.css`.
  Base semantic success, warning, and error tokens come from `tokens.css`.
- Primary actions use champagne in night mode and forest in daylight mode.
  Outlined actions and category chips use the same shape and focus treatment.
- Photography has minimal rounding; consultation panels have softer corners.
  Controls retain a minimum 44px touch target and form inputs a 16px font size.
- Public sections use the shared container and responsive section spacing.
- Quote options, question order, conditional steps, saved data, pricing, and API
  behavior are unchanged. Only the question section is keyed for step reveals.

## Motion and fallbacks

`CinematicEffects` progressively adds one-time intersection reveals and a subtle
pointer tilt on photographic and selection cards. Work is limited to visible
content and animation frames; effects are cleaned up on navigation. Static content
is visible when scripting, intersection observation, or animation APIs are absent.

Route entrances animate a persistent wrapper without keying or remounting the
booking provider. Supporting browsers add a small scroll-linked hero drift.
Touch devices do not receive pointer tilt. Reduced-motion preferences disable
all public animation, transitions, tilt, and slideshow autoplay. Glass surfaces
have readable backgrounds without backdrop-filter support.

Printed quote layouts retain their existing paper palette and business data.

## Validation

Check public pages at 390px, 768px, and 1440px, in both themes. Verify gallery
filters, lightbox next/previous/Escape, mobile menu, form labels and focus, quote
validation and running totals, and reduced-motion behavior. Run lint, typecheck,
the application tests, and the production build after functional changes.

Creative references: [Per Appelgren](https://perappelgren.de/) and
[Guillaume Tomasi](https://guillaumetomasi.com/), interpreted as an original
photography-led editorial direction rather than copied layouts.

The final editorial pass adds a studio manifesto and service index, an accessible Editorial/Grid gallery switch, category captions, a descriptive lightbox caption, a layered quote introduction, and a typographic closing invitation. Gallery layout changes preserve filtering, feed state, and lightbox behavior.
