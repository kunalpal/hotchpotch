'use client';

import React from 'react';

export type NamedDividerProps = {
  name: string;
  className?: string;
};

export function NamedDivider({ name, className = 'my-4' }: NamedDividerProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="bg-muted h-px flex-1" />
      <span className="text-muted-foreground mx-3 text-sm">{name}</span>
      <div className="bg-muted h-px flex-1" />
    </div>
  );
}

export default NamedDivider;
