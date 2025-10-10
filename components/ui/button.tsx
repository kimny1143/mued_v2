import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'rounded-[var(--radius-sm)] transition font-semibold inline-flex items-center justify-center gap-2';

    const variants = {
      default: 'bg-[var(--color-brand-green)] hover:bg-[var(--color-brand-green-hover)] active:bg-[var(--color-brand-green-active)] text-[var(--color-brand-text)] disabled:bg-gray-300 disabled:text-gray-500',
      primary: 'bg-[var(--color-brand-green)] hover:bg-[var(--color-brand-green-hover)] active:bg-[var(--color-brand-green-active)] text-[var(--color-brand-text)] disabled:bg-gray-300 disabled:text-gray-500',
      secondary: 'bg-[var(--color-card-bg)] hover:opacity-80 active:opacity-70 text-[var(--color-text-primary)] border border-[var(--color-card-border)] disabled:bg-gray-300 disabled:text-gray-500',
      danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white disabled:bg-gray-300 disabled:text-gray-500',
      success: 'bg-[var(--color-success)] hover:opacity-90 active:opacity-80 text-white disabled:bg-gray-300 disabled:text-gray-500',
      warning: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white disabled:bg-gray-300 disabled:text-gray-500',
      info: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white disabled:bg-gray-300 disabled:text-gray-500',
      outline: 'border-2 border-[var(--color-card-border)] hover:bg-[var(--color-card-bg)] active:opacity-80 text-[var(--color-text-primary)] disabled:bg-transparent disabled:text-gray-400',
      ghost: 'hover:bg-[var(--color-card-bg)] active:opacity-80 text-[var(--color-text-primary)] disabled:text-gray-400',
      link: 'text-[var(--color-brand-green)] hover:text-[var(--color-brand-green-hover)] underline-offset-4 hover:underline disabled:text-gray-400',
    };

    const sizes = {
      sm: 'h-8 px-3 py-1 text-[13px] leading-[18px]',
      md: 'h-10 px-4 py-2 text-[15px] leading-[20px]',
      lg: 'h-12 px-6 py-3 text-[17px] leading-[22px]',
    };

    const disabledStyles = disabled ? 'cursor-not-allowed' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
