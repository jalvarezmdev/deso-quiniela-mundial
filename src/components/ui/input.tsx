import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '#/lib/cn'

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(
  function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-[var(--primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20',
        className,
      )}
      {...props}
    />
  )
  },
)
