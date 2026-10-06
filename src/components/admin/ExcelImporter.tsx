import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { parseExcelWorkbook, normalizeForDedupe, type ParsedExcelEvent } from '@/lib/excel/parse';
import { useEventTypes, useRulers } from '@/hooks/useEvents';
import { TYPE_LABELS_SHORT } from '@/types/domain';
import { qk } from '@/lib/queryKeys';

interface DedupedRow extends ParsedExcelEvent {
  isDuplicate: boolean;
  matchedEventId?: number;
}

export function ExcelImporter() {
  const qc = useQueryClient();
  const { data: typeMeta } = useEventTypes();
  const { data: rulers } = useRulers();

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<DedupedRow[]>([]);
  const [importDuplicates, setImportDuplicates] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleFile(f: File) {
    setFile(f);
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const parsed = parseExcelWorkbook(buf);
      // Fetch existing events for dedupe (just year + type + first part of content)
      // PostgREST vrací max 1000 řádků na odpověď — pro dedup je nutné stránkovat přes
      // CELOU tabulku, jinak se porovnává jen s prvními 1000 a import vytvoří duplicity.
      const existing: Array<{ id: number; year_numeric: number | null; type_id: number; content_html: string }> = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('events')
          .select('id, year_numeric, type_id, content_html')
          .not('content_html', 'eq', '')
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        const batch = (data ?? []) as typeof existing;
        existing.push(...batch);
        if (batch.length < 1000) break;
      }

      // Build dedupe index: key = `${year_numeric}|${type_id}|${normalized(content)}`
      const typeByCode = typeMeta?.byCode;
      const idx = new Map<string, number>();
      for (const e of existing ?? []) {
        const row = e as { id: number; year_numeric: number | null; type_id: number; content_html: string };
        const norm = normalizeForDedupe(row.content_html);
        if (!norm) continue;
        idx.set(`${row.year_numeric ?? 'null'}|${row.type_id}|${norm.slice(0, 80)}`, row.id);
      }

      const deduped: DedupedRow[] = parsed.events.map((e) => {
        const typeId = typeByCode?.get(e.type_code);
        if (!typeId) return { ...e, isDuplicate: false };
        const key = `${e.year_numeric ?? 'null'}|${typeId}|${normalizeForDedupe(e.content_html).slice(0, 80)}`;
        const matchId = idx.get(key);
        return { ...e, isDuplicate: !!matchId, matchedEventId: matchId };
      });
      setRows(deduped);
      toast.success(`Načteno ${parsed.events.length} událostí (${parsed.events.length - deduped.filter((d) => d.isDuplicate).length} nových)`);
    } catch (err) {
      toast.error(`Parsing selhal: ${(err as Error).message}`);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!typeMeta) return;
    const rulerByName = new Map<string, number>();
    (rulers ?? []).forEach((r) => rulerByName.set(r.name, r.id));

    const toImport = rows.filter((r) => importDuplicates || !r.isDuplicate);
    if (toImport.length === 0) {
      toast.info('Nic k importu - vše jsou duplikáty.');
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: toImport.length });

    const CHUNK = 500;
    for (let i = 0; i < toImport.length; i += CHUNK) {
      const slice = toImport.slice(i, i + CHUNK);
      const payload = slice.map((r) => ({
        year_text: r.year_text,
        year_numeric: r.year_numeric,
        ruler_id: r.ruler_name_raw ? rulerByName.get(r.ruler_name_raw) ?? null : null,
        type_id: typeMeta.byCode.get(r.type_code)!,
        date_text: r.date_text,
        month: r.month,
        content_html: r.content_html,
        wiki_url: r.wiki_url,
        wiki_label: r.wiki_label,
        maps_url: r.maps_url,
        maps_label: r.maps_label,
        source_excel_row: r.source_excel_row,
      }));
      const { error } = await supabase
        .from('events')
        .insert(payload);
      if (error) {
        toast.error(`Batch ${i / CHUNK + 1} selhal: ${error.message}`);
        setImporting(false);
        return;
      }
      setProgress({ done: Math.min(i + CHUNK, toImport.length), total: toImport.length });
    }
    setImporting(false);
    setProgress(null);
    toast.success(`Importováno ${toImport.length} událostí`);
    qc.invalidateQueries({ queryKey: qk.events.all });
    qc.invalidateQueries({ queryKey: qk.calendar });
    setRows([]);
    setFile(null);
  }

  const newCount = rows.filter((r) => !r.isDuplicate).length;
  const dupCount = rows.length - newCount;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl">Import z Excelu</h1>
        <p className="text-sm text-muted-foreground">
          Nahraj `.xlsx` soubor — duplicitní události (stejný rok + typ + text) budou označené a defaultně přeskočeny.
        </p>
      </header>

      {!file && (
        <label className="block cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card py-12 transition-colors hover:border-primary">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-heading text-lg">Klikněte pro nahrání Excelu</p>
              <p className="text-sm text-muted-foreground">.xlsx nebo .xls</p>
            </div>
            <Button asChild type="button">
              <span><Upload className="mr-2 h-4 w-4" />Vybrat soubor</span>
            </Button>
          </div>
        </label>
      )}

      {parsing && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Zpracovávám Excel a porovnávám s databází…</span>
        </div>
      )}

      {file && rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="text-xs uppercase text-muted-foreground">Celkem v Excelu</div>
              <div className="font-heading text-2xl">{rows.length}</div>
            </div>
            <div className="rounded-md border border-green-500/40 bg-green-500/5 p-4">
              <div className="flex items-center gap-1 text-xs uppercase text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Nové
              </div>
              <div className="font-heading text-2xl text-green-700 dark:text-green-400">{newCount}</div>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
              <div className="flex items-center gap-1 text-xs uppercase text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" /> Duplikáty
              </div>
              <div className="font-heading text-2xl text-amber-700 dark:text-amber-400">{dupCount}</div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <Checkbox
              id="dups"
              checked={importDuplicates}
              onCheckedChange={(c) => setImportDuplicates(c === true)}
            />
            <Label htmlFor="dups" className="cursor-pointer">
              Importovat i duplikáty (vytvoří kopie)
            </Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing}>
              {importing && progress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importuji {progress.done}/{progress.total}…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importovat {importDuplicates ? rows.length : newCount} událostí
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => { setFile(null); setRows([]); }} disabled={importing}>
              Zrušit
            </Button>
          </div>

          <Separator />

          <h2 className="font-heading text-lg">Náhled prvních 30 řádků</h2>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30 font-heading text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Stav</th>
                  <th className="px-2 py-1.5 text-left">Excel ř.</th>
                  <th className="px-2 py-1.5 text-left">Rok</th>
                  <th className="px-2 py-1.5 text-left">Panovník</th>
                  <th className="px-2 py-1.5 text-left">Typ</th>
                  <th className="px-2 py-1.5 text-left">Náhled</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 30).map((r, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="px-2 py-1.5">
                      {r.isDuplicate ? (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-700">Dup</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500/50 text-green-700">Nový</Badge>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.source_excel_row}</td>
                    <td className="px-2 py-1.5 font-heading">{r.year_text ?? ''}</td>
                    <td className="px-2 py-1.5 text-xs">{r.ruler_name_raw ?? ''}</td>
                    <td className="px-2 py-1.5">{TYPE_LABELS_SHORT[r.type_code]}</td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground" title={r.content_html}>
                      {r.content_html.slice(0, 100)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 30 && (
            <p className="text-center text-xs text-muted-foreground">
              … a dalších {rows.length - 30} řádků
            </p>
          )}
        </>
      )}
    </div>
  );
}
