import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Loading({ className, label = 'Načítám…' }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-muted-foreground', className)}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
