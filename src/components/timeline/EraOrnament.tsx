/**
 * Decentní heraldické ornamenty ér (iluminovaná kronika). Statické SVG, bez dat,
 * proto je bezpečné je vložit přes dangerouslySetInnerHTML. Barvu nese currentColor.
 */
const ORNAMENTS: string[] = [
  // 0 pravěk — spirála / venuše
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 30h70" stroke-linecap="round"/><path d="M150 30h70" stroke-linecap="round"/><path d="M110 12c9 0 16 8 16 18s-7 18-16 18-16-8-16-18c0-6 3-11 8-14" fill="none"/><circle cx="110" cy="30" r="4" fill="currentColor" stroke="none"/><path d="M96 46c4-4 24-4 28 0"/></svg>',
  // 1 Velká Morava — kříž s kruhem
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 30h84" stroke-linecap="round"/><path d="M136 30h84" stroke-linecap="round"/><circle cx="110" cy="30" r="15"/><path d="M110 12v36M95 30h30" stroke-linecap="round"/></svg>',
  // 2 Přemyslovci — plamenná orlice
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 30h74" stroke-linecap="round"/><path d="M146 30h74" stroke-linecap="round"/><path d="M96 40c6-14 12-20 14-24 2 4 8 10 14 24" fill="none" stroke-linejoin="round"/><path d="M100 34c4-2 6-2 10-2 4 0 6 0 10 2M104 28c3-1 4-1 6-1s3 0 6 1" stroke-linecap="round"/></svg>',
  // 3 Lucemburkové — koruna
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 34h78" stroke-linecap="round"/><path d="M142 34h78" stroke-linecap="round"/><path d="M92 44 L96 22 L104 32 L110 16 L116 32 L124 22 L128 44 Z" fill="currentColor" fill-opacity="0.14" stroke-linejoin="round"/><circle cx="96" cy="20" r="2.4" fill="currentColor" stroke="none"/><circle cx="110" cy="13" r="2.8" fill="currentColor" stroke="none"/><circle cx="124" cy="20" r="2.4" fill="currentColor" stroke="none"/></svg>',
  // 4 Poděbradové a Jagellonci — kalich
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 30h86" stroke-linecap="round"/><path d="M134 30h86" stroke-linecap="round"/><path d="M100 16h20l-3 12a7 7 0 0 1-14 0z" fill="currentColor" fill-opacity="0.12" stroke-linejoin="round"/><path d="M110 34v8M104 44h12" stroke-linecap="round"/></svg>',
  // 5 Habsburkové — dvojhlavá symetrie
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 30h80" stroke-linecap="round"/><path d="M140 30h80" stroke-linecap="round"/><circle cx="102" cy="26" r="5"/><circle cx="118" cy="26" r="5"/><path d="M102 31c-2 6-6 9-6 9M118 31c2 6 6 9 6 9M110 26v14" stroke-linecap="round"/></svg>',
  // 6 Císařství — řádová hvězda
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 30h84" stroke-linecap="round"/><path d="M136 30h84" stroke-linecap="round"/><path d="M110 14l4 12 12 0-10 8 4 12-10-8-10 8 4-12-10-8 12 0z" fill="currentColor" fill-opacity="0.12" stroke-linejoin="round"/></svg>',
  // 7 Republika — lipová ratolest
  '<svg viewBox="0 0 220 60" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 30h82" stroke-linecap="round"/><path d="M138 30h82" stroke-linecap="round"/><path d="M110 44V18" stroke-linecap="round"/><path d="M110 24c-6-2-9-6-9-6 4 0 8 2 9 4M110 24c6-2 9-6 9-6-4 0-8 2-9 4M110 32c-6-2-9-6-9-6 4 0 8 2 9 4M110 32c6-2 9-6 9-6-4 0-8 2-9 4" stroke-linecap="round"/></svg>',
];

export function EraOrnament({ index }: { index: number }) {
  const svg = ORNAMENTS[index] ?? ORNAMENTS[ORNAMENTS.length - 1];
  return <span className="tl-era__ornament" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
