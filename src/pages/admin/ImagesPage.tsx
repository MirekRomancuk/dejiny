import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Trash2, Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';

type Bucket = 'event-images' | 'page-content' | 'page-backgrounds';

const BUCKET_LABEL: Record<Bucket, string> = {
  'event-images':     'Obrázky událostí',
  'page-content':     'Obsah stránek',
  'page-backgrounds': 'Pozadí stránek',
};

interface ImgObject {
  name: string;
  publicUrl: string;
  size: number;
}

export function ImagesPage() {
  const qc = useQueryClient();
  const [bucket, setBucket] = useState<Bucket>('event-images');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery<ImgObject[]>({
    queryKey: ['storage', bucket, 'list'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      return (data ?? [])
        .filter((o) => o.name && !o.name.endsWith('/'))
        .map((o) => ({
          name: o.name,
          publicUrl: supabase.storage.from(bucket).getPublicUrl(o.name).data.publicUrl,
          size: o.metadata?.size ?? 0,
        }));
    },
  });

  const del = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.storage.from(bucket).remove([name]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Smazáno');
      qc.invalidateQueries({ queryKey: ['storage', bucket, 'list'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(files: FileList) {
    setUploading(true);
    let success = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) {
        failed++;
        console.error(error);
      } else {
        success++;
      }
    }
    setUploading(false);
    if (success > 0) toast.success(`Nahráno ${success} ${success === 1 ? 'soubor' : success < 5 ? 'soubory' : 'souborů'}`);
    if (failed > 0) toast.error(`Selhalo ${failed}`);
    qc.invalidateQueries({ queryKey: ['storage', bucket, 'list'] });
  }

  const filtered = (data ?? []).filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl">Obrázky</h1>
          <p className="text-sm text-muted-foreground">
            Knihovna všech nahraných obrázků. Klikem zkopírujete URL.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
                <SelectItem key={b} value={b}>{BUCKET_LABEL[b]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
            <Button asChild type="button" disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Nahrát
              </span>
            </Button>
          </label>
        </div>
      </header>

      <Input
        placeholder="Hledat dle názvu…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState title="Žádné obrázky" description="Nahrajte obrázky tlačítkem nahoře." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((o) => (
            <div key={o.name} className="group relative overflow-hidden rounded-md border border-border bg-muted">
              <div className="aspect-square">
                <img src={o.publicUrl} alt={o.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/70 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="truncate text-[10px] text-white" title={o.name}>{o.name}</span>
                <div className="flex gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(o.publicUrl);
                      toast.success('URL zkopírováno');
                    }}
                    title="Kopírovat URL"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => {
                      if (window.confirm(`Smazat ${o.name}?`)) del.mutate(o.name);
                    }}
                    title="Smazat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
