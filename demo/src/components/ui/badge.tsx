import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700 border-gray-200',
        matched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        partial: 'bg-amber-50 text-amber-700 border-amber-200',
        unmatched: 'bg-red-50 text-red-700 border-red-200',
        open: 'bg-blue-50 text-blue-700 border-blue-200',
        review: 'bg-purple-50 text-purple-700 border-purple-200',
        resolved: 'bg-gray-100 text-gray-500 border-gray-200',
        escalated: 'bg-orange-50 text-orange-700 border-orange-200',
        disputed: 'bg-red-50 text-red-700 border-red-200',
        high: 'bg-red-50 text-red-700 border-red-200',
        medium: 'bg-amber-50 text-amber-700 border-amber-200',
        low: 'bg-gray-100 text-gray-500 border-gray-200',
        navy: 'bg-navy-900 text-white border-navy-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
