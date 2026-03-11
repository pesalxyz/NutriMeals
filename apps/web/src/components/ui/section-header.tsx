import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="section-head">
      <div className="section-head__meta">
        <h2 className="section-head__title">{title}</h2>
        {subtitle ? <p className="small section-head__subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
