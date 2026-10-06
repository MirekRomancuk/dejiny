import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Undo2,
  Redo2,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';

interface Props {
  editor: Editor | null;
  onInsertImage?: () => void;
  onInsertIcon?: () => void;
  className?: string;
  showCellTools?: boolean; // DateLabel etc.
}

const HERALDIC_COLORS = [
  { name: 'Černá',  v: '#1a1410' },
  { name: 'Červená', v: 'hsl(0 100% 27%)' },
  { name: 'Zlatá',   v: 'hsl(34 76% 44%)' },
  { name: 'Zelená',  v: 'hsl(140 60% 30%)' },
  { name: 'Modrá',   v: 'hsl(220 70% 35%)' },
  { name: 'Fialová', v: 'hsl(280 50% 35%)' },
  { name: 'Šedá',    v: 'hsl(0 0% 45%)' },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];

export function EditorToolbar({ editor, onInsertImage, onInsertIcon, className, showCellTools = true }: Props) {
  const [linkUrl, setLinkUrl] = useState('');
  const [dateText, setDateText] = useState('');
  if (!editor) return null;

  function ToggleBtn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
    return (
      <Button
        size="icon"
        variant={active ? 'secondary' : 'ghost'}
        onClick={onClick}
        title={title}
        type="button"
        className="h-8 w-8"
      >
        {children}
      </Button>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-card p-1', className)}>
      <ToggleBtn active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()} title="Tučné">
        <Bold className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()} title="Kurzíva">
        <Italic className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Podtržení">
        <UnderlineIcon className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={editor.isActive('strike')}    onClick={() => editor.chain().focus().toggleStrike().run()} title="Přeškrtnutí">
        <Strikethrough className="h-4 w-4" />
      </ToggleBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Barva textu" type="button">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="grid grid-cols-4 gap-1">
            {HERALDIC_COLORS.map((c) => (
              <button
                key={c.v}
                type="button"
                className="h-8 w-8 rounded border border-border"
                style={{ background: c.v }}
                title={c.name}
                onClick={() => editor.chain().focus().setColor(c.v).run()}
              />
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="col-span-4 mt-1 text-xs"
              onClick={() => editor.chain().focus().unsetColor().run()}
              type="button"
            >
              Odstranit barvu
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" type="button">
            Aa
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-2">
          <div className="flex flex-col gap-1">
            {FONT_SIZES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: `${s}px` }).run()}
              >
                {s} px
              </Button>
            ))}
            <Separator />
            <Button size="sm" variant="ghost" type="button" onClick={() => editor.chain().focus().unsetMark('textStyle').run()}>
              Výchozí
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToggleBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Nadpis 2">
        <Heading2 className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Nadpis 3">
        <Heading3 className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={editor.isActive('bulletList')}            onClick={() => editor.chain().focus().toggleBulletList().run()} title="Odrážky">
        <List className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={editor.isActive('orderedList')}           onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Číslovaný seznam">
        <ListOrdered className="h-4 w-4" />
      </ToggleBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {showCellTools && (
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" type="button" title="Vložit datum (zvýrazněné)">
              <Calendar className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-2 p-3">
            <Label htmlFor="datetxt">Text data</Label>
            <Input
              id="datetxt"
              placeholder="např. 23.5.1618"
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              type="button"
              onClick={() => {
                if (dateText) {
                  editor.chain().focus().insertDateLabel({ text: dateText, size: 12, weight: 700 }).run();
                  setDateText('');
                }
              }}
            >
              Vložit
            </Button>
          </PopoverContent>
        </Popover>
      )}

      {onInsertIcon && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onInsertIcon} type="button" title="Vložit ikonu">
          <Sparkles className="h-4 w-4" />
        </Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant={editor.isActive('link') ? 'secondary' : 'ghost'} className="h-8 w-8" type="button" title="Odkaz">
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-2 p-3">
          <Label htmlFor="linkurl">URL</Label>
          <Input
            id="linkurl"
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              type="button"
              onClick={() => {
                if (linkUrl) {
                  editor.chain().focus().setLink({ href: linkUrl }).run();
                  setLinkUrl('');
                }
              }}
            >
              Vložit
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => editor.chain().focus().unsetLink().run()}>
              Odebrat
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {onInsertImage && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onInsertImage} type="button" title="Vložit obrázek">
          <ImageIcon className="h-4 w-4" />
        </Button>
      )}

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToggleBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Zpět">
        <Undo2 className="h-4 w-4" />
      </ToggleBtn>
      <ToggleBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Vpřed">
        <Redo2 className="h-4 w-4" />
      </ToggleBtn>
    </div>
  );
}
