import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useProfile } from '@/hooks/useSession';
import { Loading } from '@/components/common/Loading';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, profile, isAdmin, loading } = useProfile();
  const location = useLocation();

  if (loading) return <Loading label="Ověřuji přístup…" />;

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  // Logged in but not admin → friendly access denied screen
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="font-heading text-2xl">Nemáte oprávnění</h1>
          <p className="text-sm text-muted-foreground">
            Jste přihlášený jako <strong>{profile?.email}</strong>, ale váš účet zatím nemá administrátorská oprávnění.
            Kontaktujte administrátora, aby vám oprávnění přidělil.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button asChild variant="outline">
              <a href="/">Zpět na web</a>
            </Button>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/admin/login';
              }}
            >
              Odhlásit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
