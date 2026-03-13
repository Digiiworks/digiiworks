import { type LucideIcon } from 'lucide-react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
}

const EmptyState = ({ icon: Icon, message }: EmptyStateProps) => (
  <div className="py-16 text-center">
    {Icon && <Icon className="mx-auto h-10 w-10 text-muted-foreground/30" aria-hidden="true" />}
    <p className="mt-3 font-mono text-sm text-muted-foreground">{message}</p>
  </div>
);

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message = 'Something went wrong loading data.', onRetry }: ErrorStateProps) => (
  <div className="py-16 text-center space-y-4">
    <AlertCircle className="mx-auto h-10 w-10 text-destructive/50" aria-hidden="true" />
    <p className="font-mono text-sm text-destructive">{message}</p>
    {onRetry && (
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="font-mono text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        Retry
      </Button>
    )}
  </div>
);

export default EmptyState;
