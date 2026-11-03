import { uiCopy } from '@/config/copy';
import type { Enquiry } from './data';
export function Status({ status }: { status: Enquiry['status'] }) {
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i aria-hidden="true" />
      {status === 'CONFIRMED'
        ? uiCopy.status.sentQuote
        : uiCopy.status.savedQuote}
    </span>
  );
}
export function ErrorNotice({
  error,
  retry,
  pending,
}: {
  error: Error;
  retry: () => void;
  pending: boolean;
}) {
  return (
    <div className="error" role="alert">
      <p>{error.message}</p>
      <button disabled={pending} onClick={retry}>
        {uiCopy.actions.tryAgain}
      </button>
    </div>
  );
}
