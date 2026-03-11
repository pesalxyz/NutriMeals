import type { ReactNode } from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="field-wrap">
      {label ? <label className="label">{label}</label> : null}
      {children}
      {hint ? <p className="small field-hint">{hint}</p> : null}
    </div>
  );
}
