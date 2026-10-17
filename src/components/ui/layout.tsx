import type { HTMLAttributes, ReactNode } from 'react';
export function Container({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`container ${className}`} {...props} />;
}
export function Section({
  className = '',
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={`section ${className}`} {...props} />;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}
export function SectionHeading({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <h2 id={id} className="section-heading">
      {children}
    </h2>
  );
}
