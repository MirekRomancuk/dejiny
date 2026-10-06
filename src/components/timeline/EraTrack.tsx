import { Fragment, type CSSProperties } from 'react';
import type { RowGroup, Ruler } from '@/types/domain';
import { YearNode } from './YearNode';
import { RulerMedallion, type RulerMeta } from './RulerMedallion';

interface Props {
  groups: RowGroup[];
  rulerMap: Map<number, Ruler>;
  rulerMeta: Map<number, RulerMeta>;
  onRulerEnter: (id: number) => void;
  onRulerLeave: () => void;
  onRulerActivate: (id: number) => void;
}

interface Segment {
  rulerId: number | null;
  items: { group: RowGroup; side: 'left' | 'right' }[];
}

/**
 * Páteř jedné kapitoly (éry) s uzly roků. Po sobě jdoucí roky téhož panovníka
 * jsou zabalené do „vlády" (`.tl-reign`) s medailonem na páteři a jemným
 * barevným rozpětím; roky bez panovníka jsou vykreslené samostatně. Střídání
 * stran (vlevo/vpravo) běží průběžně přes celou páteř bez ohledu na vlády.
 */
export function EraTrack({ groups, rulerMap, rulerMeta, onRulerEnter, onRulerLeave, onRulerActivate }: Props) {
  const segments: Segment[] = [];
  groups.forEach((group, i) => {
    const rid = group.ruler_ids[0] ?? null;
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const last = segments[segments.length - 1];
    if (last && last.rulerId === rid) last.items.push({ group, side });
    else segments.push({ rulerId: rid, items: [{ group, side }] });
  });

  return (
    <div className="tl-track">
      <div className="tl-spine" aria-hidden="true">
        <span className="tl-spine__line tl-spine__line--wine" />
        <span className="tl-spine__line tl-spine__line--gold" />
      </div>

      {segments.map((seg, si) => {
        const meta = seg.rulerId != null ? rulerMeta.get(seg.rulerId) ?? null : null;
        if (meta) {
          return (
            <div
              key={`reign-${si}`}
              className="tl-reign"
              data-ruler-id={meta.id}
              style={{ '--reign-hue': meta.hue } as CSSProperties}
            >
              <RulerMedallion
                meta={meta}
                onEnter={onRulerEnter}
                onLeave={onRulerLeave}
                onActivate={onRulerActivate}
              />
              {seg.items.map(({ group, side }) => (
                <YearNode
                  key={group.key}
                  group={group}
                  side={side}
                  rulerNames={group.ruler_ids
                    .map((id) => rulerMap.get(id)?.name)
                    .filter((name): name is string => !!name)}
                />
              ))}
            </div>
          );
        }
        return (
          <Fragment key={`bare-${si}`}>
            {seg.items.map(({ group, side }) => (
              <YearNode
                key={group.key}
                group={group}
                side={side}
                rulerNames={group.ruler_ids
                  .map((id) => rulerMap.get(id)?.name)
                  .filter((name): name is string => !!name)}
              />
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
