import { BookOpen, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  wikiUrl?: string | null;
  mapsUrl?: string | null;
  className?: string;
}

export function LinksCell({ wikiUrl, mapsUrl, className }: Props) {
  if (!wikiUrl && !mapsUrl) return null;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {wikiUrl && (
        <a
          href={wikiUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="Wikipedia"
        >
          <BookOpen className="h-4 w-4" />
        </a>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="Mapa"
        >
          <MapPin className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
