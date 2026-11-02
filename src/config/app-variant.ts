export type AppVariant = 'management' | 'lite';

export function parseVariant(value: string | undefined): AppVariant {
  if (value === undefined || value === 'management') return 'management';
  if (value === 'lite') return 'lite';
  throw new Error('APP_VARIANT must be management or lite.');
}

// Next config embeds this non-secret value in both server and browser bundles.
// Runtime variables cannot turn an already-built lite app into management.
export function appVariant(): AppVariant {
  return parseVariant(process.env.APP_VARIANT);
}

export function managementEnabled() {
  return appVariant() === 'management';
}

export function isManagementPath(path: string) {
  return /^\/(?:api\/)?admin\/(?:content|pricing)(?:\/|$)/.test(path);
}
