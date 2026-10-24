import { randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import { z } from 'zod';
import { selectedWork } from '../data/home';
import {
  type ContentKind,
  type ContentRecord,
  imageInput,
  testimonialInput,
  videoInput,
  youtubeId,
  MAX_IMAGE_BYTES,
  categories,
} from '../features/content/model';
import { ApiFailure } from './enquiries';
import {
  cloudinaryConfig,
  destroyImage,
  managedPublicId,
  uploadImage,
  validateImage,
  imageUploadGrant,
  verifiedUploadedImage,
} from './cloudinary';
import { readJson, json } from './http';

const sampleDate = '2026-10-14T00:00:00.000Z';
export function sampleContent(): ContentRecord[] {
  const photos = [
    ...selectedWork,
    { image: 0, alt: 'Bride and groom in a sunlit landscape' },
    { image: 7, alt: 'Couple looking over a misty valley' },
  ];
  return [
    ...photos.map((photo) => ({
      _id: `sample-photo-${photo.image}`,
      kind: 'gallery' as const,
      state: 'ready' as const,
      createdAt: sampleDate,
      sample: true,
      url: `/images/home/stitch-${photo.image}.jpg`,
      width: 512,
      height:
        photo.image === 1 || photo.image === 3
          ? 279
          : photo.image === 5
            ? 318
            : 286,
      alt: photo.alt,
      category:
        (
          {
            1: 'Wedding',
            2: 'Pre-Wedding',
            3: 'Engagement',
            4: 'Half Sari',
          } as Record<number, ContentRecord['category']>
        )[photo.image] ?? 'Others',
    })),
    ...[
      'Every time we look at our photos, we get to live it all again.',
      'It felt like a day out together. The pictures feel just like us.',
      'The little moments with our family are the ones we treasure most.',
    ].map((text, i) => ({
      _id: `sample-review-${i}`,
      kind: 'testimonials' as const,
      state: 'ready' as const,
      createdAt: sampleDate,
      sample: true,
      name: 'Development sample',
      text,
    })),
    {
      _id: 'sample-video',
      kind: 'videos',
      state: 'ready',
      createdAt: sampleDate,
      sample: true,
      title: 'Sample pre-wedding film',
      videoId: 'csGs7DeGIpE',
    },
  ];
}
export class ContentService {
  constructor(private readonly records: Collection<ContentRecord>) {}
  private async reserve(record: ContentRecord) {
    if (record.kind !== 'hero') {
      await this.records.insertOne(record);
      return;
    }
    for (let slot = 1; slot <= 5; slot++) {
      try {
        await this.records.insertOne({ ...record, heroSlot: slot });
        return;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
    throw new ApiFailure(
      409,
      'You can have up to five hero images. Delete one before uploading another.',
    );
  }
  async beginImageUpload(kind: 'gallery' | 'hero', request: Request) {
    cloudinaryConfig();
    const input = await readJson(request);
    const parsed = imageInput.safeParse(input);
    if (!parsed.success)
      throw new ApiFailure(
        400,
        'Choose a valid image category and description.',
      );
    const id = randomUUID();
    const publicId = managedPublicId(id);
    const grant = imageUploadGrant(publicId);
    await this.reserve({
      _id: id,
      kind,
      ...parsed.data,
      state: 'pending',
      publicId,
      createdAt: new Date().toISOString(),
      // The signed grant can still finish an upload for an hour. Do not delete
      // its ownership record early and risk a late upload becoming unmanaged.
      uploadExpiresAt: new Date(Date.now() + 65 * 60000).toISOString(),
    });
    return { id, ...grant };
  }
  async completeImageUpload(kind: 'gallery' | 'hero', id: string) {
    if (!z.uuid().safeParse(id).success)
      throw new ApiFailure(400, 'Invalid upload reference.');
    const record = await this.records.findOne({ _id: id, kind });
    if (!record || record.state === 'deleted' || !record.publicId)
      throw new ApiFailure(404, 'Upload not found.');
    if (record.state === 'ready') return record;
    // Never trust browser-provided URLs, dimensions, formats, or byte counts.
    const image = await verifiedUploadedImage(record.publicId);
    const updated = await this.records.updateOne(
      { _id: id, kind, state: 'pending' },
      { $set: { ...image, state: 'ready' }, $unset: { uploadExpiresAt: '' } },
    );
    if (!updated.modifiedCount) {
      const current = await this.records.findOne({ _id: id, kind });
      if (current?.state === 'ready') return current;
      throw new ApiFailure(409, 'This upload is no longer available.');
    }
    const { uploadExpiresAt: _expiry, ...completed } = record;
    void _expiry;
    return { ...completed, ...image, state: 'ready' as const };
  }
  async initialize() {
    // Match public collection ordering, including stable pagination ties.
    await this.records.createIndex({
      kind: 1,
      state: 1,
      createdAt: -1,
      _id: 1,
    });
    await this.records.createIndex({
      kind: 1,
      state: 1,
      category: 1,
      createdAt: -1,
      _id: 1,
    });
    await this.records.createIndex(
      { heroSlot: 1 },
      {
        unique: true,
        partialFilterExpression: { heroSlot: { $exists: true } },
      },
    );
    // Tombstones prevent deleted samples from being recreated on subsequent starts.
    await this.records.bulkWrite(
      sampleContent().map((record) => ({
        updateOne: {
          filter: { _id: record._id },
          update: { $setOnInsert: record },
          upsert: true,
        },
      })),
    );
  }
  async list(
    kind: ContentKind,
    admin: boolean,
    offset = 0,
    limit = 30,
    category?: ContentRecord['category'],
  ) {
    return this.records
      .find({
        kind,
        state: admin ? { $ne: 'deleted' } : 'ready',
        ...(category ? { category } : {}),
      })
      .sort({ createdAt: -1, _id: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }
  async create(kind: ContentKind, request: Request) {
    const base = {
      _id: randomUUID(),
      kind,
      createdAt: new Date().toISOString(),
    };
    if (kind !== 'gallery' && kind !== 'hero') {
      const parsed = (
        kind === 'testimonials' ? testimonialInput : videoInput
      ).safeParse(await readJson(request));
      if (!parsed.success)
        throw new ApiFailure(
          400,
          parsed.error.issues[0]?.message ?? 'Invalid content.',
        );
      const fields =
        kind === 'videos'
          ? {
              title: (parsed.data as z.infer<typeof videoInput>).title,
              videoId: youtubeId(
                (parsed.data as z.infer<typeof videoInput>).url,
              )!,
            }
          : parsed.data;
      const record: ContentRecord = { ...base, ...fields, state: 'ready' };
      await this.records.insertOne(record);
      return record;
    }
    cloudinaryConfig();
    const form = await readImageForm(request);
    const parsed = imageInput.safeParse({
      category: kind === 'hero' ? 'Others' : form.get('category'),
      alt:
        form.get('alt') ||
        (kind === 'hero'
          ? 'Studio hero photo'
          : `${form.get('category') ?? 'Portfolio'} photography`),
    });
    const file = form.get('file');
    if (!parsed.success || !(file instanceof File))
      throw new ApiFailure(400, 'Choose an image and a valid category.');
    await validateImage(file);
    const publicId = managedPublicId(base._id);
    const record: ContentRecord = {
      ...base,
      ...parsed.data,
      state: 'pending',
      publicId,
    };
    // Persist ownership before upload. Interrupted/failed uploads remain removable in admin.
    if (kind === 'hero') {
      let reserved = false;
      for (let slot = 1; slot <= 5; slot++) {
        try {
          await this.records.insertOne({ ...record, heroSlot: slot });
          reserved = true;
          break;
        } catch (error) {
          if ((error as { code?: number }).code !== 11000) throw error;
        }
      }
      if (!reserved)
        throw new ApiFailure(
          409,
          'You can have up to five hero images. Delete one before uploading another.',
        );
    } else {
      await this.records.insertOne(record);
    }
    try {
      const image = await uploadImage(file, publicId);
      const updated = await this.records.updateOne(
        { _id: record._id, state: 'pending' },
        { $set: { ...image, state: 'ready' } },
      );
      if (!updated.modifiedCount) {
        await destroyImage(publicId);
        throw new ApiFailure(409, 'Upload was removed. Please retry.');
      }
      return { ...record, ...image, state: 'ready' as const };
    } catch {
      throw new ApiFailure(
        502,
        'Upload did not finish. Refresh the list and remove its pending entry before retrying.',
      );
    }
  }
  async remove(kind: ContentKind, id: string) {
    const record = await this.records.findOne({ _id: id, kind });
    if (!record || record.state === 'deleted') return;
    if (
      record.state === 'pending' &&
      record.uploadExpiresAt &&
      Date.parse(record.uploadExpiresAt) > Date.now()
    )
      throw new ApiFailure(
        409,
        'This upload is reserved while it may still be running. Retry with the same selected photo to finish it, or remove this pending entry after ' +
          new Date(record.uploadExpiresAt).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
          }) +
          ' IST.',
      );
    if (
      record.state === 'pending' &&
      Date.now() - Date.parse(record.createdAt) < 120000
    )
      throw new ApiFailure(
        409,
        'This upload may still be running. Wait two minutes, then retry removal.',
      );
    // Keep the record if Cloudinary fails, so deletion can be retried safely.
    if (record.publicId) await destroyImage(record.publicId);
    await this.records.updateOne(
      { _id: id, kind },
      { $set: { state: 'deleted' }, $unset: { heroSlot: '' } },
    );
  }
  async changePhotoCategory(id: string, request: Request) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
      throw new ApiFailure(400, 'Invalid photo reference.');
    const input = z
      .object({
        category: z.enum(categories),
        previousCategory: z.enum(categories),
      })
      .strict()
      .safeParse(await readJson(request));
    if (!input.success)
      throw new ApiFailure(400, 'Choose a valid photo category.');
    const photo = await this.records.findOne({
      _id: id,
      kind: 'gallery',
      state: 'ready',
    });
    if (!photo) throw new ApiFailure(404, 'Photo not found.');
    if (photo.category !== input.data.previousCategory)
      throw new ApiFailure(
        409,
        'This photo was changed elsewhere. Refresh the list before editing its category.',
      );
    const updated = await this.records.updateOne(
      {
        _id: id,
        kind: 'gallery',
        state: 'ready',
        category: input.data.previousCategory,
      },
      {
        $set: {
          category: input.data.category,
          ...(photo.alt === `${photo.category} photography`
            ? { alt: `${input.data.category} photography` }
            : {}),
        },
      },
    );
    if (!updated.matchedCount)
      throw new ApiFailure(
        409,
        'This photo changed or was removed. Refresh the list and try again.',
      );
    return { success: true };
  }
  async handle(
    request: Request,
    kind: ContentKind,
    id: string | undefined,
    admin: boolean,
  ) {
    if (request.method === 'GET' && !id) {
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .safeParse(new URL(request.url).searchParams.get('offset') ?? 0);
      if (!offset.success) throw new ApiFailure(400, 'Invalid pagination.');
      const search = new URL(request.url).searchParams;
      const limit = z.coerce
        .number()
        .int()
        .min(1)
        .max(30)
        .safeParse(search.get('limit') ?? 30);
      const category = z
        .enum(categories)
        .optional()
        .safeParse(search.get('category') ?? undefined);
      if (
        !limit.success ||
        !category.success ||
        (category.data && kind !== 'gallery')
      )
        throw new ApiFailure(400, 'Invalid content filter.');
      const items = await this.list(
        kind,
        admin,
        offset.data,
        limit.data,
        category.data,
      );
      const total =
        !admin &&
        search.get('pagination') === '1' &&
        (kind === 'gallery' || kind === 'videos')
          ? await this.records.countDocuments({
              kind,
              state: 'ready',
              ...(category.data ? { category: category.data } : {}),
            })
          : undefined;
      const categoryCounts =
        admin && kind === 'gallery'
          ? await this.records
              .aggregate<{
                _id: { category: string; state: string };
                count: number;
              }>([
                { $match: { kind: 'gallery' } },
                {
                  $group: {
                    _id: { category: '$category', state: '$state' },
                    count: { $sum: 1 },
                  },
                },
              ])
              .toArray()
          : undefined;
      return json({
        ...(total !== undefined
          ? { total, hasMore: offset.data + items.length < total }
          : {}),
        ...(categoryCounts
          ? {
              categoryCounts: categories.map((category) => ({
                category,
                current: categoryCounts
                  .filter(
                    (row) =>
                      row._id.category === category &&
                      row._id.state === 'ready',
                  )
                  .reduce((sum, row) => sum + row.count, 0),
                pending: categoryCounts
                  .filter(
                    (row) =>
                      row._id.category === category &&
                      row._id.state === 'pending',
                  )
                  .reduce((sum, row) => sum + row.count, 0),
                removed: categoryCounts
                  .filter(
                    (row) =>
                      row._id.category === category &&
                      row._id.state === 'deleted',
                  )
                  .reduce((sum, row) => sum + row.count, 0),
              })),
            }
          : {}),
        items: items.map(({ publicId, ...item }) =>
          admin ? { ...item, publicId } : item,
        ),
      });
    }
    if (admin && request.method === 'PATCH' && kind === 'gallery' && id)
      return json(await this.changePhotoCategory(id, request));
    if (
      admin &&
      request.method === 'POST' &&
      (kind === 'gallery' || kind === 'hero') &&
      id
    )
      return json(
        id === 'upload'
          ? await this.beginImageUpload(kind, request)
          : await this.completeImageUpload(kind, id),
        id === 'upload' ? 201 : 200,
      );
    if (admin && request.method === 'POST' && !id)
      return json(await this.create(kind, request), 201);
    if (admin && request.method === 'DELETE' && id) {
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
        throw new ApiFailure(400, 'Invalid content reference.');
      await this.remove(kind, id);
      return json({ success: true });
    }
    throw new ApiFailure(405, 'Method not allowed.');
  }
}
async function readImageForm(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    throw new ApiFailure(415, 'Image form required.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiFailure(400, 'Image required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_IMAGE_BYTES + 16384) {
      await reader.cancel();
      throw new ApiFailure(413, 'Choose an image up to 4 MB.');
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type')! },
    }).formData();
  } catch {
    throw new ApiFailure(400, 'Invalid image form.');
  }
}
