import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  subtitle?: string;
  variant?: 'default' | 'alert';
  alertColor?: string;
  onClick?: () => void;
  className?: string;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconColor,
  valueColor,
  subtitle,
  variant = 'default',
  alertColor,
  onClick,
  className,
}: StatCardProps) => {
  const isAlert = variant === 'alert';
  const borderClass = isAlert && alertColor ? `border-${alertColor}/40` : 'border-border';
  const bgClass = isAlert && alertColor ? `bg-${alertColor}/5` : 'bg-card/50';

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        borderClass,
        bgClass,
        onClick && 'cursor-pointer hover:border-primary/50 transition-colors',
        className,
      )}
      onClick={onClick}
    >
      {Icon ? (
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      ) : (
        <p className={cn(
          'font-mono text-[10px] uppercase tracking-widest',
          isAlert && alertColor ? `text-${alertColor}` : 'text-muted-foreground',
        )}>
          {label}
        </p>
      )}
      <p className={cn('font-mono text-2xl font-bold', valueColor || 'text-foreground')}>{value}</p>
      {subtitle && (
        <p className={cn(
          'font-mono text-xs mt-1',
          isAlert && alertColor ? `text-${alertColor}/70` : 'text-muted-foreground',
        )}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;
