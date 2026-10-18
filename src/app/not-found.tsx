import { uiCopy } from '@/config/copy';
import { ButtonLink } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';

export default function NotFound() {
  return (
    <PageState title="Page not found">
      <ButtonLink href="/">{uiCopy.actions.backHome}</ButtonLink>
    </PageState>
  );
}
