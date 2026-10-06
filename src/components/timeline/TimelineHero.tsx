import { useEffect, useRef } from 'react';

interface Props {
  /** Klik na „Pokračovat" — plynulý scroll na začátek kroniky. */
  onContinue: () => void;
}

/**
 * Obsah nočního hera časové osy (koruna, kicker, titul, podtitul + „Pokračovat").
 * Sekce je PRŮHLEDNÁ — vizuál (hvězdy, silueta, rozbřesk) dělá pevné pozadí
 * v komponentě TimelineNight, které leží za veškerým chrome i za tímto herem.
 * Obsah je zarovnaný nahoru (hned pod lištu), „Pokračovat" je u spodního okraje.
 */
export function TimelineHero({ onContinue }: Props) {
  const heroRef = useRef<HTMLElement>(null);

  // Dopočítá výšku hera tak, aby vyplnil zbytek viewportu pod horní lištou
  // → „Pokračovat" dosedne na spodní okraj obrazovky.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const fit = () => {
      if (window.scrollY > 80) return; // dopočítávej jen když jsme nahoře
      const top = el.getBoundingClientRect().top; // = výška lišty nad herem
      el.style.minHeight = `${Math.max(460, window.innerHeight - top)}px`;
    };
    fit();
    const t = window.setTimeout(fit, 400); // dorovnání po načtení fontů/erbů
    window.addEventListener('resize', fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', fit);
    };
  }, []);

  return (
    <section className="tl-hero" ref={heroRef} aria-label="Časová osa">
      <div className="tl-hero__content">
        <svg className="tl-hero__crown" viewBox="0 0 120 90" fill="none" aria-hidden="true">
          <path
            d="M12 74 L18 30 L38 52 L60 18 L82 52 L102 30 L108 74 Z"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="26" r="6" fill="currentColor" />
          <circle cx="60" cy="12" r="7" fill="currentColor" />
          <circle cx="102" cy="26" r="6" fill="currentColor" />
          <rect x="10" y="74" width="100" height="9" rx="3" fill="currentColor" fillOpacity="0.85" />
          <path d="M60 34 l4 8 l-4 8 l-4 -8 z" fill="#D64545" />
        </svg>
        <p className="tl-hero__kicker">Iluminovaná kronika pod hvězdami</p>
        <h1 className="tl-hero__title">
          <span>Časová</span> <span className="accent">osa</span>
        </h1>
        <div className="tl-hero__rule" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
          </svg>
        </div>
        <p className="tl-hero__sub">
          Od věstonické venuše po Evropskou unii. Příběh země, jejích panovníků a osudových let.
        </p>
      </div>

      <button type="button" className="tl-hero__scroll" onClick={onContinue}>
        <span>Pokračovat</span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </section>
  );
}
