import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'orbe-button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'orbe-primary orbe-button-primary',
        secondary: 'orbe-button-secondary',
        ghost: 'orbe-button-tertiary',
        destructive: 'orbe-button-destructive',
      },
      size: {
        default: 'h-11 px-5 text-sm',
        sm: 'h-9 px-3 text-sm',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
