'use client';
import { PageState } from '@/components/ui/page-state';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageState title="Something went wrong">
      <Button onClick={reset}>Try again</Button>
    </PageState>
  );
}
