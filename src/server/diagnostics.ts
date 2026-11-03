import { randomUUID } from 'node:crypto';

// Never log raw errors: driver messages can contain URIs, credentials or records.
// These fixed categories and a correlation ID are safe to share with operators.
export function reportFailure(error: unknown, operation: string) {
  const failure = error as { name?: unknown; code?: unknown } | null;
  let category = 'unexpected';
  if (failure?.code === 18) category = 'database-authentication';
  else if (failure?.code === 13) category = 'database-permission';
  else if (failure?.name === 'MongoServerSelectionError')
    category = 'database-connectivity';
  else if (failure?.name === 'MongoNetworkError') category = 'database-network';
  else if (failure?.name === 'MongoServerError')
    category = 'database-operation';
  else if (failure?.name === 'ZodError')
    category = 'configuration-or-validation';
  else if (failure?.name === 'TypeError') category = 'programming-or-network';
  const requestId = randomUUID();
  console.error(
    JSON.stringify({
      event: 'operation_failed',
      operation,
      category,
      requestId,
    }),
  );
  return requestId;
}
