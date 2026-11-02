export type UploadGrant = {
  id: string;
  url: string;
  fields: Record<string, string>;
};
export type OriginalUpload = {
  grant: UploadGrant;
  file: File;
  category: string;
  nextByte: number;
  uploadId: string;
  uploaded: boolean;
};
const CHUNK_BYTES = 20 * 1024 * 1024;
export class UploadRejected extends Error {}
function sendChunk(
  session: OriginalUpload,
  signal: AbortSignal,
  progress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(
        new Error(
          'Upload paused. Click Retry upload to continue with the same photo.',
        ),
      );
      return;
    }
    const { file, grant, nextByte } = session;
    const end = Math.min(nextByte + CHUNK_BYTES, file.size);
    const chunked = file.size > CHUNK_BYTES;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', grant.url);
    xhr.timeout = 300000;
    if (chunked) {
      xhr.setRequestHeader('X-Unique-Upload-Id', session.uploadId);
      xhr.setRequestHeader(
        'Content-Range',
        `bytes ${nextByte}-${end - 1}/${file.size}`,
      );
    }
    const body = new FormData();
    Object.entries(grant.fields).forEach(([key, value]) =>
      body.set(key, value),
    );
    body.set(
      'file',
      chunked ? file.slice(nextByte, end, file.type) : file,
      file.name,
    );
    const abort = () => xhr.abort();
    const finish = (error?: Error) => {
      signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve();
    };
    signal.addEventListener('abort', abort, { once: true });
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(
          Math.min(
            99,
            Math.floor(
              ((nextByte + ((end - nextByte) * event.loaded) / event.total) /
                file.size) *
                100,
            ),
          ),
        );
    };
    xhr.onerror = () =>
      finish(
        new Error(
          'Connection interrupted. Your selected photo is still here; try uploading again.',
        ),
      );
    xhr.ontimeout = () =>
      finish(
        new Error(
          'The upload timed out. Check your connection and retry this photo.',
        ),
      );
    xhr.onabort = () =>
      finish(
        new Error(
          'Upload paused. Click Retry upload to continue with the same photo.',
        ),
      );
    xhr.onload = () => {
      let result: { error?: { message?: string }; done?: boolean };
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        finish(
          new Error(
            'The image service returned an unreadable response. Please try again.',
          ),
        );
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const permanent =
          xhr.status >= 400 &&
          xhr.status < 500 &&
          ![408, 429].includes(xhr.status);
        const Failure = permanent ? UploadRejected : Error;
        finish(
          new Failure(
            /file size too large/i.test(result.error?.message ?? '')
              ? 'The image service rejected this photo’s size. Select a smaller website copy or check the account’s upload limit.'
              : result.error?.message
                ? `Image upload failed: ${result.error.message}`
                : 'The image service could not accept this photo. Please try again.',
          ),
        );
        return;
      }
      if (end === file.size && result.done === false) {
        finish(
          new Error('The image upload is still incomplete. Please retry.'),
        );
        return;
      }
      session.nextByte = end;
      finish();
    };
    xhr.send(body);
  });
}
/** Sends the selected original or prepared copy directly to the signed image endpoint. */
export async function uploadOriginal(
  session: OriginalUpload,
  signal: AbortSignal,
  progress: (percent: number) => void,
) {
  if (
    !/^https:\/\/api\.cloudinary\.com\/v1_1\/[a-z0-9_-]+\/image\/upload$/i.test(
      session.grant.url,
    )
  )
    throw new Error('Invalid image upload destination.');
  while (session.nextByte < session.file.size) {
    for (let attempt = 0; ; attempt++) {
      try {
        await sendChunk(session, signal, progress);
        break;
      } catch (error) {
        if (signal.aborted || error instanceof UploadRejected || attempt >= 2)
          throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1)),
        );
      }
    }
  }
  session.uploaded = true;
}
