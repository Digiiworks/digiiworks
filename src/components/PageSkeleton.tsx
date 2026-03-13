import { Skeleton } from '@/components/ui/skeleton';

/** Content-area skeleton for public pages (blog post, service detail, etc.) */
export const ContentPageSkeleton = () => (
  <div className="mx-auto max-w-3xl px-6 py-16 space-y-6 animate-in fade-in duration-300">
    <Skeleton className="h-8 w-3/4 bg-muted/40" />
    <Skeleton className="h-4 w-1/2 bg-muted/30" />
    <Skeleton className="h-64 w-full rounded-lg bg-muted/30" />
    <div className="space-y-3">
      <Skeleton className="h-4 w-full bg-muted/20" />
      <Skeleton className="h-4 w-5/6 bg-muted/20" />
      <Skeleton className="h-4 w-4/6 bg-muted/20" />
    </div>
  </div>
);

/** Skeleton for auth / simple form pages */
export const FormPageSkeleton = () => (
  <div className="mx-auto max-w-md px-6 py-24 space-y-6 animate-in fade-in duration-300">
    <Skeleton className="mx-auto h-10 w-40 bg-muted/40" />
    <div className="rounded-lg border border-border/30 p-6 space-y-5">
      <Skeleton className="h-4 w-20 bg-muted/30" />
      <Skeleton className="h-10 w-full bg-muted/20" />
      <Skeleton className="h-4 w-20 bg-muted/30" />
      <Skeleton className="h-10 w-full bg-muted/20" />
      <Skeleton className="h-10 w-full bg-muted/40 rounded-md" />
    </div>
  </div>
);

/** Skeleton for legal / text-heavy pages */
export const LegalPageSkeleton = () => (
  <div className="mx-auto max-w-3xl px-6 py-16 space-y-5 animate-in fade-in duration-300">
    <Skeleton className="h-8 w-1/3 bg-muted/40" />
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-4 bg-muted/20" style={{ width: `${85 - i * 5}%` }} />
      ))}
    </div>
    <Skeleton className="h-6 w-1/4 bg-muted/30 mt-6" />
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-4 bg-muted/20" style={{ width: `${90 - i * 6}%` }} />
      ))}
    </div>
  </div>
);

/** Admin page skeleton */
export const AdminPageSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="flex items-center justify-between">
      <Skeleton className="h-7 w-48 bg-muted/40" />
      <Skeleton className="h-9 w-28 bg-muted/30 rounded-md" />
    </div>
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/30 p-4 space-y-3">
          <Skeleton className="h-3 w-20 bg-muted/30" />
          <Skeleton className="h-7 w-16 bg-muted/40" />
        </div>
      ))}
    </div>
    <div className="rounded-lg border border-border/30 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border/20 last:border-0">
          <Skeleton className="h-4 w-24 bg-muted/20" />
          <Skeleton className="h-4 w-32 bg-muted/20" />
          <Skeleton className="h-4 w-16 bg-muted/30 ml-auto" />
        </div>
      ))}
    </div>
  </div>
);
