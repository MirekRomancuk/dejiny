export const qk = {
  events: {
    all: ['events', 'all'] as const,
    list: (filters?: Record<string, unknown>) => ['events', 'list', filters] as const,
    one: (id: number) => ['events', 'one', id] as const,
    version: ['events', 'version'] as const,
  },
  rulers: ['rulers'] as const,
  eventTypes: ['event-types'] as const,
  pages: {
    all: ['pages', 'all'] as const,
    one: (slug: string) => ['pages', slug] as const,
  },
  pageBlocks: (slug: string) => ['page-blocks', slug] as const,
  calendar: ['calendar'] as const,
  session: ['session'] as const,
  settings: ['settings'] as const,
  images: ['images'] as const,
  bibliography: ['bibliography'] as const,
};
