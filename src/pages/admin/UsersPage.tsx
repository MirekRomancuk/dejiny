import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shield, ShieldCheck, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { useProfile } from '@/hooks/useSession';

interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

export function UsersPage() {
  const qc = useQueryClient();
  const me = useProfile();

  const { data, isLoading, error } = useQuery<Profile[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_admin, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_admin }: { id: string; is_admin: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.is_admin ? 'Admin přístup udělen' : 'Admin přístup odebrán');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;
  if (error) return <EmptyState title="Chyba načítání" description={error.message} />;

  const adminCount = data?.filter((u) => u.is_admin).length ?? 0;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-heading text-3xl">Uživatelé</h1>
        <p className="text-sm text-muted-foreground">
          {data?.length ?? 0} uživatelů, z toho {adminCount} administrátorů.
          Registrace je otevřená pro všechny — admin přístup uděluje stávající admin.
        </p>
      </header>

      {(data ?? []).length === 0 ? (
        <EmptyState title="Žádní uživatelé" />
      ) : (
        <div className="rounded-md border border-border bg-card">
          <div className="grid grid-cols-[40px_1fr_120px_140px_160px] gap-2 border-b border-border bg-secondary/30 px-3 py-2 font-heading text-xs uppercase tracking-wide text-muted-foreground">
            <div></div>
            <div>E-mail</div>
            <div>Stav</div>
            <div>Registrace</div>
            <div className="text-right">Akce</div>
          </div>
          {(data ?? []).map((u) => {
            const isSelf = u.id === me.profile?.id;
            return (
              <div
                key={u.id}
                className="grid grid-cols-[40px_1fr_120px_140px_160px] items-center gap-2 border-b border-border/40 px-3 py-2.5 text-sm hover:bg-accent/20 last:border-0"
              >
                <div className="flex justify-center">
                  {u.is_admin ? (
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="font-mono text-xs">
                  {u.email}
                  {isSelf && <span className="ml-2 text-muted-foreground">(vy)</span>}
                </div>
                <div>
                  {u.is_admin ? (
                    <Badge variant="default">Admin</Badge>
                  ) : (
                    <Badge variant="outline">Uživatel</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('cs-CZ')}
                </div>
                <div className="flex justify-end">
                  {isSelf ? (
                    <span className="text-xs text-muted-foreground">— sebe nelze měnit —</span>
                  ) : u.is_admin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(`Odebrat admin přístup uživateli ${u.email}?`)) {
                          toggle.mutate({ id: u.id, is_admin: false });
                        }
                      }}
                      disabled={toggle.isPending}
                    >
                      <Shield className="mr-1 h-4 w-4" />
                      Odebrat admin
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => toggle.mutate({ id: u.id, is_admin: true })}
                      disabled={toggle.isPending}
                    >
                      <ShieldCheck className="mr-1 h-4 w-4" />
                      Udělit admin
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
