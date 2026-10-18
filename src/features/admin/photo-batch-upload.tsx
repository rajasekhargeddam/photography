'use client';
import { useEffect, useRef, useState } from 'react';
import { categories } from '../content/model';
import {
  uploadOriginal,
  type OriginalUpload,
  type UploadGrant,
} from '../content/image-upload';
import { runUploadQueue } from '../content/upload-queue';

type Entry = {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'verifying' | 'saved' | 'failed' | 'paused';
  progress: number;
  message?: string;
  session?: OriginalUpload;
};
type Props = {
  kind: 'gallery' | 'hero';
  available: number;
  disabled: boolean;
  request: (url: string, options?: RequestInit) => Promise<UploadGrant>;
  onBusy: (busy: boolean) => void;
  onComplete: () => Promise<void>;
  onError: (error: unknown) => void;
};
export function PhotoBatchUpload({
  kind,
  available,
  disabled,
  request,
  onBusy,
  onComplete,
  onError,
}: Props) {
  const queue = useRef<Entry[]>([]);
  const abort = useRef<AbortController | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState<string>(categories[0]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => () => abort.current?.abort(), []);
  function refresh() {
    setEntries(queue.current.map((entry) => ({ ...entry })));
  }
  async function start(onlyId?: string) {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    onBusy(true);
    setMessage('');
    const endpoint = '/api/admin/content/' + kind;
    try {
      await runUploadQueue(
        queue.current,
        (entry) => entry.status !== 'saved' && (!onlyId || entry.id === onlyId),
        async (entry) => {
          try {
            if (
              !entry.file.size ||
              !['image/jpeg', 'image/png', 'image/webp'].includes(
                entry.file.type,
              )
            )
              throw new Error('Choose a non-empty JPEG, PNG or WebP photo.');
            entry.status = 'uploading';
            entry.message = undefined;
            refresh();
            if (!entry.session) {
              const photoCategory = kind === 'hero' ? 'Others' : category;
              const grant = await request(endpoint + '/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  category: photoCategory,
                  alt:
                    kind === 'hero'
                      ? 'Studio hero photo'
                      : photoCategory + ' photography',
                }),
              });
              entry.session = {
                grant,
                file: entry.file,
                category: photoCategory,
                nextByte: 0,
                uploadId: crypto.randomUUID(),
                uploaded: false,
              };
            }
            const session = entry.session;
            if (!session.uploaded) {
              try {
                await uploadOriginal(session, controller.signal, (progress) => {
                  entry.progress = progress;
                  refresh();
                });
              } catch (uploadError) {
                if (controller.signal.aborted) throw uploadError;
                // A lost final response must not cause a second copy of the original.
                try {
                  await request(endpoint + '/' + session.grant.id, {
                    method: 'POST',
                  });
                  session.uploaded = true;
                } catch (verificationError) {
                  if (
                    (verificationError as { status?: number })?.status === 401
                  )
                    throw verificationError;
                  throw uploadError;
                }
              }
            }
            entry.status = 'verifying';
            refresh();
            await request(endpoint + '/' + session.grant.id, {
              method: 'POST',
            });
            entry.status = 'saved';
            entry.progress = 100;
            // Release the original file when the batch is replaced, retaining this saved status meanwhile.
          } catch (error) {
            entry.status = controller.signal.aborted ? 'paused' : 'failed';
            entry.message =
              error instanceof Error
                ? error.message
                : 'Upload failed. Please retry.';
            if ((error as { status?: number })?.status === 401) {
              controller.abort();
              onError(error);
            }
          }
          refresh();
        },
        controller.signal,
        2,
      );
    } finally {
      for (const entry of queue.current)
        if (entry.status === 'queued' && controller.signal.aborted)
          entry.status = 'paused';
      refresh();
      const saved = queue.current.filter(
        (entry) => entry.status === 'saved',
      ).length;
      setMessage(
        `${saved} of ${queue.current.length} photos saved.${saved < queue.current.length ? ' Retry unfinished photos below; saved photos will be skipped.' : ''}`,
      );
      await onComplete();
      abort.current = null;
      setRunning(false);
      onBusy(false);
    }
  }
  const unfinished = entries.some((entry) => entry.status !== 'saved');
  return (
    <section className="content-form" aria-label="Upload photos">
      <h2>Add photos</h2>
      <fieldset disabled={disabled || running}>
        <label>
          Photos{' '}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (!files.length) return;
              if (queue.current.some((entry) => entry.status !== 'saved')) {
                setMessage(
                  'Finish or retry the current batch before selecting another batch.',
                );
                return;
              }
              if (kind === 'hero' && files.length > available) {
                setMessage(
                  `Choose up to ${available} more photos. The home hero allows five photos, including pending uploads.`,
                );
                return;
              }
              queue.current = files.map((file) => ({
                id: crypto.randomUUID(),
                file,
                status: 'queued',
                progress: 0,
              }));
              setMessage('');
              refresh();
            }}
          />
        </label>
        <small>
          Choose multiple JPEG, PNG or WebP photos. Originals are preserved. Two
          photos upload at a time; image-service account limits apply.
        </small>
        {kind === 'gallery' && (
          <label>
            Category for this batch{' '}
            <select
              value={category}
              disabled={
                unfinished && entries.some((entry) => Boolean(entry.session))
              }
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={!unfinished}
          onClick={() => void start()}
        >
          {entries.some(
            (entry) => entry.status === 'failed' || entry.status === 'paused',
          )
            ? 'Retry unfinished photos'
            : 'Upload photos'}
        </button>
      </fieldset>
      {running && (
        <button type="button" onClick={() => abort.current?.abort()}>
          Pause uploads
        </button>
      )}
      <p role="status">{message}</p>
      {!running && entries.length > 0 && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const pending = queue.current.some(
                (entry) => entry.session && entry.status !== 'saved',
              );
              queue.current = [];
              refresh();
              setMessage(
                pending
                  ? 'Selection cleared. Saved photos are kept. Any pending upload entries remain below and can be removed after their displayed expiry time.'
                  : 'Selection cleared. Saved photos are kept.',
              );
            }}
          >
            Clear batch selection
          </button>
          {unfinished && (
            <small>
              Keep this page open to retry. Clearing the selection ends retries
              for this batch; saved photos are kept.
            </small>
          )}
        </>
      )}
      {entries.length > 0 && (
        <ul className="photo-upload-queue" aria-label="Photo upload queue">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="photo-upload-heading">
                <strong>{entry.file.name}</strong>
                <span>
                  {entry.status === 'saved'
                    ? 'Saved'
                    : entry.status === 'verifying'
                      ? 'Verifying…'
                      : entry.status === 'uploading'
                        ? `Uploading · ${entry.progress}%`
                        : entry.status === 'failed'
                          ? 'Failed'
                          : entry.status === 'paused'
                            ? 'Paused'
                            : 'Queued'}
                </span>
              </div>
              <progress
                aria-label={`Upload progress for ${entry.file.name}`}
                value={entry.progress}
                max={100}
              />
              {entry.message && <p>{entry.message}</p>}
              {!running && !entry.session && entry.status !== 'saved' && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    queue.current = queue.current.filter(
                      (item) => item.id !== entry.id,
                    );
                    refresh();
                  }}
                >
                  Remove {entry.file.name} from batch
                </button>
              )}
              {!running &&
                (entry.status === 'failed' || entry.status === 'paused') && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void start(entry.id)}
                  >
                    Retry {entry.file.name}
                  </button>
                )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
