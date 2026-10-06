import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Globe, Map as MapIcon, Image as ImageIcon, Radio } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Event, ImageRef } from '@/types/domain';

/** Vytáhne validní obrázky z JSON pole image_refs. */
function imageRefsOf(ev: Event): ImageRef[] {
  if (!Array.isArray(ev.image_refs)) return [];
  return (ev.image_refs as unknown[]).filter(
    (r): r is ImageRef =>
      typeof r === 'object' && r !== null && 'url' in r && typeof (r as ImageRef).url === 'string',
  );
}

interface Props {
  event: Event;
  className?: string;
}

/**
 * Náhled obrázku + řádek s ikonami odkazů události (Wikipedia, Mapy.cz,
 * galerie, Toulky českou minulostí). Samostatná komponenta – používá tabulka
 * Událostí i časová osa, aby obě zobrazovaly stejný obsah. Galerie / náhled
 * mají vlastní lightbox.
 */
export function EventLinks({ event, className }: Props) {
  const images = imageRefsOf(event);
  const firstImage = images[0];
  const [lightbox, setLightbox] = useState<string[] | null>(null);

  const hasAny = event.wiki_url || event.maps_url || event.toulky_url || images.length > 0;
  if (!hasAny) return null;

  const openGallery = () => setLightbox(images.map((i) => i.url));
  const hasIconRow = event.wiki_url || event.maps_url || event.toulky_url || images.length > 1;

  return (
    <div className={className}>
      {/* Náhled prvního obrázku (klik → lightbox s celou galerií) */}
      {firstImage && (
        <button
          type="button"
          onClick={openGallery}
          className="mt-2 inline-block overflow-hidden rounded border border-border bg-background shadow-sm transition-transform hover:scale-[1.02]"
          aria-label={images.length > 1 ? `Otevřít galerii (${images.length} obrázků)` : 'Zvětšit obrázek'}
          title={firstImage.caption ?? ''}
        >
          <img
            src={firstImage.url}
            alt={firstImage.alt ?? ''}
            className="block max-h-40 max-w-[200px] cursor-zoom-in object-contain"
            loading="lazy"
          />
        </button>
      )}

      {/* Řádek ikon */}
      {hasIconRow && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {event.wiki_url && (
            <IconBadge
              href={event.wiki_url}
              title="Wikipedia"
              Icon={Globe}
              color="text-blue-700 dark:text-blue-400"
            />
          )}
          {event.maps_url && (
            <IconBadge
              href={event.maps_url}
              title="Mapy.cz"
              Icon={MapIcon}
              color="text-green-700 dark:text-green-400"
            />
          )}
          {images.length > 1 && (
            <button
              type="button"
              onClick={openGallery}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background/60 p-1 text-accent transition-colors hover:bg-accent/10"
              title={`Galerie (${images.length} obrázků)`}
              aria-label={`Galerie (${images.length} obrázků)`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="ml-0.5 text-[10px] font-semibold">{images.length}</span>
            </button>
          )}
          {event.toulky_url && (
            <IconBadge
              href={event.toulky_url}
              title="Toulky českou minulostí (Český rozhlas)"
              Icon={Radio}
              color="text-purple-700 dark:text-purple-400"
            />
          )}
        </div>
      )}

      {lightbox && (
        <Lightbox
          open
          close={() => setLightbox(null)}
          slides={lightbox.map((url) => ({ src: url }))}
        />
      )}
    </div>
  );
}

interface IconBadgeProps {
  href: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function IconBadge({ href, title, Icon, color }: IconBadgeProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border bg-background/60 p-1 transition-colors hover:bg-accent/10',
        color,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </a>
  );
}
