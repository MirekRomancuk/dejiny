import assert from 'node:assert/strict';
import test from 'node:test';

test('administrace odvodí panovníky jen z událostí zadaného roku', async () => {
  let rulersModule: typeof import('./events/rulers') | null = null;

  try {
    rulersModule = await import('./events/rulers');
  } catch {
    // RED fáze: modul ještě neexistuje.
  }

  assert.ok(rulersModule, 'Chybí pravidla pro panovníka nově přidávané události.');

  const events = [
    { year_numeric: 935, ruler_id: 33 },
    { year_numeric: 935, ruler_id: 2 },
    { year_numeric: 935, ruler_id: 2 },
    { year_numeric: 936, ruler_id: 2 },
    { year_numeric: 935, ruler_id: null },
  ];

  assert.deepEqual(rulersModule.rulerIdsForYear(events, 935), [33, 2]);
  assert.deepEqual(rulersModule.rulerIdsForYear(events, 936), [2]);
  assert.deepEqual(rulersModule.rulerIdsForYear(events, 937), []);
  assert.deepEqual(rulersModule.rulerIdsForYear(events, null), []);
});

test('automatické předvyplnění je povolené jen pro jednoznačný rok', async () => {
  const { autoRulerIdForYear, rulerSelectionRequired } = await import('./events/rulers');

  assert.equal(autoRulerIdForYear([7]), 7);
  assert.equal(autoRulerIdForYear([7, 8]), null);
  assert.equal(autoRulerIdForYear([]), null);

  assert.equal(rulerSelectionRequired([7], null), true);
  assert.equal(rulerSelectionRequired([7, 8], null), true);
  assert.equal(rulerSelectionRequired([7, 8], 8), false);
  assert.equal(rulerSelectionRequired([], null), false);
});
