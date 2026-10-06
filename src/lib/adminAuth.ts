const ADMIN_EMAIL_SUFFIX = '@admin.dejinykorunyceske.cz';
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function adminLoginEmail(identifier: string): string | null {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('@')) return normalized;
  if (!USERNAME_PATTERN.test(normalized)) return null;
  return `${normalized}${ADMIN_EMAIL_SUFFIX}`;
}

export function adminLoginName(email: string): string {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(ADMIN_EMAIL_SUFFIX)
    ? normalized.slice(0, -ADMIN_EMAIL_SUFFIX.length)
    : normalized;
}
