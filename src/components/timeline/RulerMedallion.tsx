import type { CSSProperties } from 'react';

export interface RulerMeta {
  id: number;
  name: string;
  mono: string;
  years: string;
  hue: string;
}

interface Props {
  meta: RulerMeta;
  onEnter: (id: number) => void;
  onLeave: () => void;
  onActivate: (id: number) => void;
}

/**
 * Panovnický medailon usazený na páteři časové osy (na začátku vlády).
 * „Mince navlečená na niti času" — monogram + léta vlády. Najetí/fokus zvýrazní
 * všechny roky panovníka (řeší TimelineView imperativně), klik odscrolluje.
 */
export function RulerMedallion({ meta, onEnter, onLeave, onActivate }: Props) {
  return (
    <div
      className="tl-medallion"
      data-ruler-id={meta.id}
      style={{ '--reign-hue': meta.hue } as CSSProperties}
    >
      <button
        type="button"
        className="tl-medallion__btn"
        aria-label={`Panovník ${meta.name}${meta.years ? `, ${meta.years}` : ''}`}
        onMouseEnter={() => onEnter(meta.id)}
        onMouseLeave={onLeave}
        onFocus={() => onEnter(meta.id)}
        onBlur={onLeave}
        onClick={() => onActivate(meta.id)}
      >
        <span className="tl-medallion__ring" aria-hidden="true">
          <span className="tl-medallion__mono">{meta.mono}</span>
        </span>
        <span className="tl-medallion__cap">
          <span className="tl-medallion__name">{meta.name}</span>
          {meta.years && <span className="tl-medallion__years">{meta.years}</span>}
        </span>
      </button>
    </div>
  );
}
