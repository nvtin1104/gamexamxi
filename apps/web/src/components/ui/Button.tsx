'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'dark' | 'danger'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Pick only HTML button attrs that don't conflict with framer-motion
type ButtonBaseProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>

interface ButtonProps extends ButtonBaseProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white',
  secondary: 'bg-secondary text-dark',
  accent: 'bg-accent text-dark',
  ghost: 'bg-surface text-dark',
  dark: 'bg-dark text-white',
  danger: 'bg-red-500 text-white',
}

const sizes: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
  xl: 'px-10 py-4 text-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const motionProps: HTMLMotionProps<'button'> = {
    whileTap: !disabled && !loading ? { x: 4, y: 4, boxShadow: '0px 0px 0px #0A0A0A' } : {},
    whileHover: !disabled && !loading ? { x: -2, y: -2 } : {},
    transition: { type: 'spring', stiffness: 400, damping: 17 },
    className: cn(
      'btn-brutal',
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      (disabled || loading) && 'opacity-50 cursor-not-allowed',
      className
    ),
    disabled: disabled || loading,
    style: { boxShadow: '4px 4px 0px #0A0A0A' },
    ...(props as HTMLMotionProps<'button'>),
  }

  return (
    <motion.button {...motionProps}>
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}
