import { useState, type FormEvent } from 'react';
import { Lock, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { adminLoginEmail, adminLoginName } from '@/lib/adminAuth';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { AdminLoginFields } from '@/components/AdminLoginFields';
import { useProfile } from '@/hooks/useSession';
import { cn } from '@/lib/cn';

/** Nenápadný zámeček: přihlášení/odhlášení administrátora přímo z webu. */
export function LockLogin() {
  const { session, isAdmin, profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Iniciály z e-mailu ("martin.svec@…" → "MS") pro avatar přihlášeného.
  const emailForInitials = profile?.email ?? session?.user.email ?? '';
  const loginName = adminLoginName(emailForInitials);
  const nameParts = loginName.split('@')[0].split(/[.\-_+\s]+/).filter(Boolean);
  const initials =
    (nameParts.length >= 2
      ? nameParts[0][0] + nameParts[1][0]
      : (nameParts[0] ?? '?').slice(0, 2)
    ).toUpperCase() || '?';

  async function login(e: FormEvent) {
    e.preventDefault();
    const email = adminLoginEmail(identifier);
    if (!email) {
      toast.error('Uživatelské jméno není platné.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(`Přihlášení selhalo: ${error.message}`);
      return;
    }
    toast.success('Přihlášeno');
    setOpen(false);
    setPassword('');
  }

  async function logout() {
    await supabase.auth.signOut();
    toast.success('Odhlášeno');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={session ? 'Účet administrátora' : 'Přihlášení administrátora'}
          title={session ? loginName : 'Přihlášení administrátora'}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors',
            session
              ? isAdmin
                ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30 hover:bg-primary/90'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              : 'text-muted-foreground/50 hover:text-foreground',
          )}
        >
          {session ? (
            <span className="font-heading text-[0.7rem] font-bold leading-none tracking-wide">{initials}</span>
          ) : (
            <Lock className="h-4 w-4" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        {session ? (
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-heading">{loginName}</div>
              <div className="text-xs text-muted-foreground">
                {isAdmin ? 'Administrátor — editace aktivní' : 'Přihlášen (bez práv editace)'}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Odhlásit
            </Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={login}>
            <AdminLoginFields
              idPrefix="inline-admin"
              identifier={identifier}
              password={password}
              onIdentifierChange={setIdentifier}
              onPasswordChange={setPassword}
            />
            <Button type="submit" size="sm" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Přihlásit
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
