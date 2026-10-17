import type { ReactNode } from 'react';

export function PageState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="page-state container">
      <section className="page-state-panel">
        <p className="eyebrow">My Dream Photography</p>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}
