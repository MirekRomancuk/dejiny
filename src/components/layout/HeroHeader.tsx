import { NavLink } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';
import { LockLogin } from '@/components/admin-inline/LockLogin';

const STORAGE_BASE = 'https://hujighhlnmuokjvtveru.supabase.co/storage/v1/object/public/page-content/header';

const NAV_ITEMS = [
  { to: '/', label: 'Události', end: true },
  { to: '/popis', label: 'Popis' },
  { to: '/vysvetlivky', label: 'Vysvětlivky' },
  { to: '/kalendar', label: 'Kalendář' },
  { to: '/verze', label: 'Verze' },
];

interface Props {
  /** Inner page title shown below the nav (e.g. "KALENDÁŘ"). When omitted, hero is just title + shields + nav. */
  pageTitle?: string;
  pageSubtitle?: string;
  /**
   * Když true, tato hlavička sama slouží jako kotva pro výšku noční zóny
   * (NightBackdrop měří [data-night-anchor]). Vypni na stránkách, kde má noc
   * sahat i za obsah pod hlavičkou (Události → filtr + přepínač si zvolí kotvu
   * níž vlastním obalem).
   */
  isNightAnchor?: boolean;
}

export function HeroHeader({ pageTitle, pageSubtitle, isNightAnchor = true }: Props) {
  const shields = [
    `${STORAGE_BASE}/znak_1.png`,
    `${STORAGE_BASE}/znak_2.png`,
    `${STORAGE_BASE}/znak_3.png`,
    `${STORAGE_BASE}/znak_4.png`,
    `${STORAGE_BASE}/znak_5.png`,
  ];

  return (
    <header className="relative w-full" {...(isNightAnchor ? { 'data-night-anchor': '' } : {})}>
      {/* Zámeček (přihlášení admina) + přepínač motivu, vpravo nahoře */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
        <LockLogin />
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-2 pt-8 md:pt-12">
        {/* Tiny crown icon above title */}
        <div className="mb-2 flex justify-center">
          <Crown className="h-5 w-5 text-accent" strokeWidth={1.5} />
        </div>

        {/* Big title */}
        <h1 className="text-center font-heading text-2xl font-bold tracking-wider text-foreground md:text-4xl">
          DĚJINY KORUNY ČESKÉ
        </h1>

        {/* 5 shields */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 px-4 md:gap-12">
          {shields.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Znak ${i + 1}`}
              className="h-16 w-auto object-contain md:h-28"
              loading="lazy"
            />
          ))}
        </div>

        {/* Nav menu under shields */}
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 md:gap-x-12">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative font-heading text-sm font-semibold uppercase tracking-[0.15em] transition-colors md:text-base',
                  'after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:transition-opacity',
                  isActive
                    ? 'text-primary after:opacity-100'
                    : 'text-muted-foreground hover:text-foreground after:opacity-0',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Separator line under nav */}
      <div className="mt-6 border-b border-border/60" />

      {/* Page title below nav (optional) */}
      {pageTitle && (
        <div className="night-subtitle relative mx-auto max-w-[1400px] px-4 pb-4 pt-6">
          <h2 className="relative z-[1] text-center font-heading text-3xl font-bold uppercase tracking-wider text-primary md:text-4xl">
            {pageTitle}
          </h2>
          {pageSubtitle && (
            <p className="relative z-[1] mt-1 text-center font-accent text-sm text-muted-foreground md:text-base">
              {pageSubtitle}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
