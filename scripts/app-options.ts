import { parseVariant, type AppVariant } from '../src/config/app-variant';

export const liteWorker = 'my-dream-photography-lite';

export function commandOptions(
  args: string[],
  environment: Record<string, string | undefined>,
) {
  const [action, value, ...extra] = args;
  const variant = parseVariant(value);
  if (
    !value ||
    ![
      'dev',
      'build',
      'start',
      'preview',
      'upload',
      'bundle-check',
      'typecheck',
    ].includes(action)
  )
    throw new Error('Use a documented npm command from README.md.');
  if (
    variant !== 'lite' &&
    ['preview', 'upload', 'bundle-check'].includes(action)
  )
    throw new Error(
      'Cloudflare commands support lite only. Management runs locally.',
    );
  let port = variant === 'lite' ? 3001 : 3000;
  if (extra.length) {
    if (
      !['dev', 'start'].includes(action) ||
      extra.length !== 2 ||
      extra[0] !== '--port' ||
      !/^\d+$/.test(extra[1])
    )
      throw new Error('Only dev/start accept extra options: --port NUMBER.');
    port = Number(extra[1]);
    if (port < 1024 || port > 65535)
      throw new Error('Port must be between 1024 and 65535.');
  }
  const hostedManagement =
    variant === 'management' &&
    action === 'build' &&
    environment.NETLIFY === 'true';
  const local =
    ['dev', 'start', 'typecheck'].includes(action) ||
    (variant === 'management' && !hostedManagement);
  const hostedOrigin = hostedManagement
    ? environment.NEXT_PUBLIC_SITE_URL
    : environment.LITE_SITE_URL;
  if (!local && !hostedOrigin)
    throw new Error(
      'Set the public HTTPS origin: NEXT_PUBLIC_SITE_URL for Netlify or LITE_SITE_URL for Cloudflare.',
    );
  if (hostedManagement && environment.APP_ORIGIN !== hostedOrigin)
    throw new Error(
      'APP_ORIGIN must match NEXT_PUBLIC_SITE_URL for the Netlify build.',
    );
  const origin = local ? `http://localhost:${port}` : hostedOrigin!;
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    (!local && url.protocol !== 'https:')
  )
    throw new Error(
      'The public site URL must be an HTTPS origin without path, credentials, query or trailing slash.',
    );
  return { action, variant, port, origin };
}

export function assertBuild(
  stamp: {
    variant?: AppVariant;
    buildId?: string;
    origin?: string;
    cloudflare?: boolean;
  },
  variant: AppVariant,
  buildId: string,
  requireCloudflare = false,
  origin?: string,
) {
  if (
    stamp.variant !== variant ||
    stamp.buildId !== buildId ||
    (requireCloudflare && !stamp.cloudflare) ||
    (origin && stamp.origin !== origin)
  )
    throw new Error(`Build mismatch. Run npm run build:${variant} first.`);
}
