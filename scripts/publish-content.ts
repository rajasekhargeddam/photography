export {};
// Local operator command. No production credentials or URLs are printed.
const origin = process.env.CONTENT_PUBLISH_ORIGIN;
const secret = process.env.CONTENT_PUBLISH_SECRET;
async function main() {
  if (!origin || !secret || secret.length < 32)
    throw new Error(
      'Set CONTENT_PUBLISH_ORIGIN and a CONTENT_PUBLISH_SECRET of at least 32 characters in .env.local.',
    );
  const url = new URL(origin);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error(
      'CONTENT_PUBLISH_ORIGIN must be an origin without credentials, path or query.',
    );
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
  )
    throw new Error('Publishing requires HTTPS except on localhost.');
  let response: Response;
  try {
    response = await fetch(new URL('/api/content/publish', url), {
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: 'Bearer ' + secret },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error(
      'Could not reach the publishing endpoint. Check configuration and retry.',
    );
  }
  if (!response.ok)
    throw new Error(
      'Publishing failed (HTTP ' +
        response.status +
        '). Check the deployed configuration.',
    );
  const result = await response.json();
  if (result.success !== true || !/^\d+$/.test(result.revision))
    throw new Error('Unexpected publishing response.');
  console.log(
    'Published content revision ' +
      result.revision +
      '. Allow up to 60 seconds for edge refresh, then reload the website. Existing open tabs are not pushed updates.',
  );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Publishing failed.');
  process.exitCode = 1;
});
