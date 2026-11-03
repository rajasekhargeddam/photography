import { spawn } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  openSync,
  closeSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import ts from 'typescript';
import { commandOptions, assertBuild, liteWorker } from './app-options';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const lock = resolve(root, '.app-command.lock');
const stampPath = resolve(root, '.app-build.json');
let ownsLock = false;
function acquireLock() {
  try {
    const fd = openSync(lock, 'wx');
    writeFileSync(fd, JSON.stringify({ pid: process.pid }));
    closeSync(fd);
    ownsLock = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const previous = JSON.parse(readFileSync(lock, 'utf8')) as { pid: number };
    if (!Number.isInteger(previous.pid) || previous.pid <= 0)
      throw new Error(
        'Invalid command lock. Stop app processes before removing .app-command.lock.',
      );
    try {
      process.kill(previous.pid, 0);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'ESRCH') {
        unlinkSync(lock);
        return acquireLock();
      }
    }
    throw new Error(
      'Another app/build command is running. Stop it with Ctrl+C before switching modes.',
    );
  }
}
const bins = {
  next: 'node_modules/next/dist/bin/next',
  cloudflare: 'node_modules/@opennextjs/cloudflare/dist/cli/index.js',
  wrangler: 'node_modules/wrangler/bin/wrangler.js',
  tsc: 'node_modules/typescript/bin/tsc',
};
async function run(
  bin: keyof typeof bins,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  await new Promise<void>((accept, reject) => {
    const child = spawn(process.execPath, [resolve(root, bins[bin]), ...args], {
      cwd: root,
      env,
      stdio: 'inherit',
      windowsHide: true,
    });
    const stop = () => child.kill('SIGINT');
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    child.once('error', reject);
    child.once('exit', (code) => {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      if (code === 0) accept();
      else
        reject(
          new Error(
            `${bin} did not complete successfully (${code ?? 'interrupted'}).`,
          ),
        );
    });
  });
}
async function main() {
  const local = existsSync('.env.local')
    ? parseEnv(readFileSync('.env.local', 'utf8'))
    : {};
  const settings = { ...local, ...process.env };
  const options = commandOptions(process.argv.slice(2), settings);
  const { action, variant, origin, port } = options;
  const env: NodeJS.ProcessEnv = {
    ...settings,
    APP_VARIANT: variant,
    APP_ORIGIN: origin,
    NEXT_PUBLIC_SITE_URL: origin,
    // Real delivery is enabled only in the deployed Worker's runtime config.
    TELEGRAM_DISPATCH_ENABLED: 'false',
    SKIP_NEXT_APP_BUILD: 'false',
  };
  acquireLock();
  console.log(
    `${action}: ${variant} (${origin}). Local Telegram delivery disabled.`,
  );
  if (action === 'dev') {
    if (existsSync(stampPath)) unlinkSync(stampPath);
    return run('next', ['dev', '--port', String(port)], env);
  }
  if (action === 'typecheck') {
    await run('next', ['typegen'], env);
    return run('tsc', ['--noEmit'], env);
  }
  async function build() {
    if (existsSync(stampPath)) unlinkSync(stampPath);
    if (variant === 'lite') {
      const parsed = ts.parseConfigFileTextToJson(
        'wrangler.jsonc',
        readFileSync('wrangler.jsonc', 'utf8'),
      );
      if (parsed.error)
        throw new Error('Invalid wrangler.jsonc configuration.');
      const config = parsed.config;
      if (
        config.name !== liteWorker ||
        config.services?.find(
          (s: { binding: string }) => s.binding === 'WORKER_SELF_REFERENCE',
        )?.service !== liteWorker
      )
        throw new Error('Lite Worker identity/self-reference does not match.');
      await run('cloudflare', ['build', '--config', 'wrangler.jsonc'], env);
    } else await run('next', ['build'], env);
    const buildId = readFileSync('.next/BUILD_ID', 'utf8').trim();
    writeFileSync(
      stampPath,
      JSON.stringify({
        variant,
        buildId,
        origin,
        cloudflare: variant === 'lite',
      }),
    );
  }
  function verify() {
    if (!existsSync(stampPath) || !existsSync('.next/BUILD_ID'))
      throw new Error(`No verified build. Run npm run build:${variant} first.`);
    assertBuild(
      JSON.parse(readFileSync(stampPath, 'utf8')),
      variant,
      readFileSync('.next/BUILD_ID', 'utf8').trim(),
      action !== 'start',
      action === 'start' ? undefined : origin,
    );
  }
  if (action === 'build') return build();
  verify();
  if (action === 'upload')
    return run('cloudflare', ['upload', '--config', 'wrangler.jsonc'], env);
  if (action === 'start')
    return run('next', ['start', '--port', String(port)], env);
  if (action === 'preview')
    return run(
      'cloudflare',
      [
        'preview',
        '--config',
        'wrangler.jsonc',
        '--var',
        'TELEGRAM_DISPATCH_ENABLED:false',
      ],
      env,
    );
  return run(
    'wrangler',
    ['deploy', '--dry-run', '--config', 'wrangler.jsonc'],
    env,
  );
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'App command failed.',
    );
    process.exitCode = 1;
  })
  .finally(() => {
    if (ownsLock && existsSync(lock)) unlinkSync(lock);
  });
