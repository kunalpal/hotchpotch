'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showIcon?: boolean;
  className?: string;
  href?: string;
}

export function Logo({
  size = 'md',
  showText = true,
  showIcon = true,
  className = '',
  href = '/',
}: LogoProps) {
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const IconComponent = showIcon ? (
    <Sparkles size={iconSizes[size]} className="stroke-[1.4]" />
  ) : null;

  const TextComponent = showText ? (
    <span className={`font-serif tracking-wide ${textSizes[size]}`}>
      HotchPotch
    </span>
  ) : null;

  const content = (
    <div className={`flex items-center space-x-2 ${className}`}>
      {IconComponent}
      {TextComponent}
    </div>
  );

  // If using Link for client-side navigation
  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    );
  }

  // Otherwise return as a plain div
  return content;
}
