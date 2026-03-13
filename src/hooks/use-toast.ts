import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

function toast(opts: ToastOptions) {
  const msg = opts.title || '';
  const config = opts.description ? { description: opts.description } : undefined;

  if (opts.variant === 'destructive') {
    sonnerToast.error(msg, config);
  } else {
    sonnerToast.success(msg, config);
  }
}

function useToast() {
  return { toast };
}

export { useToast, toast };
