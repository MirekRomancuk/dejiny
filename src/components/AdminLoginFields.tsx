import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminLoginFieldsProps {
  idPrefix: string;
  identifier: string;
  password: string;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

export function AdminLoginFields({
  idPrefix,
  identifier,
  password,
  onIdentifierChange,
  onPasswordChange,
}: AdminLoginFieldsProps) {
  const usernameId = `${idPrefix}-username`;
  const passwordId = `${idPrefix}-password`;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={usernameId}>Uživatelské jméno</Label>
        <Input
          id={usernameId}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={identifier}
          onChange={(event) => onIdentifierChange(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={passwordId}>Heslo</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </div>
    </>
  );
}
