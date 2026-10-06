import { useState, type CSSProperties } from 'react';
import { Crown, ChevronDown } from 'lucide-react';
import type { RulerMeta } from './RulerMedallion';

interface Props {
  rulers: RulerMeta[];
  /** Panovník, jehož vládu čtenář právě prohlíží na ose (scroll-driven). */
  activeId: number | null;
  onEnter: (id: number) => void;
  onLeave: () => void;
  onActivate: (id: number) => void;
}

/**
 * Legenda panovníků v aktuálním výběru — plovoucí boční panel vlevo (fixní,
 * sbalitelný; na užších displejích ukotvený dole). Najetí na položku zvýrazní
 * roky daného panovníka na ose (a naopak), klik odscrolluje na jeho medailon.
 */
export function RulersLegend({ rulers, activeId, onEnter, onLeave, onActivate }: Props) {
  const [open, setOpen] = useState(true);
  if (rulers.length === 0) return null;

  return (
    <section className={`tl-rulers${open ? '' : ' collapsed'}`} aria-label="Panovníci na ose">
      <button
        type="button"
        className="tl-rulers__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Crown className="tl-rulers__crown" aria-hidden="true" />
        Panovníci
        <span className="tl-rulers__count">{rulers.length}</span>
        <ChevronDown className="tl-rulers__chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="tl-rulers__list">
          {rulers.map((r) => {
            const active = activeId === r.id;
            return (
            <button
              key={r.id}
              type="button"
              className={`tl-rulers__item${active ? ' active' : ''}`}
              aria-current={active ? 'true' : undefined}
              data-ruler-id={r.id}
              style={{ '--reign-hue': r.hue } as CSSProperties}
              onMouseEnter={() => onEnter(r.id)}
              onMouseLeave={onLeave}
              onFocus={() => onEnter(r.id)}
              onBlur={onLeave}
              onClick={() => onActivate(r.id)}
            >
              <span className="tl-rulers__dot" aria-hidden="true" />
              <span className="tl-rulers__label">
                <span className="tl-rulers__name">{r.name}</span>
                {r.years && <span className="tl-rulers__years">{r.years}</span>}
              </span>
            </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
