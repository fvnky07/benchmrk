'use client';

interface MDXContentWrapperProps {
  children: React.ReactNode;
}

export function MDXContentWrapper({ children }: MDXContentWrapperProps) {
  return <>{children}</>;
}
