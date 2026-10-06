import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

const PANORAMA_SRC = '/images/hradcany-panorama.webp';

test('shared night panorama renders the optimized Prague Castle silhouette', async () => {
  let componentModule: typeof import('./night/CastlePanorama') | null = null;
  try {
    componentModule = await import('./night/CastlePanorama');
  } catch {
    // The assertion below records the intended red state before the component exists.
  }

  assert.ok(componentModule, 'CastlePanorama component must exist');
  const html = renderToStaticMarkup(<componentModule.CastlePanorama />);

  assert.match(
    html,
    new RegExp(`<img[^>]+class="night-scene__hradcany"[^>]+src="${PANORAMA_SRC}"`),
  );
});
