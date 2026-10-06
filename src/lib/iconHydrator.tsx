import { ICON_SVGS } from './icons.generated';

/**
 * Walk a DOM tree and replace `<i class="lucide-icon" data-icon="X" data-size="N">` with the actual SVG
 * from the pre-generated static map. Keeps the public bundle small (no lucide-react in production).
 */
export function hydrateIcons(root: HTMLElement | null) {
  if (!root) return;
  const targets = root.querySelectorAll<HTMLElement>('i.lucide-icon[data-icon]');
  targets.forEach((el) => {
    const name = el.dataset.icon ?? '';
    const size = parseInt(el.dataset.size ?? '16', 10);
    if (!name) return;
    const svgBase = ICON_SVGS[name];
    if (!svgBase) return;
    // Scale the rendered SVG by overriding width/height
    const svg = svgBase.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`);
    el.innerHTML = svg;
  });
}
