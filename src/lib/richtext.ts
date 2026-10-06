import DOMPurify from 'dompurify';

const ALLOWED_ATTRS = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height',
  'class', 'style',
  'data-icon', 'data-size', 'data-weight', 'data-align', 'data-lightbox', 'data-caption',
  // SVG attributes (needed after iconHydrator runs, but also if HTML contains literal SVG)
  'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points',
  'xmlns', 'aria-hidden', 'focusable',
];

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'strong', 'em', 'u', 's', 'sub', 'sup',
      'a', 'img', 'i',
      'figure', 'figcaption',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      // SVG (used by iconHydrator)
      'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g',
    ],
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: false,
  });
}
