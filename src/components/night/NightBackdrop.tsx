import { useEffect, useRef } from 'react';
import {
  buildStars,
  buildTwinkles,
  startMeteors,
  type StarLayer,
} from './nightScene';
import { CastlePanorama } from './CastlePanorama';
import './night.css';

/**
 * Odscrollovatelný „header band" s noční scénou pro obsahové stránky (Popis,
 * Vysvětlivky, Kalendář, Verze) i pro tabulku Události. Leží ZA sdílenou
 * hlavičkou (HeroHeader) a případně za filtrem/přepínačem, v absolutním
 * pozicování ukotvený k vršku obsahového wrapperu.
 *
 * Výška bandu (--night-h) = reálná spodní hrana hlavičkové zóny. Měří se z
 * elementu označeného [data-night-anchor]; když chybí, spadne na <header>.
 * Díky position:absolute band ODSCROLLUJE spolu s hlavičkou → rozbřesk končí
 * přesně tam, kde začíná obsah, a obsah tak vždy leží na pergamenu.
 *
 * Řídí přebarvení chrome přes třídy na documentElement:
 *  - `night-active` po celou dobu montáže,
 *  - `night-on`, dokud je hlavička (a s ní band) dost viditelná nad viewportem.
 */
export function NightBackdrop() {
  const bandRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const cRef = useRef<HTMLDivElement>(null);
  const twRef = useRef<HTMLDivElement>(null);
  const hradRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const docEl = document.documentElement;

    docEl.classList.add('night-active');
    docEl.classList.add('night-band-active');
    docEl.classList.add('night-on');

    const layers: StarLayer[] = [
      { el: aRef.current, depth: 40, density: 6400, sizes: [0.8, 1.5], ops: [0.2, 0.5], gold: 0.07 },
      { el: bRef.current, depth: 90, density: 12500, sizes: [1.1, 2.0], ops: [0.3, 0.7], gold: 0.12 },
      { el: cRef.current, depth: 150, density: 26000, sizes: [1.5, 2.5], ops: [0.42, 0.9], gold: 0.2 },
    ];

    /** Spodní hrana hlavičkové zóny = výška noční zóny. */
    const anchorBottom = () => {
      const anchor =
        (document.querySelector('[data-night-anchor]') as HTMLElement | null) ??
        (document.querySelector('header.relative') as HTMLElement | null);
      if (!anchor) return Math.round(window.innerHeight * 0.42);
      const r = anchor.getBoundingClientRect();
      // absolutní pozice spodní hrany v rámci dokumentu (band je absolute od top:0)
      return Math.round(r.bottom + window.scrollY);
    };

    let bandH = anchorBottom();
    const applyHeight = () => {
      bandH = anchorBottom();
      band.style.setProperty('--night-h', `${bandH}px`);
    };

    const rebuild = () => {
      const w = window.innerWidth;
      // hvězdy kryjí celou výšku bandu + rezerva, ať se neslévají do siluety
      const h = Math.round(bandH + 120);
      buildStars(layers, w, h);
      buildTwinkles(twRef.current, w, h, 991);
    };

    applyHeight();
    rebuild();

    // --- fade + parallax + přepnutí chrome dle scrollu ---
    let ticking = false;
    let onNight = true;
    const applyScene = () => {
      const y = window.pageYOffset || docEl.scrollTop || 0;
      // band odscrolluje spolu s obsahem; scéna vybledne, jak mizí za horní hranou
      const fade = 1 - Math.max(0, Math.min(1, (y - bandH * 0.15) / (bandH * 0.72 || 1)));
      band.style.opacity = fade.toFixed(3);

      layers.forEach((L) => {
        if (L.el) L.el.style.transform = `translate3d(0,${(-(y / (bandH || 1)) * L.depth).toFixed(1)}px,0)`;
      });
      if (hradRef.current) {
        hradRef.current.style.transform = `translate3d(-50%,${((y / (bandH || 1)) * 14).toFixed(1)}px,0)`;
      }

      // chrome: dokud je scéna dost viditelná, světlé texty; jinak pergamen
      const shouldNight = fade > 0.4;
      if (shouldNight !== onNight) {
        onNight = shouldNight;
        docEl.classList.toggle('night-on', onNight);
      }

      band.hidden = fade <= 0.001;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        applyScene();
        ticking = false;
      });
    };
    const onResize = () => {
      applyHeight();
      rebuild();
      applyScene();
    };

    // Hlavička načítá erby (lazy PNG) a pod-titul — po jejich doměření se výška
    // hlavičkové zóny mění; sledujeme ji ResizeObserverem i po load obrázků.
    const ro = new ResizeObserver(() => {
      applyHeight();
      rebuild();
      applyScene();
    });
    const anchorEl =
      (document.querySelector('[data-night-anchor]') as HTMLElement | null) ??
      (document.querySelector('header.relative') as HTMLElement | null);
    if (anchorEl) ro.observe(anchorEl);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('load', onResize);
    applyScene();

    // --- padající hvězdy ze čtyř míst oblohy: jen dokud je scéna dost viditelná ---
    const stopMeteors = startMeteors(band, {
      seed: 51234,
      lanes: [
        { mx: [4, 26], my: [3, 16], ang: [200, 212] }, // daleko vlevo
        { mx: [28, 50], my: [5, 22], ang: [203, 215] }, // levý střed
        { mx: [50, 72], my: [4, 20], ang: [206, 218] }, // pravý střed
        { mx: [74, 94], my: [7, 28], ang: [208, 222] }, // daleko vpravo
      ],
      gap: [1500, 4200],
      firstDelay: [1200, 3000],
      maxBurst: 2,
      isActive: () =>
        !document.hidden && !band.hidden && Number(band.style.opacity || '1') > 0.55,
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onResize);
      ro.disconnect();
      stopMeteors?.();
      docEl.classList.remove('night-active');
      docEl.classList.remove('night-band-active');
      docEl.classList.remove('night-on');
    };
  }, []);

  return (
    <div className="night-band night-scene" ref={bandRef} aria-hidden="true">
      <div className="night-scene__grad" />
      <div className="night-scene__nebula night-scene__nebula--a" />
      <div className="night-scene__nebula night-scene__nebula--b" />
      <div className="night-scene__stars" ref={aRef} />
      <div className="night-scene__stars" ref={bRef} />
      <div className="night-scene__stars" ref={cRef} />
      <div className="night-scene__twinkles" ref={twRef} />
      <CastlePanorama ref={hradRef} />
    </div>
  );
}
