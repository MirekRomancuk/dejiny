import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Era } from '@/lib/timeline/eras';

interface Props {
  eras: Era[];
  activeId: string | null;
  onJump: (id: string) => void;
}

/** Rejstřík ér: sticky svislý na desktopu, sbalitelná spodní lišta pod 1080px. */
export function EraRail({ eras, activeId, onJump }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className={`tl-rail${collapsed ? ' collapsed' : ''}`} aria-label="Přeskoky mezi érami">
      <button
        type="button"
        className="tl-rail__toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? 'Éry' : 'Skrýt'}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <p className="tl-rail__title">Kapitoly kroniky</p>
      <div className="tl-rail__list">
        {eras.map((era) => {
          const active = activeId === era.id;
          return (
            <button
              key={era.id}
              type="button"
              className={`tl-rail__item${active ? ' active' : ''}`}
              aria-current={active ? 'true' : undefined}
              aria-label={`Přejít na kapitolu ${era.name}, ${era.rangeLabel}`}
              onClick={() => onJump(era.id)}
            >
              <span className="tl-rail__tick" aria-hidden="true" />
              <span className="tl-rail__text">
                <span className="tl-rail__label">{era.name}</span>
                <span className="tl-rail__range">{era.rangeLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
