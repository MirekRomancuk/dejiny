import type { Database } from './database';

export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventType = Database['public']['Tables']['event_types']['Row'];
export type Ruler = Database['public']['Tables']['rulers']['Row'];
export type Page = Database['public']['Tables']['pages']['Row'];
export type CalendarEntry = Database['public']['Tables']['calendar_events']['Row'];
export type BibliographyEntry = Database['public']['Tables']['bibliography']['Row'];

/* ---- Strukturované komponenty stránek (page_blocks) ---- */

export type BlockKind =
  | 'popis_intro'
  | 'popis_section'
  | 'popis_map'
  | 'legend_column'
  | 'legend_icon'
  | 'legend_text_color'
  | 'legend_date_format'
  | 'legend_external_link'
  | 'changelog';

export type ExternalLinkIcon = 'wikipedia' | 'mapy' | 'galerie' | 'radio' | 'external';

/** Tvar `data` pro každý druh bloku. Všechna pole jsou textová (kvůli jednotné editaci). */
export interface BlockDataMap {
  popis_intro: { bodyHtml: string };
  popis_section: { heading: string; bodyHtml: string };
  popis_map: { imageUrl: string; mapUrl?: string; captionHtml: string };
  legend_column: { term: string; descriptionHtml: string };
  legend_icon: { imageUrl: string; imageUrl2?: string; descriptionHtml: string };
  legend_text_color: { labelHtml: string; descriptionHtml: string };
  legend_date_format: { format: string; description: string };
  legend_external_link: { icon: ExternalLinkIcon; descriptionHtml: string };
  changelog: { date: string; description: string };
}

/** Diskriminovaná unie podle `kind` — `block.data` se zúží podle druhu. */
export type PageBlock = {
  [K in BlockKind]: {
    id: number;
    page_slug: string;
    kind: K;
    position: number;
    data: BlockDataMap[K];
    created_at: string;
    updated_at: string;
  };
}[BlockKind];

/** Blok konkrétního druhu (např. `TypedBlock<'popis_section'>`). */
export type TypedBlock<K extends BlockKind> = Extract<PageBlock, { kind: K }>;

export type TypeCode =
  | 'foreign'
  | 'domestic'
  | 'arts'
  | 'person'
  | 'place'
  | 'citation'
  | 'other';

/**
 * Type codes shown in the public events table (column picker, filter, pivot).
 * 'citation' and 'other' exist in the DB schema but are not surfaced in the UI.
 */
export const TYPE_CODES: TypeCode[] = [
  'foreign',
  'domestic',
  'arts',
  'person',
  'place',
];

export const TYPE_LABELS: Record<TypeCode, string> = {
  foreign: 'Politika – Zahraničí',
  domestic: 'Politika – Domácí',
  arts: 'Vzdělanost a umění',
  citation: 'Vzdělanost – hospodářství – právo',
  person: 'Osobnosti',
  place: 'Místa',
  other: 'Ostatní',
};

export const TYPE_LABELS_SHORT: Record<TypeCode, string> = {
  foreign: 'Politika – Zahraničí',
  domestic: 'Politika – Domácí',
  arts: 'Vzdělanost a umění',
  citation: 'Vzdělanost – hosp. – právo',
  person: 'Osobnosti',
  place: 'Místa',
  other: 'Ostatní',
};

/** Columns shown in the public events table by default (matches reference site). */
export const DEFAULT_VISIBLE_TYPES: TypeCode[] = ['foreign', 'domestic', 'arts', 'person', 'place'];

export interface ImageRef {
  url: string;
  alt?: string;
  position?: 'left' | 'right' | 'center' | 'inline-left' | 'inline-right';
  size?: number | string;
  caption?: string;
}

export interface RowGroup {
  key: string;
  year_numeric: number | null;
  year_text: string | null;
  /** Všichni panovníci skutečně přiřazení událostem v daném roce. */
  ruler_ids: number[];
  cells: Partial<Record<TypeCode, Event[]>>;
}

export interface FilterState {
  yearFrom: number | null;
  yearTo: number | null;
  rulerId: number | null;
  typeCodes: TypeCode[];
  search: string;
}
