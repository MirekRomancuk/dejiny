# Dějiny Koruny české

Moderní React SPA pro web `dejinykorunyceske.cz`. Backend: Supabase. Hosting: sdílený Apache, deploy = upload `dist/`.

## Stack

- **Vite 6** + **React 18** + **TypeScript**
- **Tailwind CSS 3** + **shadcn/ui** + **lucide-react**
- **TanStack Query** + **TanStack Virtual**
- **react-router-dom** (BrowserRouter + `.htaccess` rewrite)
- **TipTap** rich-text editor pro admina
- **Supabase JS** - Postgres, Auth, Storage, RLS
- **SheetJS** pro Excel parsing v prohlížeči

## Setup

```bash
npm install
cp .env.example .env.development
# Doplnit VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY

npm run dev
# http://localhost:5173
```

## Skripty

| Skript | Co dělá |
|---|---|
| `npm run dev` | Spustí dev server |
| `npm run build` | Production build do `dist/` |
| `npm run preview` | Preview production buildu |
| `npm run typecheck` | TS type check |
| `npm run lint` | ESLint |
| `npm run migrate:joomla` | Jednorázová migrace z `legacy/dejinykorunyceske.sql` do Supabase |
| `npm run migrate:images` | Upload `legacy/images/*` do Supabase Storage + rewrite cest |

## Supabase setup

Projekt používá **Supabase MCP server** napojený přímo do Claude Code. Setup:

```bash
# 1) Přidat MCP server (už v .mcp.json - lze přeskočit)
claude mcp add --scope project --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=hujighhlnmuokjvtveru"

# 2) Autentizace - v běžném terminálu (NE v IDE)
claude /mcp
# → vybrat 'supabase' → Authenticate → OAuth flow

# 3) (Volitelné) přidat Supabase agent skills
npx skills add supabase/agent-skills
```

### SQL migrace

Soubory v `supabase/migrations/`:

- `0001_init.sql` - tabulky `event_types`, `rulers`, `events`, `pages`, `calendar_events`, `settings`
- `0002_rls.sql` - RLS politiky (public read, auth write)
- `0003_storage.sql` - buckety `event-images`, `page-content`, `page-backgrounds`

Aplikace přes MCP nástroj `apply_migration` v Claude Code, nebo manuálně v SQL editoru.

## Adresářová struktura

```
src/
├── lib/             - utility (cn, year, supabase, queryClient, …)
├── hooks/           - React hooks (useSession, useEvents, …)
├── components/
│   ├── ui/          - shadcn primitiva
│   ├── layout/      - Navbar, Footer, PublicLayout, AdminLayout, ThemeProvider
│   ├── events/      - EventsTable, CellViewer, FilterPanel
│   ├── editor/      - TipTap RichCellEditor
│   ├── admin/       - admin-only komponenty
│   └── common/      - Loading, EmptyState, ErrorBoundary
├── pages/           - top-level stránky (routy)
└── types/           - TS typy (database.ts, domain.ts)

supabase/migrations/ - SQL migrace
scripts/             - migrace skripty (Joomla, obrázky)
public/              - statické soubory (.htaccess se kopíruje do dist/)
legacy/              - Joomla SQL dump + obrázky (gitignored)
```

## Deploy

```powershell
# Kontrola cíle a seznamu souborů bez nahrávání
npm run deploy:ftp:dry-run

# Produkční build a upload přes explicitní FTPS
npm run deploy:ftp
```

Lokální `.env.deploy` je ignorovaný Gitem. Produkční kořen Forpsi je `/www`; jeho použití
vyžaduje `FTP_ALLOW_PRODUCTION_ROOT=yes`. Skript pouze nahraje soubory z `dist/` a nic
na serveru nemaže. Původní web zůstává uložený v `/data/pre-react-www-2026-10-06`,
původní databáze zůstává ve Forpsi beze změny a `/subdoms` se při produkčním deployi
nepoužívá.

## Aplikační záloha Supabase

```bash
npm run backup:supabase
```

Skript vytvoří ignorovanou složku `backups/supabase-<project>-<timestamp>/` s JSON exporty
veřejných tabulek, všemi objekty veřejných Storage bucketů, SQL migracemi a kontrolním
manifestem SHA-256. Jde o aplikační zálohu: Supabase Auth uživatelé, chráněná tabulka
`profiles` a interní/privátní PostgreSQL schémata vyžadují samostatný PostgreSQL/Auth export.

## Bezpečnost

- Žádné secrets v repu (`.env.*` mimo `.env.example` jsou gitignored).
- RLS politiky: anon může jen `SELECT`, write akce vyžadují přihlášeného uživatele.
- Admin účty se zakládají ručně v Supabase dashboardu (Auth → Users → Add user).

## Roadmap

Viz `/Users/martinsvec/.claude/plans/m-m-tad-ynov-projekt-mellow-shamir.md` (plán implementace s fázemi F0-F10).
