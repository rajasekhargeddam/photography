# Large-photo uploads

Portfolio and hero share the same preparation/upload workflow in management mode. Photos above 9 MiB are prepared in the browser before requesting an upload reservation; smaller JPEG/PNG/WebP files are sent unchanged.

The local original is never overwritten. A separate website copy is encoded as JPEG for JPEG sources, or transparency-capable WebP for PNG/WebP sources (PNG fallback if the browser lacks WebP encoding). Orientation is applied during decoding and the canvas uses sRGB. EXIF and other original metadata are not retained in prepared copies. These are website assets, not archival or print masters; animated inputs are rendered as still images.

The uploader tries high-quality encoding before reducing dimensions further. Prepared canvases are bounded to a 6000-pixel longest edge and 24 megapixels to reduce memory pressure. The target is at most 9 MiB, leaving margin below the current provider's 10 MiB rejection threshold. Only one preparation runs at a time, with up to two network uploads. Extremely large/corrupt images may exceed browser decoding resources and receive an actionable error rather than an unlimited-size promise.

The queue shows Preparing, Uploading and Saving stages, plus original/output sizes, output dimensions and a clickable preview for prepared copies. Keep the page open for retries. Prepared files are reused on retry, and preview URLs are released when removing/clearing/replacing entries or leaving the page. Saved items are not re-uploaded. Permanent provider rejections are not automatically retried; transient failures retain bounded retry behavior.

## Verification

86 automated tests passed; TypeScript and lint passed. Synthetic images were checked in isolated headless Edge without uploads: a 30,771,489-byte transparent PNG became an 8,826,556-byte copy with transparency preserved; a 35,007,019-byte JPEG with EXIF portrait rotation became a 9,303,328-byte copy with the correct orientation. The user's actual original photo was not supplied, so it was not tested directly. No Cloudinary assets, customer records or Telegram messages were created.
