import type { ComponentPropsWithoutRef } from 'react';
import './button.css';

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
  busy?: boolean;
}

export function Button({
  variant = 'primary',
  busy = false,
  type = 'button',
  disabled,
  className,
  ...props
}: ButtonProps) {
  const classes = ['ml-button', 'ml-button--' + variant, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      {...props}
      className={classes}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    />
  );
}
