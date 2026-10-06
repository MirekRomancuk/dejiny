import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="container py-16 text-center">
      <h1 className="font-heading text-6xl text-primary">404</h1>
      <p className="mt-3 text-lg text-muted-foreground">Stránka nenalezena.</p>
      <Button asChild className="mt-6">
        <Link to="/">Zpět na hlavní stránku</Link>
      </Button>
    </div>
  );
}
