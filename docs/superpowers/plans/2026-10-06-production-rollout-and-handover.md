# Production Rollout and Handover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely release the approved React site to production, preserve the Joomla site and its database, expose the legacy copy at `old.dejinykorunyceske.cz`, and prepare a secret-free source ZIP for the client.

**Architecture:** Treat the release commit as the immutable source of the production bundle. Mirror the current Joomla document root and export its database before changing production, upload a dated recovery archive outside the public document root, then publish the Joomla mirror under the `old` subdomain and replace the main document root with the verified React build. Preserve a local recovery copy and verify every public endpoint after cutover.

**Tech Stack:** Git/GitHub, Vite/React/TypeScript, FTP (Forpsi), Joomla/PHP/MySQL, Supabase, ZIP.

**Spec:** In-chat rollout design approved by the user on 2026-10-06; no separate specification file.

## Global Constraints

- Do not expose `.env` files, FTP credentials, Joomla database credentials, or Supabase secrets in Git or the client ZIP.
- Back up files and database before changing the production document root.
- The public legacy copy has no password but must be excluded from indexing.
- Keep an independently restorable dated archive on FTP.
- Production must use the exact build produced from the pushed release commit.

## Review Focus

- A partial FTP upload must not leave production reporting success; verify all expected bundle files and HTTP routes.
- Joomla `configuration.php` must remain present in the recovery archive and legacy copy but never enter Git or the source ZIP.
- The legacy subdomain may require DNS or hosting-panel configuration in addition to creating `/subdoms/old`.
- The old database export must be non-empty and restorable before production is changed.
- The source ZIP must contain tracked project sources and documentation while excluding secrets, dependencies, build output, and Git metadata.

---

### Task 1: Create and push the release commit

**Files:**
- Modify: current tracked and untracked application changes
- Create: `docs/superpowers/plans/2026-10-06-production-rollout-and-handover.md`

**Interfaces:**
- Produces: immutable Git commit and production build used by Tasks 3 and 4.

- [ ] Run `git diff --check`, `npm test`, `npm run typecheck`, and `npm run build`.
- [ ] Review the complete diff and confirm no credentials or unrelated generated files are included.
- [ ] Commit the release changes on `main`, create a dated release tag, and push the branch and tag to `origin`.
- [ ] Record the pushed commit SHA for the deployment and source archive.

### Task 2: Back up Joomla files and database

**Files:**
- Create locally: a temporary dated Joomla mirror and SQL export outside the repository.
- Create remotely: a dated archive under an FTP backup directory.

**Interfaces:**
- Consumes: current FTP production document root and Joomla database settings.
- Produces: verified local mirror, non-empty SQL dump, checksums, and uploaded recovery archive.

- [ ] Resolve the actual production document root and list its top-level contents without changing it.
- [ ] Mirror the complete Joomla document root locally and verify representative core files, media, and `configuration.php`.
- [ ] Read database connection settings locally without printing secrets and export the Joomla database with `mysqldump`.
- [ ] Validate the SQL dump contains schema and data statements, then package files, SQL, manifest, and SHA-256 checksums.
- [ ] Upload the package to a dated FTP backup directory and verify its remote size.

### Task 3: Publish legacy and production sites

**Files:**
- Create remotely: `/subdoms/old` legacy copy with `robots.txt` and no-index headers where supported.
- Replace remotely: confirmed production document root with the verified `dist/` bundle.

**Interfaces:**
- Consumes: verified Joomla mirror from Task 2 and exact release build from Task 1.
- Produces: public legacy site, production React site, and a tested rollback path.

- [ ] Confirm `old.dejinykorunyceske.cz` resolves or configure the subdomain through the available hosting controls.
- [ ] Upload the Joomla mirror to `/subdoms/old`, add indexing protection, and verify public pages and assets.
- [ ] Remove or move the old production document-root contents only after both backup checks pass.
- [ ] Upload the exact release `dist/` to the clean production document root.
- [ ] Verify the main page, SPA routes, assets, admin login, HTTPS, and `www` behavior; verify the legacy subdomain separately.
- [ ] If any critical check fails, restore the dated Joomla backup immediately.

### Task 4: Prepare the client handover archive

**Files:**
- Create locally: `dejinykorunyceske-source-2026-10-06.zip` outside the repository.

**Interfaces:**
- Consumes: pushed release commit from Task 1.
- Produces: secret-free source ZIP plus ownership-transfer checklist.

- [ ] Create the ZIP from the release commit rather than the working directory.
- [ ] Inspect the ZIP file list and scan it for forbidden secret/config files.
- [ ] Verify the archive extracts and contains `README.md`, `package.json`, lockfile, `src/`, `public/`, `scripts/`, and `supabase/migrations/`.
- [ ] Report the ZIP path, size, SHA-256 checksum, release commit, production URLs, backup location, and any hosting/DNS limitation.
