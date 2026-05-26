'use client';

import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const toast = {
  success: (message: string, options?: object) => 
    sonnerToast.success(message, { 
      ...options,
      className: '!bg-[var(--color-sage-light)] !text-[var(--color-ink)] !border-2 !border-[var(--color-border)] !shadow-[var(--shadow-md)] !rounded-[10px]',
      icon: <CheckCircle className="w-5 h-5 text-[var(--color-sage-dark)]" />,
    }),
  error: (message: string, options?: object) => 
    sonnerToast.error(message, { 
      ...options,
      className: '!bg-[var(--color-rose-light)] !text-[var(--color-ink)] !border-2 !border-[var(--color-border)] !shadow-[var(--shadow-md)] !rounded-[10px]',
      icon: <XCircle className="w-5 h-5 text-[var(--color-rose-dark)]" />,
    }),
  warning: (message: string, options?: object) => 
    sonnerToast(message, { 
      ...options,
      className: '!bg-[var(--color-butter-light)] !text-[var(--color-ink)] !border-2 !border-[var(--color-border)] !shadow-[var(--shadow-md)] !rounded-[10px]',
      icon: <AlertCircle className="w-5 h-5 text-[var(--color-butter-dark)]" />,
    }),
  info: (message: string, options?: object) => 
    sonnerToast(message, { 
      ...options,
      className: '!bg-[var(--color-sky-light)] !text-[var(--color-ink)] !border-2 !border-[var(--color-border)] !shadow-[var(--shadow-md)] !rounded-[10px]',
      icon: <Info className="w-5 h-5 text-[var(--color-sky-dark)]" />,
    }),
};

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      duration={4000}
      className="toaster !bg-cream"
      toastOptions={{
        classNames: {
          toast: '!bg-cream !border-2 !border-[var(--color-border)] !shadow-[var(--shadow-md)] !rounded-[10px] !p-4',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
