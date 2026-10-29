type Environment = {
  APP: { fetch(request: Request): Promise<Response> };
  TELEGRAM_RETRY_SECRET: string;
};
export async function retryTelegram(env: Environment) {
  if (!env.TELEGRAM_RETRY_SECRET)
    throw new Error('Telegram retry secret is missing');
  const result = await env.APP.fetch(
    new Request('https://internal/api/telegram/retry', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.TELEGRAM_RETRY_SECRET },
      signal: AbortSignal.timeout(60_000),
    }),
  );
  if (!result.ok)
    throw new Error('Telegram retry failed (HTTP ' + result.status + ')');
}
const scheduler = {
  async scheduled(_controller: unknown, env: Environment) {
    await retryTelegram(env);
  },
};

export default scheduler;
