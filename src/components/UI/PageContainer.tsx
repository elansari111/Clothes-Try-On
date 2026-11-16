import React from 'react';
import { cn } from '../../utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn', className)}>
      {children}
    </div>
  );
};
