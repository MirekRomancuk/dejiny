import { Link, NavLink } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: 'Události', end: true },
  { to: '/kalendar', label: 'Kalendář' },
  { to: '/popis', label: 'Popis' },
  { to: '/vysvetlivky', label: 'Vysvětlivky' },
  { to: '/verze', label: 'Verze' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Crown className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <span className="font-heading text-base font-semibold tracking-wide sm:text-lg">
            Dějiny Koruny české
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <ThemeToggle />
        </nav>
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
