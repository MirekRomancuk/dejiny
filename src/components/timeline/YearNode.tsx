import { memo, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Event, RowGroup, TypeCode } from '@/types/domain';
import { TYPE_LABELS } from '@/types/domain';
import { CellViewer } from '@/components/events/CellViewer';
import { EventLinks } from '@/components/events/EventLinks';
import { useAdminEdit } from '@/components/admin-inline/AdminEditProvider';
import { EditAffordance } from '@/components/admin-inline/EditAffordance';
import { useEventMutations } from '@/hooks/useEventMutations';
import {
  CAT_COLORS,
  CAT_SHORT,
  TIMELINE_CAT_ORDER,
  fmtYear,
  plainSnippet,
  pluralZapisy,
} from '@/lib/timeline/eras';

/** Událost bez zobrazitelného obsahu (žádný text ani obrázek). */
function contentEmpty(html: string | null | undefined): boolean {
  return !plainSnippet(html ?? '') && !/<(img|video|iframe|figure|svg)/i.test(html ?? '');
}

/**
 * Zobrazení roku: textové roky ("okolo r. 1200") ponecháme, ale holá čísla
 * (včetně záporných jako "-58") naformátujeme přes fmtYear → "58 př. n. l.".
 */
function displayYear(group: RowGroup): string {
  const t = group.year_text?.trim();
  if (t && !/^-?\d+$/.test(t)) return t;
  if (group.year_numeric != null) return fmtYear(group.year_numeric);
  return t ?? '';
}

interface CatEvents {
  code: TypeCode;
  events: Event[];
}

function groupedByCat(group: RowGroup): CatEvents[] {
  const out: CatEvents[] = [];
  for (const code of TIMELINE_CAT_ORDER) {
    const arr = group.cells[code];
    if (arr && arr.length) out.push({ code, events: arr });
  }
  return out;
}

function highlightWord(h: string | null): string {
  if (h === 'positive') return 'světlá chvíle';
  if (h === 'negative') return 'temná hodina';
  return '';
}

interface Props {
  group: RowGroup;
  side: 'left' | 'right';
  rulerNames?: string[];
}

function YearNodeInner({ group, side, rulerNames = [] }: Props) {
  const [open, setOpen] = useState(false);
  const opened = useRef(false);
  if (open) opened.current = true;

  const { isAdmin, openEditor } = useAdminEdit();
  const { deleteEvent } = useEventMutations();
  const yearPrefill = group.year_text ?? String(group.year_numeric ?? '');
  const rulerPrefill = group.ruler_ids.length === 1 ? { ruler_id: group.ruler_ids[0] } : {};

  // Reveal při scrollu řešíme lokálním stavem (ne imperativní třídou), aby se
  // nervala s React-řízeným className, který nese i `open`.
  const articleRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cats = groupedByCat(group);
  const allEvents = cats.flatMap((c) => c.events);
  const count = allEvents.length;
  const lead = allEvents[0];
  const highlight = allEvents.find((e) => e.highlight)?.highlight ?? undefined;
  const year = displayYear(group);
  const snippet = lead ? plainSnippet(lead.content_html) : '';
  const panelId = `tl-panel-${group.key}`;

  return (
    <article
      ref={articleRef}
      className={`tl-node tl-node--${side}${inView ? ' in' : ''}${open ? ' open' : ''}`}
      data-highlight={highlight}
    >
      <span className="tl-node__dot" aria-hidden="true" />
      <div className="tl-node__card">
        <button
          type="button"
          className="tl-node__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="tl-node__year">{year}</span>
          <span className="tl-node__head">
            <span className="tl-node__cats">
              {cats.map((c) => (
                <span key={c.code} className="tl-chip" style={{ '--tl-chip': CAT_COLORS[c.code] } as CSSProperties}>
                  {CAT_SHORT[c.code]}
                </span>
              ))}
            </span>
            <span className="tl-node__snippet">
              {snippet || <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Bez bližšího popisu</span>}
            </span>
            <span className="tl-node__count">
              {count > 1 ? `${count} ${pluralZapisy(count)} tohoto roku, rozbalte a čtěte` : 'rozbalte detail'}
            </span>
          </span>
          <ChevronDown className="tl-node__chev" aria-hidden="true" />
        </button>

        <div className="tl-node__panel" id={panelId} role="region" aria-label={`${year}, podrobnosti`}>
          <div className="tl-node__panel-inner">
            <div className="tl-panel-body">
              {opened.current && (
                <>
                  {rulerNames.length > 0 && (
                    <p className="tl-ev__ruler" style={{ margin: '0 0 0.6rem' }}>
                      za vlády: {rulerNames.join(' · ')}
                    </p>
                  )}
                  {cats.map((c) => (
                    <div className="tl-grp" key={c.code}>
                      <p className="tl-grp__label">
                        <span className="tl-chip" style={{ '--tl-chip': CAT_COLORS[c.code] } as CSSProperties}>
                          {CAT_SHORT[c.code]}
                        </span>
                        {TYPE_LABELS[c.code]}
                      </p>
                      {c.events.map((e) => (
                        <div className="tl-ev" key={e.id} style={{ '--tl-evc': CAT_COLORS[c.code] } as CSSProperties}>
                          {isAdmin && (
                            <EditAffordance
                              size="sm"
                              className="float-right ml-2"
                              editLabel="Upravit událost"
                              deleteLabel="Smazat událost"
                              confirmTitle="Smazat událost?"
                              confirmDescription="Tato událost bude trvale odstraněna z databáze."
                              onEdit={() => openEditor({ kind: 'event', mode: 'edit', event: e })}
                              onDelete={() => deleteEvent.mutate(e.id)}
                            />
                          )}
                          {(e.date_text || e.highlight) && (
                            <div className="tl-ev__head">
                              {e.date_text && <span className="tl-ev__date">{e.date_text}</span>}
                              {e.highlight && (
                                <span className={`tl-ev__flag tl-ev__flag--${e.highlight}`}>
                                  {highlightWord(e.highlight)}
                                </span>
                              )}
                            </div>
                          )}
                          {contentEmpty(e.content_html) ? (
                            <p className="tl-ev__summary" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                              (bez popisu)
                            </p>
                          ) : (
                            <CellViewer html={e.content_html} />
                          )}
                          {e.osobnost && <p className="tl-ev__ruler">{e.osobnost}</p>}
                          <EventLinks event={e} />
                        </div>
                      ))}
                    </div>
                  ))}
                  {isAdmin && (
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                      <EditAffordance
                        onAdd={() =>
                          openEditor({
                            kind: 'event',
                            mode: 'create',
                            prefill: { year_text: yearPrefill, ...rulerPrefill },
                          })
                        }
                        addLabel={`Přidat událost do roku ${year}`}
                      />
                      <span className="tl-ev__ruler" style={{ margin: 0 }}>
                        Přidat událost do roku {year}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Memoizováno: rodič (TimelineView) se překresluje při změně aktivní éry během
 * scrollu. Bez memo by se resetoval className uzlů a smazala se imperativně
 * přidaná třída `.in` (reveal animace) → problikávání. Props jsou stabilní.
 */
export const YearNode = memo(YearNodeInner);
