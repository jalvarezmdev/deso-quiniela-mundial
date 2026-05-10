import * as React from 'react'
import { cn } from '#/lib/cn'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20',
        className,
      )}
      {...props}
    />
  )
}
