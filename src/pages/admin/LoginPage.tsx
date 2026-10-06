import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminLoginEmail } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { AdminLoginFields } from '@/components/AdminLoginFields';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/admin';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = adminLoginEmail(identifier);
    if (!email) {
      toast.error('Uživatelské jméno není platné.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(`Přihlášení selhalo: ${error.message}`);
      return;
    }
    toast.success('Přihlášení úspěšné');
    navigate(from, { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Crown className="h-8 w-8 text-primary" strokeWidth={1.5} />
          <div>
            <h1 className="font-heading text-2xl">Administrace</h1>
            <p className="text-xs text-muted-foreground">Dějiny Koruny české</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <AdminLoginFields
            idPrefix="admin"
            identifier={identifier}
            password={password}
            onIdentifierChange={setIdentifier}
            onPasswordChange={setPassword}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Přihlašuji…' : 'Přihlásit se'}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-xs">
          <Link to="/admin/register" className="text-muted-foreground hover:underline">
            Nemám účet → Registrace
          </Link>
          <Link to="/" className="text-muted-foreground hover:underline">
            ← Zpět na web
          </Link>
        </div>
      </div>
    </div>
  );
}
