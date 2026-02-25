import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="font-mono text-xs font-bold uppercase tracking-wider text-dark">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'input-brutal',
          error && 'border-red-500 focus:border-red-500 focus:shadow-[3px_3px_0px_#ef4444]',
          className
        )}
        {...props}
      />
      {error && (
        <p className="font-mono text-xs text-red-500 font-bold">{error}</p>
      )}
      {hint && !error && (
        <p className="font-mono text-xs text-muted">{hint}</p>
      )}
    </div>
  )
})
