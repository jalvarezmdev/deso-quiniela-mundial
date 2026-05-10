import * as React from 'react'
import { cn } from '#/lib/cn'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'danger'
}

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'default' &&
          'bg-[var(--accent)] text-[var(--secondary)] hover:brightness-110',
        variant === 'outline' &&
          'border border-[var(--line)] bg-[var(--secondary)] text-[var(--primary)] hover:bg-zinc-100',
        variant === 'ghost' &&
          'text-[var(--primary)] hover:bg-zinc-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500',
        className,
      )}
      {...props}
    />
  )
}
