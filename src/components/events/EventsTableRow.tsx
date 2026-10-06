import { forwardRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Globe, Map as MapIcon, Image as ImageIcon, Radio } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatYearLabel } from '@/lib/year';
import { CellViewer } from './CellViewer';
import { useAdminEdit } from '@/components/admin-inline/AdminEditProvider';
import { EditAffordance } from '@/components/admin-inline/EditAffordance';
import { useEventMutations } from '@/hooks/useEventMutations';
import { useEventTypes } from '@/hooks/useEvents';
import type { RowGroup, TypeCode, Ruler, Event, ImageRef } from '@/types/domain';

interface Props {
  group: RowGroup;
  visibleTypes: TypeCode[];
  rulerMap: Map<number, Ruler>;
}

function imageRefsOf(ev: Event): ImageRef[] {
  if (!Array.isArray(ev.image_refs)) return [];
  return (ev.image_refs as unknown[]).filter(
    (r): r is ImageRef => typeof r === 'object' && r !== null && 'url' in r && typeof (r as ImageRef).url === 'string',
  );
}

export const EventsTableRow = forwardRef<HTMLTableRowElement, Props>(({ group, visibleTypes, rulerMap }, ref) => {
  const rulerNames = group.ruler_ids
    .map((id) => rulerMap.get(id)?.name)
    .filter((name): name is string => !!name);
  const [lightbox, setLightbox] = useState<string[] | null>(null);
  const { isAdmin, openEditor } = useAdminEdit();
  const { deleteEvent } = useEventMutations();
  const { data: typeMeta } = useEventTypes();
  const yearPrefill = group.year_text ?? String(group.year_numeric ?? '');
  const rulerPrefill = group.ruler_ids.length === 1 ? { ruler_id: group.ruler_ids[0] } : {};

  return (
    <>
      <tr
        ref={ref}
        className="group transition-colors hover:bg-card/60"
      >
        <td className="whitespace-nowrap border-b border-r border-border px-3 py-2 align-top font-heading text-base font-bold text-primary">
          {group.year_text ? formatYearLabel(group.year_text) : ''}
        </td>

        <td className="border-b border-r border-border px-3 py-2 align-top font-body text-sm">
          {rulerNames.map((name) => (
            <span key={name} className="block font-heading font-semibold text-foreground">
              {name}
            </span>
          ))}
        </td>

        {visibleTypes.map((code) => {
          const events = group.cells[code] ?? [];
          const typeId = typeMeta?.byCode.get(code);
          return (
            <td
              key={code}
              className="border-b border-r border-border px-3 py-2 align-top font-body text-sm leading-relaxed last:border-r-0"
            >
              {events.map((ev) => (
                <EventCellEntry
                  key={ev.id}
                  event={ev as Event}
                  images={imageRefsOf(ev as Event)}
                  onOpenLightbox={(srcs) => setLightbox(srcs)}
                  admin={
                    isAdmin
                      ? {
                          onEdit: () => openEditor({ kind: 'event', mode: 'edit', event: ev as Event }),
                          onDelete: () => deleteEvent.mutate(ev.id),
                        }
                      : null
                  }
                />
              ))}
              {isAdmin && (
                <EditAffordance
                  onAdd={() =>
                    openEditor({
                      kind: 'event',
                      mode: 'create',
                      prefill: {
                        year_text: yearPrefill,
                        ...rulerPrefill,
                        ...(typeId ? { type_id: typeId } : {}),
                      },
                    })
                  }
                  addLabel="Přidat událost do této buňky"
                  className="mt-1"
                />
              )}
            </td>
          );
        })}
      </tr>
      {lightbox && (
        <Lightbox
          open
          close={() => setLightbox(null)}
          slides={lightbox.map((src) => ({ src }))}
        />
      )}
    </>
  );
});
EventsTableRow.displayName = 'EventsTableRow';

interface EntryProps {
  event: Event;
  images: ImageRef[];
  onOpenLightbox: (srcs: string[]) => void;
  admin?: { onEdit: () => void; onDelete: () => void } | null;
}

function EventCellEntry({ event, images, onOpenLightbox, admin }: EntryProps) {
  const hasGallery = images.length > 0;
  const firstImage = images[0];
  const isPositive = event.highlight === 'positive';
  const isNegative = event.highlight === 'negative';
  const highlightWrap = isPositive
    ? 'border-l-[3px] border-green-600 bg-green-500/10 pl-2 dark:bg-green-500/15'
    : isNegative
    ? 'border-l-[3px] border-destructive bg-destructive/10 pl-2 dark:bg-destructive/15'
    : '';

  return (
    <div className={cn('mb-3 rounded-r-md py-1 last:mb-0', highlightWrap)}>
      {admin && (
        <EditAffordance
          size="sm"
          className="float-right ml-1"
          editLabel="Upravit událost"
          deleteLabel="Smazat událost"
          confirmTitle="Smazat událost?"
          confirmDescription="Tato událost bude trvale odstraněna z databáze."
          onEdit={admin.onEdit}
          onDelete={admin.onDelete}
        />
      )}
      {/* Main rich text */}
      <div>
        {event.date_text && (
          <span
            className={cn(
              'mr-1.5 font-heading text-sm font-bold',
              isNegative ? 'text-destructive' : 'text-primary',
            )}
          >
            {event.date_text}
          </span>
        )}
        <CellViewer
          html={event.content_html}
          className={cn(
            'inline',
            isPositive && '[&_*]:!text-green-800 dark:[&_*]:!text-green-300',
            isNegative && '[&_*]:!text-destructive dark:[&_*]:!text-red-300',
          )}
        />
      </div>

      {/* Osobnost short text (separate from main content) */}
      {event.osobnost && (
        <div className="mt-1 font-accent text-xs italic text-muted-foreground">
          {event.osobnost}
        </div>
      )}

      {/* Inline thumbnail (first image_refs) */}
      {firstImage && (
        <button
          type="button"
          onClick={() => onOpenLightbox(images.map((i) => i.url))}
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

      {/* Icons row */}
      {(event.wiki_url || event.maps_url || hasGallery || event.toulky_url) && (
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
          {hasGallery && images.length > 1 && (
            <button
              type="button"
              onClick={() => onOpenLightbox(images.map((i) => i.url))}
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
