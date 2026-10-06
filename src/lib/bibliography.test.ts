import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBibliographyReorderPayload,
  bibliographyLockToken,
  getBibliographyOrderUpdates,
  isBibliographyLockExpired,
  newBibliographyDisplayOrder,
  sortBibliographyByDisplayOrder,
} from './bibliography';

const books = [
  { id: 10, display_order: 30, title: 'Třetí' },
  { id: 11, display_order: 10, title: 'První' },
  { id: 12, display_order: 20, title: 'Druhý' },
];

test('public bibliography follows the custom display order instead of publication year or input order', () => {
  const ordered = sortBibliographyByDisplayOrder(books);

  assert.deepEqual(ordered.map((book) => book.id), [11, 12, 10]);
  assert.deepEqual(books.map((book) => book.id), [10, 11, 12]);
});

test('moving a bibliography item swaps only the two neighbouring display orders', () => {
  const ordered = sortBibliographyByDisplayOrder(books);

  assert.deepEqual(getBibliographyOrderUpdates(ordered, 1, -1), [
    { id: 12, display_order: 10 },
    { id: 11, display_order: 20 },
  ]);
  assert.deepEqual(getBibliographyOrderUpdates(ordered, 0, -1), []);
});

test('a move produces a complete normalized immutable payload for one atomic upsert', () => {
  const payload = buildBibliographyReorderPayload(books, 12, 11);

  assert.deepEqual(payload.map(({ id, display_order }) => ({ id, display_order })), [
    { id: 12, display_order: 0 },
    { id: 11, display_order: 1 },
    { id: 10, display_order: 2 },
  ]);
  assert.deepEqual(books.map((book) => book.display_order), [30, 10, 20]);
});

test('a new bibliography item receives a stable high order without a read-then-insert race', () => {
  assert.equal(newBibliographyDisplayOrder(1_787_300_000_999), 1_787_300_000);
});

test('bibliography write locks expire deterministically and expose only valid tokens', () => {
  const active = { token: 'writer-a', expiresAt: 20_000 };
  assert.equal(bibliographyLockToken(active), 'writer-a');
  assert.equal(isBibliographyLockExpired(active, 19_999), false);
  assert.equal(isBibliographyLockExpired(active, 20_000), true);
  assert.equal(bibliographyLockToken({ token: '', expiresAt: 20_000 }), null);
  assert.equal(isBibliographyLockExpired({ unexpected: true }, 1), true);
});
