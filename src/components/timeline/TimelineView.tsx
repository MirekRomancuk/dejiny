import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAllEvents, useEventTypes, useRulers } from '@/hooks/useEvents';
import { useAdminEdit } from '@/components/admin-inline/AdminEditProvider';
import { useFilterState } from '@/hooks/useFilterState';
import { useDebounce } from '@/hooks/useDebounce';
import { filterGroups, groupEventsByYear, tokenizeSearch } from '@/lib/events/pivot';
import type { Ruler } from '@/types/domain';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import {
  TIMELINE_CAT_ORDER,
  bucketGroupsByEra,
  fmtYear,
  hasVisibleEvents,
  pluralEvents,
  pluralYears,
} from '@/lib/timeline/eras';
import { EraOrnament } from './EraOrnament';
import { EraRail } from './EraRail';
import { EraTrack } from './EraTrack';
import { RulersLegend } from './RulersLegend';
import { ScrollTopButton } from './ScrollTopButton';
import type { RulerMeta } from './RulerMedallion';
import { TimelineHero } from './TimelineHero';
import './timeline.css';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Heraldické odstíny přiřazované panovníkům v pořadí výskytu na ose. */
const RULER_HUES = ['#7c1d1d', '#b8860b', '#4b6b57', '#5a6b8c', '#8a5a2b', '#6b4a7c', '#2f6b6b', '#9c6b2f'];

/** Monogram panovníka: iniciála křestního jména + případná římská číslice. */
function rulerMonogram(name: string): string {
  const cleaned = name.replace(/^sv\.?\s+/i, '').trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const initial = (tokens[0]?.charAt(0) ?? '').toUpperCase();
  const romanToken = tokens.slice(1).find((t) => /^[IVX]+\.?$/.test(t));
  const roman = romanToken ? romanToken.replace(/\.$/, '') : null;
  const mono = roman ? `${initial} ${roman}` : initial;
  return mono.trim() || '?';
}

function rulerYears(years: readonly number[]): string {
  if (years.length === 0) return '';
  const from = Math.min(...years);
  const to = Math.max(...years);
  if (from !== to) return `${fmtYear(from)} – ${fmtYear(to)}`;
  if (Number.isFinite(from)) return fmtYear(from);
  return '';
}

export function TimelineView() {
  const { filters } = useFilterState();
  const debouncedSearch = useDebounce(filters.search, 250);
  const { data: events, isLoading } = useAllEvents();
  const { data: typeMeta } = useEventTypes();
  const { data: rulers } = useRulers();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeEra, setActiveEra] = useState<string | null>(null);
  const [activeRulerId, setActiveRulerId] = useState<number | null>(null);
  const { isAdmin, openEditor } = useAdminEdit();

  const rulerMap = useMemo(() => {
    const m = new Map<number, Ruler>();
    (rulers ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [rulers]);

  const buckets = useMemo(() => {
    if (!events || !typeMeta) return [];
    const allGroups = groupEventsByYear(events, typeMeta.byId);
    const filtered = filterGroups(allGroups, {
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      rulerId: filters.rulerId,
      searchTerms: tokenizeSearch(debouncedSearch),
    }).filter(hasVisibleEvents);
    return bucketGroupsByEra(filtered);
  }, [events, typeMeta, filters.yearFrom, filters.yearTo, filters.rulerId, debouncedSearch]);

  const { totalYears, totalEvents } = useMemo(() => {
    let y = 0;
    let e = 0;
    for (const b of buckets) {
      y += b.groups.length;
      for (const g of b.groups) {
        for (const code of TIMELINE_CAT_ORDER) e += g.cells[code]?.length ?? 0;
      }
    }
    return { totalYears: y, totalEvents: e };
  }, [buckets]);

  // Metadata panovníků přítomných ve výběru (pořadí = první výskyt na ose).
  const rulerMeta = useMemo(() => {
    const order: number[] = [];
    const seen = new Set<number>();
    const yearsByRuler = new Map<number, number[]>();
    for (const b of buckets) {
      for (const g of b.groups) {
        for (const rid of g.ruler_ids) {
          if (!seen.has(rid)) {
            seen.add(rid);
            order.push(rid);
          }
          if (g.year_numeric !== null) {
            const years = yearsByRuler.get(rid) ?? [];
            years.push(g.year_numeric);
            yearsByRuler.set(rid, years);
          }
        }
      }
    }
    const map = new Map<number, RulerMeta>();
    order.forEach((rid, i) => {
      const r = rulerMap.get(rid);
      if (!r) return;
      map.set(rid, {
        id: rid,
        name: r.name,
        mono: rulerMonogram(r.name),
        years: rulerYears(yearsByRuler.get(rid) ?? []),
        hue: RULER_HUES[i % RULER_HUES.length] ?? '#7c1d1d',
      });
    });
    return map;
  }, [buckets, rulerMap]);
  const rulersInView = useMemo(() => Array.from(rulerMeta.values()), [rulerMeta]);

  // Zvýraznění vlády (najetí/fokus na medailon či legendu) — imperativně, bez
  // překreslení tisíců uzlů. Přidá `.tl-focus` na stage a `.is-hl` na shodnou vládu.
  const setFocus = useCallback((rid: number | null) => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelector('.tl-stage')?.classList.toggle('tl-focus', rid != null);
    root.querySelectorAll<HTMLElement>('.tl-reign').forEach((el) => {
      el.classList.toggle('is-hl', rid != null && el.dataset.rulerId === String(rid));
    });
    root.querySelectorAll<HTMLElement>('.tl-rulers__item').forEach((el) => {
      el.classList.toggle('is-hl', rid != null && el.dataset.rulerId === String(rid));
    });
  }, []);
  const clearFocus = useCallback(() => setFocus(null), [setFocus]);

  const jumpRuler = useCallback((rid: number) => {
    const el = rootRef.current?.querySelector<HTMLElement>(`.tl-medallion[data-ruler-id="${rid}"]`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    window.setTimeout(() => el.classList.remove('pulse'), 1200);
  }, []);

  // Reset zvýraznění při každé změně výběru (buckets) — jinak by odmontování
  // najetého medailonu nechalo `.tl-focus` viset a ztmavilo celou osu.
  useEffect(() => {
    clearFocus();
    setActiveRulerId(null);
  }, [buckets, clearFocus]);

  // Scroll-driven: reveal uzlů, kreslení páteře, parallax ornamentů, aktivní éra.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || buckets.length === 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // aktivní éra (běží i při reduced-motion — je to navigace, ne animace)
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.tl-era'));
    const visible = new Map<string, number>();
    const eraObs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const id = (en.target as HTMLElement).dataset.era ?? '';
          visible.set(id, en.isIntersecting ? en.intersectionRatio : 0);
        }
        let best = -1;
        let bestId: string | null = null;
        visible.forEach((ratio, id) => {
          if (ratio > best) {
            best = ratio;
            bestId = id;
          }
        });
        setActiveEra((prev) => (prev === bestId ? prev : bestId));
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.75], rootMargin: '-15% 0px -55% 0px' },
    );
    sections.forEach((s) => eraObs.observe(s));

    // aktivní panovník — vláda, jejíž blok právě protíná pomyslnou čtecí linku
    // (~46 % výšky okna, stejně jako kreslení páteře výše). Tenké „čtecí pásmo"
    // je robustnější než poměr viditelnosti, protože vlády mají velmi různou
    // výšku. Běží i při reduced-motion (je to navigace, ne animace).
    const reigns = Array.from(root.querySelectorAll<HTMLElement>('.tl-reign'));
    const reignActive = new Set<HTMLElement>();
    const reignObs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const el = en.target as HTMLElement;
          if (en.isIntersecting) reignActive.add(el);
          else reignActive.delete(el);
        }
        // Nejvýše ležící protínající vláda vyhrává (vlády jsou svisle za sebou).
        let bestTop = Infinity;
        let bestId: number | null = null;
        reignActive.forEach((el) => {
          const top = el.getBoundingClientRect().top;
          if (top < bestTop) {
            bestTop = top;
            const rid = Number(el.dataset.rulerId);
            bestId = Number.isFinite(rid) ? rid : null;
          }
        });
        setActiveRulerId((prev) => (prev === bestId ? prev : bestId));
      },
      { threshold: 0, rootMargin: '-46% 0px -54% 0px' },
    );
    reigns.forEach((el) => reignObs.observe(el));

    let onScroll: (() => void) | null = null;

    if (!reduce) {
      const tracks = Array.from(root.querySelectorAll<HTMLElement>('.tl-track'));
      const orns = Array.from(root.querySelectorAll<HTMLElement>('.tl-era__ornament'));
      let ticking = false;
      const draw = () => {
        const readLine = window.innerHeight * 0.46;
        for (const tr of tracks) {
          const r = tr.getBoundingClientRect();
          let p = (readLine - r.top) / (r.height || 1);
          p = Math.max(0, Math.min(1, p));
          tr.querySelectorAll<HTMLElement>('.tl-spine__line').forEach((l) => {
            l.style.transform = `scaleY(${p})`;
          });
        }
        const vh = window.innerHeight;
        for (const o of orns) {
          const r = o.getBoundingClientRect();
          const off = (r.top + r.height / 2 - vh / 2) / vh;
          o.style.transform = `translateY(${(off * -16).toFixed(2)}px)`;
        }
      };
      onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          draw();
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      draw();
    }

    return () => {
      eraObs.disconnect();
      reignObs.disconnect();
      if (onScroll) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };
  }, [buckets]);

  const onJump = (eraId: string) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(`tl-era-${eraId}`)
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const handleContinue = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    contentRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="tl" ref={rootRef}>
      <TimelineHero onContinue={handleContinue} />
      <div ref={contentRef}>
        {isLoading ? (
          <Loading label="Načítám kroniku…" />
        ) : buckets.length === 0 ? (
          <EmptyState
            title="Žádné události neodpovídají filtrům"
            description="Zkuste rozšířit rozsah let nebo vymazat filtry."
          />
        ) : (
          <>
      <div className="tl-intro">
        <span className="tl-intro__count">
          {totalYears} {pluralYears(totalYears)} · {totalEvents} {pluralEvents(totalEvents)}
        </span>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => openEditor({ kind: 'event', mode: 'create' })}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-2.5 py-1 font-heading text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nová událost
          </button>
        ) : (
          <span className="tl-intro__hint">Klikněte na rok a čtěte, co se stalo</span>
        )}
      </div>

      <div className="tl-chronicle">
        <RulersLegend
          rulers={rulersInView}
          activeId={activeRulerId}
          onEnter={setFocus}
          onLeave={clearFocus}
          onActivate={jumpRuler}
        />
        <main className="tl-stage">
          {buckets.map((bucket, eraIdx) => (
            <section
              key={bucket.era.id}
              id={`tl-era-${bucket.era.id}`}
              className="tl-era"
              data-era={bucket.era.id}
              aria-labelledby={`tl-eratitle-${bucket.era.id}`}
            >
              <div className="tl-era__head">
                <EraOrnament index={eraIdx} />
                <p className="tl-era__index">Kapitola {ROMAN[eraIdx + 1] ?? eraIdx + 1}</p>
                <h2 className="tl-era__name" id={`tl-eratitle-${bucket.era.id}`}>
                  {bucket.era.name}
                </h2>
                <div className="tl-era__flourish" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
                  </svg>
                </div>
                <p className="tl-era__meta">
                  <span className="tl-years">{bucket.era.rangeLabel}</span>
                </p>
              </div>

              <EraTrack
                groups={bucket.groups}
                rulerMap={rulerMap}
                rulerMeta={rulerMeta}
                onRulerEnter={setFocus}
                onRulerLeave={clearFocus}
                onRulerActivate={jumpRuler}
              />
            </section>
          ))}
        </main>

        <EraRail eras={buckets.map((b) => b.era)} activeId={activeEra} onJump={onJump} />
      </div>
          </>
        )}
      </div>
      <ScrollTopButton />
    </div>
  );
}
