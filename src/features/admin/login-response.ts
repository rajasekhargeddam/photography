export async function checkLoginResponse(response: Response): Promise<void> {
  const fallback =
    'Sign-in is temporarily unavailable. Please try again shortly.';
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(fallback);
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? body.message
        : undefined;
    throw new Error(typeof message === 'string' ? message : fallback);
  }
  if (
    !body ||
    typeof body !== 'object' ||
    !('success' in body) ||
    body.success !== true
  )
    throw new Error(fallback);
}
