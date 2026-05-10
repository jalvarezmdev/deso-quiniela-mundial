import * as React from 'react'
import { cn } from '#/lib/cn'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--line)] bg-[var(--secondary)] p-4 shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
