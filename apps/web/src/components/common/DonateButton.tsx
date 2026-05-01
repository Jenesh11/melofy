'use client';

import React from 'react';
import { Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DonateButtonProps {
  className?: string;
  variant?: 'default' | 'minimal';
}

export const DonateButton: React.FC<DonateButtonProps> = ({ 
  className, 
  variant = 'default' 
}) => {
  if (variant === 'minimal') {
    return (
      <a
        href="https://payments.cashfree.com/forms/shrey"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'transition-all duration-300 hover:scale-110 active:scale-95',
          className
        )}
        title="Buy me a coffee"
      >
        <Coffee className="w-5 h-5" />
      </a>
    );
  }

  return (
    <a
      href="https://payments.cashfree.com/forms/shrey"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-block no-underline active:scale-95 transition-transform',
        className
      )}
    >
      <div className="flex items-center p-2.5 rounded-[1.25rem] border border-border bg-card hover:bg-muted/50 transition-all shadow-sm group">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Coffee className="w-5 h-5" />
          </div>
        </div>
        <div className="flex flex-col items-start justify-center mx-3">
          <div className="text-foreground text-sm font-bold">
            Buy me a coffee
          </div>
          <div className="text-muted-foreground text-[10px] flex items-center gap-1">
            <span>Powered By Cashfree</span>
          </div>
        </div>
      </div>
    </a>
  );
};
