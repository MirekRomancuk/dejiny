import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Crown,
  LayoutDashboard,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  Settings,
  Upload,
  LogOut,
  Users,
  Library,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from './ThemeToggle';

const ITEMS = [
  { to: '/admin', label: 'Přehled', icon: LayoutDashboard, end: true },
  { to: '/admin/events', label: 'Události', icon: FileText },
  { to: '/admin/import', label: 'Import Excelu', icon: Upload },
  { to: '/admin/pages', label: 'Stránky (CMS)', icon: FileText },
  { to: '/admin/bibliography', label: 'Použitá literatura', icon: Library },
  { to: '/admin/calendar', label: 'Kalendář', icon: CalendarDays },
  { to: '/admin/images', label: 'Obrázky', icon: ImageIcon },
  { to: '/admin/users', label: 'Uživatelé', icon: Users },
  { to: '/admin/settings', label: 'Nastavení', icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-background">
      <aside className="border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Crown className="h-6 w-6 text-primary" />
          <Link to="/" className="font-heading text-lg">
            DKČ <span className="text-muted-foreground">admin</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/50',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-end gap-2 border-b border-border bg-background px-6">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/admin/login', { replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
