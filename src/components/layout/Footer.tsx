import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border/50 py-6 text-center">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground md:flex-row md:text-sm">
        <p>© {new Date().getFullYear()} Dějiny Koruny české</p>
        <nav className="flex gap-4">
          <Link to="/popis" className="hover:text-foreground">O projektu</Link>
          <Link to="/verze" className="hover:text-foreground">Verze</Link>
          <Link to="/admin/login" className="hover:text-foreground">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
