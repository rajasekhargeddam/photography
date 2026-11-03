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
  const local =
    ['dev', 'start', 'typecheck'].includes(action) || variant === 'management';
  if (!local && !environment.LITE_SITE_URL)
    throw new Error('Set LITE_SITE_URL to the company HTTPS website origin.');
  const origin = local
    ? `http://localhost:${port}`
    : environment.LITE_SITE_URL!;
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    (!local && url.protocol !== 'https:')
  )
    throw new Error(
      'LITE_SITE_URL must be an HTTPS origin without path, credentials, query or trailing slash.',
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
