'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { categories } from '../content/model';
import {
  uploadOriginal,
  UploadRejected,
  type OriginalUpload,
  type UploadGrant,
} from '../content/image-upload';
import { runUploadQueue } from '../content/upload-queue';
import { prepareImage, type PreparedImage } from '../content/prepare-image';

type Entry = {
  id: string;
  file: File;
  status:
    | 'queued'
    | 'preparing'
    | 'uploading'
    | 'verifying'
    | 'saved'
    | 'failed'
    | 'paused';
  progress: number;
  message?: string;
  session?: OriginalUpload;
  prepared?: PreparedImage;
  previewUrl?: string;
};

function PreparedPreview({
  prepared,
  original,
  url,
}: {
  prepared: PreparedImage;
  original: File;
  url?: string;
}) {
  const size = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + ' MiB';
  return (
    <div>
      <p>
        {prepared.optimized
          ? `Website copy: ${size(original.size)} → ${size(prepared.file.size)} · ${prepared.width} × ${prepared.height} px. Your original stays unchanged on your device.`
          : `Uploading original · ${size(original.size)} (no preparation needed).`}
      </p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Preview website copy of ${original.name}`}
        >
          <Image
            src={url}
            alt={`Website copy of ${original.name}`}
            width={160}
            height={120}
            unoptimized
            style={{ objectFit: 'contain' }}
          />
          <span>Preview website copy</span>
        </a>
      )}
    </div>
  );
}
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
  const previewUrls = useRef(new Set<string>());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState<string>(categories[0]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      abort.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);
  function releasePreview(entry: Entry) {
    if (entry.previewUrl) {
      URL.revokeObjectURL(entry.previewUrl);
      previewUrls.current.delete(entry.previewUrl);
    }
  }
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
    let preparing: Promise<unknown> = Promise.resolve();
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
            entry.status = 'preparing';
            entry.message = undefined;
            refresh();
            if (!entry.prepared) {
              const work = preparing.then(() =>
                prepareImage(entry.file, controller.signal),
              );
              preparing = work.catch(() => undefined);
              entry.prepared = await work;
              if (entry.prepared.optimized && !controller.signal.aborted) {
                entry.previewUrl = URL.createObjectURL(entry.prepared.file);
                previewUrls.current.add(entry.previewUrl);
              }
            }
            if (controller.signal.aborted)
              throw new Error('Upload paused. Retry to continue.');
            entry.status = 'uploading';
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
                file: entry.prepared.file,
                category: photoCategory,
                nextByte: 0,
                uploadId: crypto.randomUUID(),
                uploaded: false,
              };
            }
            const session = entry.session;
            // A failed selection can survive a development hot reload from the old uploader.
            // Reuse its reservation, but never resend the oversized original in that session.
            if (!session.uploaded && session.file !== entry.prepared.file) {
              session.file = entry.prepared.file;
              session.nextByte = 0;
              session.uploadId = crypto.randomUUID();
              entry.progress = 0;
            }
            if (!session.uploaded) {
              try {
                await uploadOriginal(session, controller.signal, (progress) => {
                  entry.progress = progress;
                  refresh();
                });
              } catch (uploadError) {
                if (
                  controller.signal.aborted ||
                  uploadError instanceof UploadRejected
                )
                  throw uploadError;
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
      try {
        await onComplete();
      } catch (error) {
        onError(error);
      } finally {
        abort.current = null;
        setRunning(false);
        onBusy(false);
      }
    }
  }
  const unfinished = entries.some((entry) => entry.status !== 'saved');
  return (
    <section className="content-form" aria-label="Upload photos">
      <h2>Add photos</h2>
      {!!entries.length && (
        <div className="upload-summary" role="status">
          <strong>
            {entries.filter((entry) => entry.status === 'saved').length} /{' '}
            {entries.length} saved
          </strong>
          <span>
            {entries.filter((entry) => entry.status === 'failed').length} need
            retry
          </span>
          <progress
            aria-label="Overall batch upload progress"
            max={entries.length * 100}
            value={entries.reduce((sum, entry) => sum + entry.progress, 0)}
          />
        </div>
      )}
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
              queue.current.forEach(releasePreview);
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
          Choose JPEG, PNG or WebP photos. Large photos become high-quality
          website copies below 9 MiB before upload; your local originals stay
          untouched. Website copies may have reduced dimensions and do not
          retain original metadata. Two photos upload at a time.
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
              queue.current.forEach(releasePreview);
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
                    : entry.status === 'preparing'
                      ? 'Preparing website copy…'
                      : entry.status === 'verifying'
                        ? 'Saving…'
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
              {entry.prepared && (
                <PreparedPreview
                  prepared={entry.prepared}
                  original={entry.file}
                  url={entry.previewUrl}
                />
              )}
              {!running && !entry.session && entry.status !== 'saved' && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    releasePreview(entry);
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
