import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';
type Variant = 'primary' | 'outline' | 'text';
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`button button--${variant} ${className}`}
      {...props}
    />
  );
}
export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link className={`button button--${variant} ${className}`} {...props} />
  );
}
