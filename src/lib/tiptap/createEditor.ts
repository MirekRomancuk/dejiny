import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import FontSize from 'tiptap-extension-font-size';
import { DateLabel } from './extensions/DateLabel';
import { IconBeforeText } from './extensions/IconBeforeText';
import { IconLink } from './extensions/IconLink';
import { ImageWithLayout } from './extensions/ImageWithLayout';
import type { Extensions } from '@tiptap/core';

export function buildEditorExtensions(opts?: { placeholder?: string }): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    TextStyle,
    Color,
    FontFamily.configure({ types: ['textStyle'] }),
    FontSize.configure({ types: ['textStyle'] }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { target: '_blank', rel: 'noreferrer noopener' },
    }),
    Placeholder.configure({ placeholder: opts?.placeholder ?? 'Začněte psát…' }),
    DateLabel,
    IconBeforeText,
    IconLink,
    ImageWithLayout,
  ];
}
