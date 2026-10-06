import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

export function SearchBox({ value, onChange, className, placeholder = 'Hledat v událostech…' }: Props) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        className="pl-9 pr-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => onChange('')}
          aria-label="Vymazat"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
