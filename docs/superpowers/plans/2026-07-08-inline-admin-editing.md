# Inline admin editace — implementační plán

> **Pozn.:** Projekt nemá test runner (jen `tsc`/`eslint`/`vite build`). Ověřování je proto
> přes `npx tsc --noEmit`, `npm run build` a manuální průchod v běžícím webu. Spec:
> `docs/superpowers/specs/2026-07-08-inline-admin-editing-design.md`.

**Cíl:** Přihlášený admin edituje obsah přímo na webu (události v ose i tabulce, obsahové stránky)
přes editační ikony + boční drawer; `/admin` se postupně odbourá.

**Architektura:** `AdminEditProvider` (context s `isAdmin` + stav draweru) nad veřejným layoutem;
`EditAffordance` (ikony jen pro admina) navázané na prvky; `EditDrawer` hostí formuláře
(`EventForm` / `PageContentForm`); mutace přes React Query + Supabase; oprávnění vynucuje RLS.

## Globální pravidla
- Vše česky, diakritika. shadcn `sheet` = drawer, `dialog` = potvrzení mazání.
- Klientský `isAdmin` = jen UX; zápis hlídá RLS (existující admin UI už píše → policy pravděpodobně OK, ověřit).
- Po zápisu invalidovat `qk.events.all` (osa i tabulka), resp. dotaz stránky.

---

## Fáze 1 — Základ

- [ ] **T1: RLS ověření** — přímým dotazem ověřit, že anon (nepřihlášený) nemůže `insert` do `events` (očekáváme zamítnutí). Pokud by šel, doplnit RLS migraci. Soubor(y): dotaz + případně `supabase/migrations/0007_rls_admin_write.sql`.
- [ ] **T2: `useEventMutations`** — `src/hooks/useEventMutations.ts`: `createEvent(payload)`, `updateEvent(id,payload)`, `deleteEvent(id)`; každý invaliduje `qk.events.all`; toast; delete optimisticky s rollbackem. Ověř `tsc`.
- [ ] **T3: `ConfirmDialog`** — `src/components/admin-inline/ConfirmDialog.tsx` (shadcn `dialog`): props `{open,title,description,confirmLabel,onConfirm,onOpenChange}`.
- [ ] **T4: `AdminEditProvider` + hook** — `src/components/admin-inline/AdminEditProvider.tsx`: context `{ isAdmin, editor, openEditor(target), closeEditor() }`, kde `target = {kind:'event',mode,eventId?,prefill?} | {kind:'page',slug}`. `useAdminEdit()` hook.
- [ ] **T5: `EditDrawer`** — `src/components/admin-inline/EditDrawer.tsx` (shadcn `sheet`): čte `editor` z providera, vloží `EventForm` nebo `PageContentForm`, zavře po uložení.
- [ ] **T6: `LockLogin`** — `src/components/admin-inline/LockLogin.tsx`: ikona zámku; popover login (e-mail+heslo → `supabase.auth.signInWithPassword`) / když admin, tlačítko odhlásit.
- [ ] **T7: Zapojení základu** — `PublicLayout.tsx` obalit `AdminEditProvider` + vykreslit `EditDrawer`; `HeroHeader.tsx` přidat `LockLogin` (nenápadně vpravo nahoře). Ověř `tsc`+`build`+screenshot (nepřihlášený = beze změny).

## Fáze 2 — Události

- [ ] **T8: `EventForm` drawer-mode** — `src/components/admin/EventForm.tsx`: přidat volitelné `onSaved?(id)`, `onDeleted?()`, `onCancel?()`, `hideChrome?:boolean`. Když jsou callbacky, save/delete je zavolá místo `navigate`; při `hideChrome` skrýt horní hlavičku. Admin routa (bez props) funguje beze změny.
- [ ] **T9: `EditAffordance`** — `src/components/admin-inline/EditAffordance.tsx`: malá tlačítka (tužka/„+"/koš) jen pro `isAdmin`; props `{onEdit?,onAdd?,onDelete?,label,className}`; decentní styl, `aria-label`, focus.
- [ ] **T10: Osa** — `YearNode.tsx`: „+" u roku (openEditor create s prefill rokem), tužka/koš u události v panelu (edit/delete přes ConfirmDialog). `TimelineView.tsx`: tlačítko „+ nový rok". Ověř `tsc`+`build`.
- [ ] **T11: Tabulka** — `EventsTableRow.tsx`: tužka/koš u události, „+" pro přidání do roku/typu; sdílí `useEventMutations` + `openEditor`. Ověř `tsc`+`build`.

## Fáze 3 — Stránky

- [ ] **T12: `usePageMutation`** — `src/hooks/usePageMutation.ts`: `updatePage(slug,{title,content_html})` + invalidace `qk.pages.one(slug)`.
- [ ] **T13: `PageContentForm`** — `src/components/admin-inline/PageContentForm.tsx`: title input + `RichCellEditor` nad `content_html`; uloží přes `usePageMutation`.
- [ ] **T14: Zapojení stránek** — `PopisPage`, `VysvetlivkyPage`, `VerzePage`, `KalendarPage`: tužka „Upravit stránku" (openEditor page). Ověř `tsc`+`build`.

## Fáze 4 — (samostatně) Odbourání /admin
Přesun importu, bibliografie, uživatelů na FE a zrušení `/admin`. Vlastní spec/plán později.

## Ověření (po každé fázi)
`npx tsc --noEmit` = 0 · `npm run build` = OK · screenshot běžícího webu (nepřihlášený beze změny; přihlášený admin vidí ikony). Zápisové operace ověří uživatel přihlášený jako admin.
