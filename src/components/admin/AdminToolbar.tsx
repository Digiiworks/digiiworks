import { type ReactNode } from 'react';

interface AdminToolbarProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}

const AdminToolbar = ({ title, subtitle, children }: AdminToolbarProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    {(title || subtitle) && (
      <div>
        {title && <h1 className="font-mono text-2xl font-bold text-foreground">{title}</h1>}
        {subtitle && <p className="font-mono text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    )}
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </div>
);

export default AdminToolbar;
