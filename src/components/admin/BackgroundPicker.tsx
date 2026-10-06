import { useState } from 'react';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Palette } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Background {
  type: 'color' | 'image';
  value: string;
  position?: 'cover' | 'contain' | 'tile';
}

interface Props {
  value: Background;
  onChange: (b: Background) => void;
}

export function BackgroundPicker({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const path = `bg-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from('page-backgrounds').upload(path, file);
    setUploading(false);
    if (error) {
      toast.error(`Upload selhal: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from('page-backgrounds').getPublicUrl(path);
    onChange({ type: 'image', value: data.publicUrl, position: value.position ?? 'cover' });
    toast.success('Pozadí nahráno');
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Label className="font-heading">Pozadí stránky</Label>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={value.type === 'color' ? 'default' : 'outline'}
          onClick={() => onChange({ type: 'color', value: 'hsl(36 33% 92%)' })}
          type="button"
        >
          <Palette className="mr-2 h-4 w-4" /> Barva
        </Button>
        <Button
          size="sm"
          variant={value.type === 'image' ? 'default' : 'outline'}
          onClick={() => onChange({ type: 'image', value: value.type === 'image' ? value.value : '', position: 'cover' })}
          type="button"
        >
          <ImageIcon className="mr-2 h-4 w-4" /> Obrázek
        </Button>
      </div>
      {value.type === 'color' && (
        <div className="flex items-center gap-2">
          <Input
            value={value.value}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
            placeholder="hsl(36 33% 92%) nebo #e5d3b0"
          />
          <div className="h-9 w-9 rounded border border-border" style={{ background: value.value }} />
        </div>
      )}
      {value.type === 'image' && (
        <div className="space-y-2">
          <Input
            value={value.value}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
            placeholder="URL obrázku nebo nahrát níže"
          />
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
              <Button asChild size="sm" type="button">
                <span><Upload className="mr-2 h-4 w-4" />{uploading ? 'Nahrávám…' : 'Nahrát'}</span>
              </Button>
            </label>
            <Select
              value={value.position ?? 'cover'}
              onValueChange={(v) => onChange({ ...value, position: v as Background['position'] })}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="tile">Dlaždice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {value.value && (
            <div
              className="h-24 rounded border border-border"
              style={{
                backgroundImage: `url(${value.value})`,
                backgroundSize: value.position === 'tile' ? 'auto' : (value.position ?? 'cover'),
                backgroundRepeat: value.position === 'tile' ? 'repeat' : 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
