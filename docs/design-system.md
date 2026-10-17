# Website theme

The public website, booking flow, and studio admin share the tokens in
`src/styles/tokens.css`. Light and dark themes use the same semantic names.

- Warm ivory backgrounds, charcoal text, and bronze accents preserve the studio's
  existing photographic identity. Use `--background`, `--surface`, and
  `--surface-raised` for canvas, inset sections, and raised panels.
- Playfair Display is the heading font (regular). Plus Jakarta Sans is the body
  and control font (regular and semibold). Both are bundled locally.
- Use `--type-page`, `--type-section`, and `--type-card` for heading hierarchy.
  The photographic homepage hero can use its larger display size.
- Containers use `--content-width` and `--gutter`; sections use `--section-space`.
  Booking panels use `--flow-width` and standalone state panels use `--form-width`.
- Controls and cards have square corners. Filter chips and avatars retain their
  functional pill/circle shapes. Use the radius tokens instead of pixel values.
- Primary actions use `--primary` / `--on-primary`, and hover actions use
  `--accent` / `--on-accent`. Success, warning, and error states have semantic
  foreground and soft background tokens.
- Use the shared `Button`, `ButtonLink`, and `PageState` components for new
  actions and standalone status screens. Existing booking and admin controls
  use the same tokens while retaining their domain-specific behaviour.
- All form fields inherit the body font; touch controls are at least 44px tall.
  Keep visible keyboard focus, invalid-field borders, and reduced-motion support.

Image overlays use the fixed `--image-*` palette to stay legible in both themes.
Printed quotes deliberately retain a light paper palette independent of the
screen theme.

When extending a page, prefer semantic theme tokens over new colour literals.
Check mobile (390px), tablet (768px), and desktop (1440px), including dark mode.
