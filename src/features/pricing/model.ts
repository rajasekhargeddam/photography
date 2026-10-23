import { z } from 'zod';
import { albumOptions, bookableServices } from '../../data/catalog';

export const priceFields = [
  ...bookableServices.map(({ id, name, price }) => ({
    id,
    name,
    price,
    unit: 'per ceremony / day, per unit',
  })),
  ...Object.entries(albumOptions).map(([size, album]) => ({
    ...album,
    name: `${album.name} · ${size.replace('x', ' × ')}`,
    unit: 'per album',
  })),
];
export type ServicePrices = Record<string, number>;
export const defaultPrices: ServicePrices = Object.fromEntries(
  priceFields.map((s) => [s.id, s.price]),
);
export const pricesSchema = z
  .record(z.string(), z.number().int().min(0).max(1000000))
  .refine(
    (prices) =>
      Object.keys(prices).length === priceFields.length &&
      priceFields.every((s) => Object.hasOwn(prices, s.id)),
    'Provide a valid price for every service and album size.',
  );
export const pricingSchema = z.object({
  prices: pricesSchema,
  revision: z.string().min(1),
});
export type Pricing = z.infer<typeof pricingSchema>;
export const pricingUpdateSchema = pricingSchema.strict();
