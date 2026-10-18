# Portfolio browsing

In Admin → Portfolio, each ready photo has a Change category control. Choose a category and Save category, or Cancel. Saving refreshes the current filtered list and category counts; a moved photo leaves its old filtered view. Original files, URLs, dimensions and custom descriptions are retained. Automatically generated category descriptions follow the new category. The authenticated, same-origin PATCH endpoint accepts category fields only and rejects stale edits or removed/pending photos.

Pictures is the default collection. The sticky Pictures / Films tabs support arrow keys, Home and End. Existing `/portfolio#videos` links open Films directly; Pictures uses `#pictures`.

Pictures requests 12 records per page and Films requests 6. Only the active collection starts requests; a collection remains mounted once visited to retain its loaded pages. Switching collections remembers its scroll position. Hidden films release their embedded player to stop playback. Pictures retains category and layout selection.

Public gallery and video requests with `pagination=1` receive `total` and `hasMore`, counting ready records in the requested category only. Homepage previews retain their smaller limits. Load more appends items, deduplicates by ID, and retries the failed offset without clearing previous pages. Inactive collections do not refresh on window focus. Returning to the portfolio route fetches fresh data.

When more pictures exist, the lower edge of the loaded gallery has a masked blur and a fade into the current theme background, leading to a prominent Load more pictures button. The overlay cannot intercept clicks, disappears on keyboard focus within the gallery, and is removed when the final page loads. It does not affect original files or fullscreen photos. Unsupported backdrop blur falls back to the gradient. Existing cinematic reveals apply to appended cards and respect reduced motion.
