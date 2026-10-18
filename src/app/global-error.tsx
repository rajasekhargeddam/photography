'use client';
import { bodyFont, headingFont } from '@/config/fonts';
import { uiCopy } from '@/config/copy';
import { PageState } from '@/components/ui/page-state';
import { Button } from '@/components/ui/button';
import '@/styles/globals.css';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>
        <PageState title="Something went wrong">
          <Button onClick={reset}>{uiCopy.actions.tryAgain}</Button>
        </PageState>
      </body>
    </html>
  );
}
