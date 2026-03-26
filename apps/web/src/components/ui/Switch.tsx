'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        'group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted',
        className,
      )}
    >
      <span className='sr-only'>Toggle setting</span>
      <motion.span
        initial={false}
        animate={{
          x: checked ? 20 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        className={cn(
          'pointer-events-none relative inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'bg-primary-foreground' : 'bg-white',
        )}
      >
        <span
          className={cn(
            'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in-out',
            checked ? 'opacity-0 scale-0' : 'opacity-100 scale-100',
          )}
          aria-hidden='true'
        >
          <svg className='h-3 w-3 text-muted-foreground' fill='none' viewBox='0 0 12 12'>
            <path
              d='M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </span>
        <span
          className={cn(
            'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in-out',
            checked ? 'opacity-100 scale-100' : 'opacity-0 scale-0',
          )}
          aria-hidden='true'
        >
          <svg className='h-3 w-3 text-primary' fill='currentColor' viewBox='0 0 12 12'>
            <path d='M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z' />
          </svg>
        </span>
      </motion.span>
    </button>
  );
}
