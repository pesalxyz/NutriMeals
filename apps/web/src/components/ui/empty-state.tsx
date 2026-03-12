import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">○</div>
      <p className="empty__title">{title}</p>
      <p className="small empty__desc">{description}</p>
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
