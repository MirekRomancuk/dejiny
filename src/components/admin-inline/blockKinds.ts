import type { BlockKind, ExternalLinkIcon } from '@/types/domain';

/** Lidský název druhu komponenty (pro tlačítka a hlavičku draweru). */
export const BLOCK_LABELS: Record<BlockKind, string> = {
  popis_intro: 'úvod',
  popis_section: 'sekce',
  popis_map: 'mapa',
  legend_column: 'sloupec',
  legend_icon: 'ikona panovníka',
  legend_text_color: 'barva textu',
  legend_date_format: 'formát data',
  legend_external_link: 'odkaz',
  changelog: 'záznam',
};

export type FieldType = 'text' | 'textarea' | 'rich' | 'image' | 'iconSelect';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
}

/** Pole formuláře pro každý druh komponenty. */
export const BLOCK_FIELDS: Record<BlockKind, FieldDef[]> = {
  popis_intro: [{ key: 'bodyHtml', label: 'Text úvodu', type: 'rich' }],
  popis_section: [
    { key: 'heading', label: 'Nadpis sekce', type: 'text' },
    { key: 'bodyHtml', label: 'Text', type: 'rich' },
  ],
  popis_map: [
    { key: 'imageUrl', label: 'Obrázek mapy', type: 'image' },
    { key: 'mapUrl', label: 'Odkaz na interaktivní mapu', type: 'text', placeholder: 'https://www.google.com/maps/d/viewer?…' },
    { key: 'captionHtml', label: 'Popisek', type: 'rich' },
  ],
  legend_column: [
    { key: 'term', label: 'Termín (nadpis)', type: 'text', placeholder: 'např. ROK' },
    { key: 'descriptionHtml', label: 'Popis', type: 'rich' },
  ],
  legend_icon: [
    { key: 'imageUrl', label: 'První ikona (obrázek)', type: 'image' },
    { key: 'imageUrl2', label: 'Druhá ikona (volitelná)', type: 'image' },
    { key: 'descriptionHtml', label: 'Popis', type: 'rich' },
  ],
  legend_text_color: [
    { key: 'labelHtml', label: 'Ukázka (s barvou textu)', type: 'rich' },
    { key: 'descriptionHtml', label: 'Popis', type: 'rich' },
  ],
  legend_date_format: [
    { key: 'format', label: 'Formát', type: 'text', placeholder: 'např. 12.3. nebo okolo t.r.' },
    { key: 'description', label: 'Popis', type: 'textarea' },
  ],
  legend_external_link: [
    { key: 'icon', label: 'Ikona', type: 'iconSelect' },
    { key: 'descriptionHtml', label: 'Popis', type: 'rich' },
  ],
  changelog: [
    { key: 'date', label: 'Datum', type: 'text', placeholder: 'DD.MM.YYYY' },
    { key: 'description', label: 'Popis změny', type: 'textarea' },
  ],
};

export const EXTERNAL_LINK_ICONS: { value: ExternalLinkIcon; label: string }[] = [
  { value: 'wikipedia', label: 'Wikipedia' },
  { value: 'mapy', label: 'Mapy.cz' },
  { value: 'galerie', label: 'Galerie' },
  { value: 'radio', label: 'Toulky (rozhlas)' },
  { value: 'external', label: 'Obecný odkaz' },
];

/** Prázdná data pro nový blok daného druhu. */
export function emptyBlockData(kind: BlockKind): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of BLOCK_FIELDS[kind]) {
    out[f.key] = f.type === 'iconSelect' ? 'external' : '';
  }
  return out;
}
