'use client';

import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      theme="light"
      position="top-center"
      duration={4000}
      icons={{
        success: <CheckCircle className="w-5 h-5 text-green-600" />,
        error: <XCircle className="w-5 h-5 text-red-600" />,
        info: <Info className="w-5 h-5 text-blue-600" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
      }}
      toastOptions={{
        classNames: {
          toast: `
            group toast 
            bg-cream 
            text-ink 
            border-2 
            border-[var(--color-border)] 
            shadow-[var(--shadow-md)] 
            rounded-[12px] 
            p-4 
            font-medium
          `,
          title: 'font-bold text-[15px] mb-1',
          description: 'text-[13px] text-[var(--color-muted)]',
          actionButton: `
            bg-ink 
            text-white 
            border-2 
            border-[var(--color-border)] 
            rounded-[8px] 
            px-3 
            py-1.5 
            text-sm 
            font-semibold 
            hover:bg-[#333] 
            transition-colors
          `,
          cancelButton: `
            bg-white 
            text-ink 
            border-2 
            border-[var(--color-border)] 
            rounded-[8px] 
            px-3 
            py-1.5 
            text-sm 
            font-semibold 
            hover:bg-gray-100 
            transition-colors
          `,
          closeButton: `
            bg-white 
            border-2 
            border-[var(--color-border)] 
            rounded-[8px]
            hover:bg-gray-100 
            transition-colors
          `,
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
