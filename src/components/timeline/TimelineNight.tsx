import { useEffect, useRef } from 'react';
import {
  buildStars,
  buildTwinkles,
  startMeteors,
  type StarLayer,
} from '@/components/night/nightScene';
import { CastlePanorama } from '@/components/night/CastlePanorama';
import '@/components/night/night.css';

/**
 * Pevné (fixed) noční pozadí časové osy: leží ZA veškerým „chrome" (hlavička,
 * filtr, přepínač) i za hero obsahem, přes celý viewport. Jak čtenář scrolluje,
 * noc plynule vybledne do pergamenu a horní chrome se přepne z noční palety zpět.
 *
 * Sdílí stavební bloky scény (nightScene.ts) i mechanismus přebarvení chrome
 * (třídy night-active / night-on na documentElement) s NightBackdrop; liší se
 * jen pozicováním: TimelineNight je fixed přes celý viewport (vysoké hero osy),
 * NightBackdrop je odscrollovatelný header band (krátká hlavička ostatních
 * stránek). Obě definice tříd žijí v night.css.
 */
export function TimelineNight() {
  const rootRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const cRef = useRef<HTMLDivElement>(null);
  const twRef = useRef<HTMLDivElement>(null);
  const hradRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const docEl = document.documentElement;

    // scéna běží → aktivuj noční chrome režim (na start jsme nahoře, tedy „on")
    docEl.classList.add('night-active');
    docEl.classList.add('night-on');

    const layers: StarLayer[] = [
      { el: aRef.current, depth: 70, density: 6400, sizes: [0.8, 1.5], ops: [0.2, 0.5], gold: 0.07 },
      { el: bRef.current, depth: 150, density: 12500, sizes: [1.1, 2.0], ops: [0.3, 0.7], gold: 0.12 },
      { el: cRef.current, depth: 250, density: 26000, sizes: [1.5, 2.5], ops: [0.42, 0.9], gold: 0.2 },
    ];
    // Pole hvězd kryje horní část stránky (výška viewportu + rezerva).
    const field = () => ({
      w: window.innerWidth,
      h: Math.round(window.innerHeight * 1.05 + 160),
    });

    const rebuild = () => {
      const { w, h } = field();
      buildStars(layers, w, h);
      buildTwinkles(twRef.current, w, h, 778);
    };

    rebuild();

    // --- fade scény + parallax + přepnutí chrome dle scrollu ---
    let ticking = false;
    let onNight = true;
    const applyScene = () => {
      const y = window.pageYOffset || docEl.scrollTop || 0;
      const h = window.innerHeight || 1;
      // scéna plně viditelná na vršku, vybledne přibližně po jednom viewportu
      const fade = 1 - Math.max(0, Math.min(1, (y - h * 0.15) / (h * 0.72)));
      root.style.opacity = fade.toFixed(3);

      layers.forEach((L) => {
        if (L.el) L.el.style.transform = `translate3d(0,${(-(y / h) * L.depth).toFixed(1)}px,0)`;
      });
      if (hradRef.current) {
        // silueta má vlastní, pomalejší parallax → horizont získává hloubku
        hradRef.current.style.transform = `translate3d(-50%,${((y / h) * 26).toFixed(1)}px,0)`;
      }

      // chrome: dokud je scéna dost viditelná, světlé texty; jinak pergamen
      const shouldNight = fade > 0.4;
      if (shouldNight !== onNight) {
        onNight = shouldNight;
        docEl.classList.toggle('night-on', onNight);
      }

      // úplně mimo scénu → přestat kreslit (výkon)
      root.hidden = fade <= 0.001;
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
      rebuild();
      applyScene();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    applyScene();

    // --- padající hvězdy ze čtyř míst oblohy: jen dokud je scéna dost viditelná ---
    const stopMeteors = startMeteors(root, {
      seed: 90210,
      lanes: [
        { mx: [4, 26], my: [4, 20], ang: [200, 212] }, // daleko vlevo
        { mx: [28, 50], my: [6, 28], ang: [203, 215] }, // levý střed
        { mx: [50, 72], my: [5, 26], ang: [206, 218] }, // pravý střed
        { mx: [74, 94], my: [9, 34], ang: [208, 222] }, // daleko vpravo
      ],
      gap: [1500, 4200],
      firstDelay: [1000, 2600],
      maxBurst: 2,
      isActive: () =>
        !document.hidden && !root.hidden && Number(root.style.opacity || '1') > 0.55,
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      stopMeteors?.();
      // úklid: opustili jsme časovou osu → chrome zpět na pergamen
      docEl.classList.remove('night-active');
      docEl.classList.remove('night-on');
    };
  }, []);

  return (
    <div className="tl-night night-scene" ref={rootRef} aria-hidden="true">
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
