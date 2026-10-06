import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSelect: (url: string, alt?: string) => void;
  bucket?: 'event-images' | 'page-content';
}

interface StoredObject {
  name: string;   // plná cesta (unikátní klíč + hledání)
  label: string;  // jen název souboru (zobrazení/alt)
  publicUrl: string;
}

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

/** Rekurzivně projde bucket (kořen i podsložky) a posbírá soubory obrázků. */
async function listImages(bucket: string, prefix: string, depth: number): Promise<StoredObject[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;
  const files: StoredObject[] = [];
  const folders: string[] = [];
  for (const o of data ?? []) {
    if (!o.name || o.name === '.emptyFolderPlaceholder') continue;
    const path = prefix ? `${prefix}/${o.name}` : o.name;
    // Soubory mají `id`, složky (prefixy) mají id = null.
    const isFolder = (o as { id: string | null }).id == null;
    if (isFolder) {
      if (depth < 4) folders.push(path);
    } else if (IMG_RE.test(o.name)) {
      files.push({
        name: path,
        label: o.name,
        publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
      });
    }
  }
  if (folders.length > 0) {
    const nested = await Promise.all(folders.map((f) => listImages(bucket, f, depth + 1)));
    for (const arr of nested) files.push(...arr);
  }
  return files;
}

export function ImagePickerDialog({ open, onOpenChange, onSelect, bucket = 'event-images' }: Props) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  const { data: objects, isLoading } = useQuery<StoredObject[]>({
    queryKey: ['storage', bucket],
    queryFn: () => listImages(bucket, '', 0),
    enabled: open,
  });

  async function handleUpload(file: File) {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    setUploading(false);
    if (error) {
      toast.error(`Upload selhal: ${error.message}`);
      return;
    }
    toast.success(`Nahráno: ${path}`);
    qc.invalidateQueries({ queryKey: ['storage', bucket] });
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onSelect(data.publicUrl, file.name.replace(/\.[^.]+$/, ''));
    onOpenChange(false);
  }

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = (objects ?? []).filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vybrat obrázek</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Hledat v knihovně…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <Button asChild type="button">
              <span>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Nahrát
              </span>
            </Button>
          </label>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Žádné obrázky.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {filtered.map((o) => (
                <button
                  key={o.name}
                  type="button"
                  className={cn(
                    'group relative overflow-hidden rounded-md border border-border bg-muted aspect-square transition-all hover:border-primary',
                  )}
                  onClick={() => {
                    onSelect(o.publicUrl, o.label);
                    onOpenChange(false);
                  }}
                >
                  <img src={o.publicUrl} alt={o.label} loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {o.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
