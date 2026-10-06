import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Upload, CalendarDays, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [events, pages, calendar] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('pages').select('id', { count: 'exact', head: true }),
        supabase.from('calendar_events').select('id', { count: 'exact', head: true }),
      ]);
      return {
        events: events.count ?? 0,
        pages: pages.count ?? 0,
        calendar: calendar.count ?? 0,
      };
    },
  });

  const cards = [
    { label: 'Události', value: stats?.events ?? '—', to: '/admin/events', icon: FileText },
    { label: 'Stránky', value: stats?.pages ?? '—', to: '/admin/pages', icon: FileText },
    { label: 'Kalendář', value: stats?.calendar ?? '—', to: '/admin/calendar', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl">Přehled</h1>
        <p className="text-muted-foreground">Administrace webu Dějiny Koruny české</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 font-heading text-3xl">{c.value}</div>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/admin/events/new">
            <FileText className="mr-2 h-4 w-4" />
            Nová událost
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/import">
            <Upload className="mr-2 h-4 w-4" />
            Import z Excelu
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/images">
            <ImageIcon className="mr-2 h-4 w-4" />
            Obrázky
          </Link>
        </Button>
      </div>
    </div>
  );
}
