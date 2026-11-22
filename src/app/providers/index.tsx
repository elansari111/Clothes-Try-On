import React from 'react';

export interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Root Application Providers wrapper
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return <>{children}</>;
};
