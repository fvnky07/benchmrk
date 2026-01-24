import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="bg-black-2 flex min-h-screen flex-col">
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
