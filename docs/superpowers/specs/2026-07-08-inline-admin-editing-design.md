# Inline admin editace na webu — návrh

- **Datum:** 2026-07-08
- **Stav:** návrh k odsouhlasení
- **Autor:** Martin Švec + Claude

## 1. Cíl a kontext

Přesunout správu obsahu z oddělené administrace (`/admin`) přímo na veřejný web. Přihlášený
administrátor upravuje obsah **vizuálně na místě**: u editovatelných prvků (rok, událost, obsah
stránky) se zobrazí ikony **tužka** (upravit), **„+"** (přidat) a **koš** (smazat); data se zadávají
v **bočním draweru** s formulářem. Cílový stav: veškerá správa obsahu je na FE a `/admin` se
**postupně odbourá**.

Web je React 18 + Vite + TypeScript + Tailwind + shadcn/ui, data v Supabase (Postgres + RLS).
Autentizace je Supabase Auth; `useProfile()` už vrací `isAdmin` (`profiles.is_admin`).

## 2. Rozhodnutí (z brainstormingu)

- **Rozsah:** vše najednou — události (časová osa i tabulka) i obsahové stránky.
- **Viditelnost ovládátek:** ikony jsou **stále viditelné**, jakmile je admin přihlášen (ne až na hover, ne za přepínačem).
- **Editace:** boční **drawer** s formulářem, znovupoužití hotových formulářů (`EventForm`).
- **Přihlášení:** nenápadný **zámeček** v hlavičce → login popover.
- **Mazání:** vždy s **potvrzovacím dialogem**.
- **`/admin`:** ponechat funkční, ale postupně přesunout vše na FE a nakonec odbourat.

## 3. Architektura

Znovupoužitelný základ, na který se navěsí jednotlivé povrchy.

- **Přihlášení (zámeček):** ikona zámku v hlavičce webu (`HeroHeader`). Klik otevře malý popover
  s přihlášením (e-mail + heslo → `supabase.auth.signInWithPassword`). Po přihlášení se v témže
  místě nabídne **odhlášení**. Session řídí `useProfile()`.
- **`AdminEditProvider`** (React context nad veřejným layoutem): drží `isAdmin` a stav draweru
  (co se právě edituje: `{ kind: 'event' | 'page', mode: 'create' | 'edit', payload }`). Vystavuje
  `openEditor(target)` a `closeEditor()`. Když uživatel není admin, provider je „no-op" a nic se
  nevykresluje.
- **`<EditAffordance>`** — malá, decentní vrstva tlačítek (tužka/„+"/koš) navázaná na konkrétní
  prvek. Renderuje se pouze pro `isAdmin`. Styl laděn tak, aby na husté ose (stovky uzlů) nerušil
  (nízký kontrast, objeví se u kraje prvku, plný kontrast na hoveru/focusu).
- **`<EditDrawer>`** — jeden hostitel draweru (shadcn `sheet`). Podle `kind` vloží příslušný
  formulář: `EventForm` (události) nebo `PageContentForm` (stránky). Obsah webu zůstává vidět
  v pozadí (méně „modálové" než centrovaný dialog).
- **Mutace (React Query):**
  - `useEventMutations` — `createEvent`, `updateEvent`, `deleteEvent` (Supabase insert/update/delete)
    + invalidace `qk.events.all`.
  - `usePageMutation` — `updatePage` (content_html, title) + invalidace dotazu dané stránky.
  - Optimistické aktualizace tam, kde to dává smysl (mazání), jinak invalidace po úspěchu.
- **Potvrzení mazání:** sdílený `<ConfirmDialog>` (shadcn `dialog`) před každým `delete`.
- **Zabezpečení:** klientský `isAdmin` je **jen UX**. Skutečné oprávnění vynucuje **RLS** (viz §7).

## 4. Datový model — co se edituje

- **Události (`events`):** existující model (rok `year_text`/`year_numeric`, `type_id`, `ruler_id`,
  `date_text`, `month`, `content_html`, `image_refs`, `highlight`, odkazy wiki/maps/toulky,
  `osobnost`, `poznamka`, `ordering`). Editace/přidání přes `EventForm`.
- **Stránky (`pages`):** `{ id, slug, title, content_html, background, updated_at }`. Obsah je
  **jeden HTML blob** na slug; „sekce" se pouze parsují z HTML (`src/lib/cmsParsers.ts`), nejsou
  v DB samostatně. Inline editace proto pracuje na úrovni **celé stránky** (title + content_html
  v rich editoru). Editace jednotlivých sekcí zvlášť by vyžadovala strukturovaný model obsahu —
  viz §11 (budoucí).

## 5. Povrchy a operace

### 5.1 Události — časová osa (`TimelineView` / `YearNode`)
- **Přidat událost do roku:** „+" v hlavičce uzlu roku → drawer s `EventForm`, předvyplněný rok.
- **Přidat nový rok/událost:** „+" akce (např. na začátku kroniky nebo plovoucí) → `EventForm`
  s prázdným rokem.
- **Upravit událost:** tužka u konkrétní události v rozbaleném panelu → `EventForm` s daty události.
- **Smazat událost:** koš u události → `ConfirmDialog` → `deleteEvent`.

### 5.2 Události — tabulka (`EventsTable` / `EventsTableRow`)
- Buňka (rok × kategorie): tužka/koš u jednotlivé události, „+" pro přidání události daného typu do
  daného roku. Řádek roku: „+" pro přidání události do roku. **Sdílí** `useEventMutations`
  i `<EditDrawer>` s časovou osou (žádná duplicitní logika).

### 5.3 Obsahové stránky (`PopisPage`, `VysvetlivkyPage`, `VerzePage`, `KalendarPage`)
- **Upravit stránku:** tužka (pro admina) → drawer s `PageContentForm` (title + rich editor nad
  `content_html`) → `updatePage` → invalidace. Po uložení se veřejné parsování (`cmsParsers`)
  přepočítá automaticky.

## 6. Komponenty a soubory

**Nové:**
- `src/components/admin-inline/AdminEditProvider.tsx`
- `src/components/admin-inline/EditAffordance.tsx`
- `src/components/admin-inline/EditDrawer.tsx`
- `src/components/admin-inline/ConfirmDialog.tsx`
- `src/components/admin-inline/LockLogin.tsx` (zámeček + login/logout popover)
- `src/components/admin-inline/PageContentForm.tsx`
- `src/hooks/useEventMutations.ts`
- `src/hooks/usePageMutation.ts`

**Změny:**
- `src/components/layout/HeroHeader.tsx` — zámeček (`LockLogin`).
- `src/components/layout/PublicLayout.tsx` — obalit `AdminEditProvider` + `EditDrawer`.
- `src/components/timeline/YearNode.tsx`, `TimelineView.tsx` — `EditAffordance` u roku/události.
- `src/components/events/EventsTable.tsx`, `EventsTableRow.tsx` — `EditAffordance` v buňkách.
- `src/pages/PopisPage.tsx` (a další obsahové stránky) — tužka „Upravit stránku".
- `src/components/admin/EventForm.tsx` — drobná úprava, aby šel použít v draweru (počáteční
  hodnoty + `onSaved` callback), bez rozbití stávajícího admin použití.

## 7. Zabezpečení a RLS

- Zápisové operace (`insert`/`update`/`delete`) na `events` a `pages` musí být v RLS povolené
  **jen přihlášenému adminovi** (`profiles.is_admin = true`). Před stavbou **ověřit stávající RLS
  policy** a doplnit chybějící (migrace v `supabase/migrations/`).
- Klientské skrytí ikon dle `isAdmin` je pouze UX; bez serverového pravidla by neplatilo.
- Čtení zůstává veřejné (anon), jak je dnes.

## 8. Přístupnost a UX

- `EditAffordance` tlačítka: `aria-label`, klávesová ovladatelnost, focus stavy; nezasahují do
  čtení obsahu návštěvníkem (skryto, když ne-admin).
- Drawer (shadcn `sheet`): fokus trap, `Esc` zavírá, vrácení fokusu.
- Ikony decentní (tón k inkoustu/zlaté), plný kontrast na hover/focus; na dotyku vždy viditelné.
- Respektovat `prefers-reduced-motion` u animací draweru.

## 9. Chybové stavy, cache, zpětná vazba

- Po úspěchu: `sonner` toast + invalidace příslušného dotazu (osa i tabulka čtou `qk.events.all`,
  takže obě view se obnoví jednou invalidací).
- Při chybě zápisu (např. RLS zamítne): toast s chybou, drawer zůstane otevřený s daty.
- Mazání: optimistické odebrání s rollbackem při chybě.

## 10. Pořadí stavby

1. **Základ:** `LockLogin` (zámeček + login/logout), `AdminEditProvider`, `EditDrawer`,
   `ConfirmDialog`, ověření/doplnění RLS.
2. **Události:** `useEventMutations`, `EventForm` v draweru, `EditAffordance` v ose i tabulce
   (edit/add/delete).
3. **Stránky:** `usePageMutation`, `PageContentForm`, tužka na obsahových stránkách.
4. **Odbourání `/admin`:** postupně přesunout zbývající funkce (import, bibliografie, uživatelé)
   na FE; nakonec `/admin` zrušit. (Samostatná fáze / vlastní plán.)

## 11. Mimo rozsah (zatím) / budoucí

- **Editace stránek po sekcích** (strukturovaný obsah místo jednoho HTML blobu) — vyžaduje datový
  model sekcí; zatím editujeme celý `content_html`.
- **Přesun importu, správy uživatelů a bibliografie na FE** a úplné zrušení `/admin` — fáze 4,
  vlastní spec/plán.
- Verzování obsahu / historie změn.

## 12. Ověření

- Typová kontrola (`tsc --noEmit`) a produkční build (`vite build`) bez chyb.
- Manuální průchod v běžícím webu jako admin: přihlášení přes zámeček → přidání/úprava/smazání
  události v ose i v tabulce → úprava obsahové stránky → obnovení dat bez reloadu.
- Ověření RLS: neautentizovaný ani ne-admin uživatel nesmí zapsat (přímý dotaz vrátí zamítnutí).
- Kontrola, že veřejné zobrazení (ne-admin) je beze změny a bez editačních prvků.
