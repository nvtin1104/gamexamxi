'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
}

export function Card({
  children,
  className,
  hoverable = false,
  onClick,
  padding = 'md',
}: CardProps) {
  if (hoverable || onClick) {
    return (
      <motion.div
        whileHover={{ x: -3, y: -3, boxShadow: '11px 11px 0px #0A0A0A' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn('card-brutal cursor-pointer', paddings[padding], className)}
        style={{ boxShadow: '8px 8px 0px #0A0A0A' }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      className={cn('card-brutal', paddings[padding], className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
