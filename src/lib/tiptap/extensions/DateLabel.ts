import { Node, mergeAttributes } from '@tiptap/core';

/**
 * DateLabel - inline node for the leading date in a cell.
 * Renders as `<span class="date-label" data-size data-weight style="...">{text}</span>`.
 */
export interface DateLabelAttrs {
  text: string;
  size: number;
  weight: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dateLabel: {
      insertDateLabel: (attrs: DateLabelAttrs) => ReturnType;
    };
  }
}

export const DateLabel = Node.create({
  name: 'dateLabel',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: { default: '' },
      size: { default: 12 },
      weight: { default: 700 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.date-label',
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            text: el.textContent ?? '',
            size: parseInt(el.dataset.size ?? '12', 10),
            weight: parseInt(el.dataset.weight ?? '700', 10),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = node.attrs as DateLabelAttrs;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'date-label',
        'data-size': String(attrs.size),
        'data-weight': String(attrs.weight),
        style: `font-size:${attrs.size}px; font-weight:${attrs.weight}; color:hsl(34 76% 44%); margin-right:0.4em`,
      }),
      attrs.text,
    ];
  },

  addCommands() {
    return {
      insertDateLabel:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
