/* ============================================================================
   Sdílené stavební bloky noční scény (hvězdná pole, třpyt a meteory).
   Používá je jak TimelineNight (fixed hero přes celý viewport), tak
   NightBackdrop (odscrollovatelný „header band" na obsahových stránkách).
   Žádný React – jen čisté funkce nad předanými DOM uzly.
   ============================================================================ */

/** Deterministické pseudonáhodné číslo — stabilní hvězdné pole napříč re-buildy. */
export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgba(hex: string, al: number) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${al})`;
}

/** Parametry tří hvězdných vrstev (parallax hloubka + hustota + jas). */
export interface StarLayer {
  el: HTMLDivElement | null;
  depth: number;
  density: number;
  sizes: [number, number];
  ops: [number, number];
  gold: number;
}

/** Naplní box-shadow tří hvězdných vrstev pro dané pole (šířka × výška). */
export function buildStars(layers: StarLayer[], w: number, h: number) {
  layers.forEach((L, li) => {
    if (!L.el) return;
    const rng = mulberry32(1301 + li * 733);
    const n = Math.round((w * h) / L.density);
    const sh: string[] = [];
    for (let i = 0; i < n; i++) {
      const x = Math.round(rng() * w);
      const y = Math.round(Math.pow(rng(), 1.35) * h); // hustěji nahoře, řídne k horizontu
      const s = (L.sizes[0] + rng() * (L.sizes[1] - L.sizes[0])).toFixed(1);
      const o = (L.ops[0] + rng() * (L.ops[1] - L.ops[0])).toFixed(2);
      const col = rng() < L.gold ? '#E9C27E' : '#F5EAE0';
      sh.push(`${x}px ${y}px 0 ${s}px ${rgba(col, Number(o))}`);
    }
    L.el.style.boxShadow = sh.join(',');
  });
}

/** Jedna „dráha" padající hvězdy: odkud vzlétne (vw / vh) a pod jakým úhlem (deg). */
export interface MeteorLane {
  /** rozsah počáteční X pozice ve vw */
  mx: [number, number];
  /** rozsah počáteční Y pozice ve vh */
  my: [number, number];
  /** rozsah úhlu pruhu ve stupních */
  ang: [number, number];
}

export interface MeteorOptions {
  /** seed pro deterministický běh */
  seed: number;
  /** dráhy (různá místa na obloze); při každém výskytu se náhodně jedna zvolí */
  lanes: MeteorLane[];
  /** rozestup mezi výskyty [min, max] ms */
  gap: [number, number];
  /** zpoždění prvního výskytu [min, max] ms */
  firstDelay: [number, number];
  /** spouštět jen když je scéna dost vidět (opacita / hidden) */
  isActive: () => boolean;
  /** max. počet hvězd v jednom výskytu (default 1) — pro hustší „déšť“ */
  maxBurst?: number;
}

/**
 * Spustí náhodné padající hvězdy do daného containeru. Každý výskyt spawne
 * 1..maxBurst hvězd, každou z náhodně zvolené dráhy → přilétají z různých míst
 * oblohy a občas i několik naráz. Používá sdílené CSS `.night-meteor`
 * (@keyframes tlShoot). Vrací úklidovou funkci (zruší časovač i doletující).
 */
export function startMeteors(container: HTMLElement, opts: MeteorOptions): () => void {
  const rng = mulberry32(opts.seed);
  const pick = (r: [number, number]) => r[0] + rng() * (r[1] - r[0]);
  const burstMax = Math.max(1, Math.floor(opts.maxBurst ?? 1));
  const emit = () => {
    const lane = opts.lanes[Math.floor(rng() * opts.lanes.length)] ?? opts.lanes[0];
    const m = document.createElement('div');
    m.className = 'night-meteor';
    m.style.setProperty('--mx', `${pick(lane.mx).toFixed(1)}vw`);
    m.style.setProperty('--my', `${pick(lane.my).toFixed(1)}vh`);
    m.style.setProperty('--ang', `${pick(lane.ang).toFixed(1)}deg`);
    // náhodná doba letu → padají různě rychle (2,2–3,8 s), přirozeně nepravidelně
    m.style.setProperty('--md', `${(2.2 + rng() * 1.6).toFixed(2)}s`);
    container.appendChild(m);
    m.addEventListener('animationend', () => m.remove());
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const spawn = () => {
    if (opts.isActive() && opts.lanes.length) {
      const n = 1 + Math.floor(rng() * burstMax); // 1..burstMax
      for (let k = 0; k < n; k++) emit();
    }
    timer = setTimeout(spawn, pick(opts.gap));
  };
  timer = setTimeout(spawn, pick(opts.firstDelay));
  return () => {
    if (timer) clearTimeout(timer);
    container.querySelectorAll('.night-meteor').forEach((m) => m.remove());
  };
}

/** Vygeneruje třpytící se hvězdy do horní části pole (ne do siluety). */
export function buildTwinkles(tw: HTMLDivElement | null, w: number, h: number, seed = 778) {
  if (!tw) return;
  const rng = mulberry32(seed);
  const n = Math.max(10, Math.min(26, Math.round((w * h) / 90000)));
  let html = '';
  for (let i = 0; i < n; i++) {
    const x = Math.round(rng() * w);
    const y = Math.round(Math.pow(rng(), 1.5) * h * 0.62); // jen horní část → ne do siluety
    const sz = (1.6 + rng() * 1.8).toFixed(1);
    const gold = rng() < 0.28 ? ' gold' : '';
    const dur = (3.4 + rng() * 3.6).toFixed(2);
    const delay = (-rng() * 6).toFixed(2);
    html += `<span class="tl-tw${gold}" style="left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;--tw-dur:${dur}s;--tw-delay:${delay}s"></span>`;
  }
  tw.innerHTML = html; // jen generovaná čísla, žádná uživatelská data
}
