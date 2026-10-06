import { Node, mergeAttributes } from '@tiptap/core';

export interface IconLinkAttrs {
  name: string;
  href: string;
  title: string;
  size: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iconLink: {
      insertIconLink: (attrs: IconLinkAttrs) => ReturnType;
    };
  }
}

export const IconLink = Node.create({
  name: 'iconLink',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      name: { default: 'external-link' },
      href: { default: '#' },
      title: { default: '' },
      size: { default: 16 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a.icon-link',
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            name: el.dataset.icon ?? 'external-link',
            href: (el as HTMLAnchorElement).href ?? '#',
            title: el.title ?? '',
            size: parseInt(el.dataset.size ?? '16', 10),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const a = node.attrs as IconLinkAttrs;
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: 'icon-link',
        href: a.href,
        title: a.title,
        target: '_blank',
        rel: 'noreferrer noopener',
        'data-icon': a.name,
        'data-size': String(a.size),
      }),
      [
        'i',
        {
          class: 'lucide-icon',
          'data-icon': a.name,
          'data-size': String(a.size),
          style: `display:inline-block; width:${a.size}px; height:${a.size}px; vertical-align:-2px`,
        },
      ],
    ];
  },

  addCommands() {
    return {
      insertIconLink:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
