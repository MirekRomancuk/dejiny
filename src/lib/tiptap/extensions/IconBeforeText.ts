import { Node, mergeAttributes } from '@tiptap/core';

/**
 * IconBeforeText - inline atom rendering a lucide icon. The actual SVG comes from lucide-react
 * in the editor view; in stored HTML we keep `<i class="lucide" data-icon="..." data-size="..." />`.
 * CellViewer must hydrate `<i data-icon>` to SVG at runtime (see runtime icon hydrator).
 */
export interface IconBeforeTextAttrs {
  name: string;
  size: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iconBeforeText: {
      insertIcon: (attrs: IconBeforeTextAttrs) => ReturnType;
    };
  }
}

export const IconBeforeText = Node.create({
  name: 'iconBeforeText',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      name: { default: 'circle' },
      size: { default: 16 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'i.lucide-icon',
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            name: el.dataset.icon ?? 'circle',
            size: parseInt(el.dataset.size ?? '16', 10),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const a = node.attrs as IconBeforeTextAttrs;
    return [
      'i',
      mergeAttributes(HTMLAttributes, {
        class: 'lucide-icon',
        'data-icon': a.name,
        'data-size': String(a.size),
        style: `display:inline-block; width:${a.size}px; height:${a.size}px; vertical-align:-2px; margin-right:0.3em`,
      }),
    ];
  },

  addCommands() {
    return {
      insertIcon:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
