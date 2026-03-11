import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const variantClass = variant === 'primary' ? '' : variant;
  return (
    <button className={`button ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
