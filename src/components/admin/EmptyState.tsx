import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
}

const EmptyState = ({ icon: Icon, message }: EmptyStateProps) => (
  <div className="py-16 text-center">
    {Icon && <Icon className="mx-auto h-10 w-10 text-muted-foreground/30" />}
    <p className="mt-3 font-mono text-sm text-muted-foreground">{message}</p>
  </div>
);

export default EmptyState;
