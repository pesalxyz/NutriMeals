import type { ReactNode } from 'react';

type BadgeTone = 'default' | 'success' | 'warning';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'default' }: BadgeProps) {
  const toneClass = tone === 'default' ? '' : tone;
  return <span className={`pill ${toneClass}`.trim()}>{children}</span>;
}
