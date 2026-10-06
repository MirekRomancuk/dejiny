import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { buildEditorExtensions } from '@/lib/tiptap/createEditor';
import { EditorToolbar } from './EditorToolbar';
import { ImagePickerDialog } from './ImagePickerDialog';
import { IconPickerDialog } from './IconPickerDialog';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function PageEditor({ value, onChange, placeholder, className }: Props) {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const editor = useEditor({
    extensions: buildEditorExtensions({ placeholder }),
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'cell-rich prose prose-sm max-w-none focus:outline-none px-4 py-3',
        style: 'min-height: 400px',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <EditorToolbar
        editor={editor}
        onInsertImage={() => setImagePickerOpen(true)}
        onInsertIcon={() => setIconPickerOpen(true)}
        showCellTools={false}
      />
      <div className="rounded-md border border-input bg-background">
        <EditorContent editor={editor} />
      </div>
      <ImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        bucket="page-content"
        onSelect={(url, alt) => {
          editor?.chain().focus().insertImage({
            src: url, alt: alt ?? '', width: null, align: 'center', caption: '', lightbox: true,
          }).run();
        }}
      />
      <IconPickerDialog
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        onSelectIcon={(name, size) => {
          editor?.chain().focus().insertIcon({ name, size }).run();
        }}
        onSelectIconLink={(name, href, title, size) => {
          editor?.chain().focus().insertIconLink({ name, href, title, size }).run();
        }}
      />
    </div>
  );
}
