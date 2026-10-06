import { useEffect, useMemo, useRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { sanitizeHtml } from '@/lib/richtext';
import { hydrateIcons } from '@/lib/iconHydrator';
import { cn } from '@/lib/cn';

interface Props {
  html: string;
  className?: string;
}

export function CellViewer({ html, className }: Props) {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);
  const ref = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Replace <i data-icon> placeholders with real SVG
    hydrateIcons(el);

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && target.dataset.lightbox === 'true') {
        e.preventDefault();
        setLightboxImage((target as HTMLImageElement).src);
      }
    }
    el.addEventListener('click', onClick);
    // Force links to open in new tab
    el.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noreferrer noopener');
    });
    return () => el.removeEventListener('click', onClick);
  }, [sanitized]);

  return (
    <>
      <div
        ref={ref}
        className={cn('cell-rich text-sm leading-relaxed', className)}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      {lightboxImage && (
        <Lightbox
          open={true}
          close={() => setLightboxImage(null)}
          slides={[{ src: lightboxImage }]}
        />
      )}
    </>
  );
}
