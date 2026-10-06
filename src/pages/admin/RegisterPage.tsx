import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      toast.error('Hesla se neshodují');
      return;
    }
    if (password.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(`Registrace selhala: ${error.message}`);
      return;
    }
    if (data.user && !data.session) {
      toast.success('Účet vytvořen. Zkontrolujte e-mail a potvrďte registraci.');
      navigate('/admin/login');
      return;
    }
    toast.success('Účet vytvořen. Pro přístup do administrace ho administrátor musí potvrdit.');
    navigate('/admin/login');
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Crown className="h-8 w-8 text-primary" strokeWidth={1.5} />
          <div>
            <h1 className="font-heading text-2xl">Registrace</h1>
            <p className="text-xs text-muted-foreground">Dějiny Koruny české</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Heslo (min. 6 znaků)</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password2">Heslo znovu</Label>
            <Input
              id="password2"
              type="password"
              autoComplete="new-password"
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registruji…' : 'Vytvořit účet'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Účty po registraci nemají přístup do administrace - musí je potvrdit existující admin.
          </p>
        </form>
        <div className="mt-4 flex justify-between text-xs">
          <Link to="/admin/login" className="text-muted-foreground hover:underline">
            ← Mám účet, přihlásit
          </Link>
          <Link to="/" className="text-muted-foreground hover:underline">
            Zpět na web
          </Link>
        </div>
      </div>
    </div>
  );
}
