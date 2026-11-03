import { readFileSync } from 'node:fs';
import { assertBuild } from './app-options';

// Additional guard for Wrangler commands outside the mode-aware launcher.
try {
  const stamp = JSON.parse(readFileSync('.app-build.json', 'utf8'));
  const buildId = readFileSync('.next/BUILD_ID', 'utf8').trim();
  const required = JSON.parse(
    readFileSync('.next/required-server-files.json', 'utf8'),
  );
  assertBuild(stamp, 'lite', buildId, true);
  if (required.config?.env?.APP_VARIANT !== 'lite')
    throw new Error('The Next.js bundle is not a lite build.');
  console.log('Verified lite build for Cloudflare.');
} catch {
  console.error(
    'Refusing upload: run npm run build:lite first. A management build cannot be uploaded to lite.',
  );
  process.exitCode = 1;
}
