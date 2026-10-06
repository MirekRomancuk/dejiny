import { Node, mergeAttributes } from '@tiptap/core';

export interface ImageWithLayoutAttrs {
  src: string;
  alt: string;
  width: number | string | null;
  align: 'left' | 'right' | 'center' | 'inline-left' | 'inline-right';
  caption: string;
  lightbox: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageWithLayout: {
      insertImage: (attrs: ImageWithLayoutAttrs) => ReturnType;
    };
  }
}

export const ImageWithLayout = Node.create({
  name: 'imageWithLayout',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      width: { default: null },
      align: { default: 'center' },
      caption: { default: '' },
      lightbox: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure.img-block',
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const img = el.querySelector('img');
          const cap = el.querySelector('figcaption');
          return {
            src: img?.getAttribute('src') ?? '',
            alt: img?.getAttribute('alt') ?? '',
            width: img?.getAttribute('width') ?? null,
            align: (el.dataset.align ?? 'center') as ImageWithLayoutAttrs['align'],
            caption: cap?.textContent ?? '',
            lightbox: img?.dataset.lightbox === 'true',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const a = node.attrs as ImageWithLayoutAttrs;
    const imgAttrs: Record<string, string> = {
      src: a.src,
      alt: a.alt,
    };
    if (a.width) imgAttrs.width = String(a.width);
    if (a.lightbox) imgAttrs['data-lightbox'] = 'true';
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        class: 'img-block',
        'data-align': a.align,
      }),
      ['img', imgAttrs],
      ...(a.caption ? [['figcaption', {}, a.caption]] : []),
    ];
  },

  addCommands() {
    return {
      insertImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
