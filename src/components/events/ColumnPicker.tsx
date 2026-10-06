import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TYPE_CODES, TYPE_LABELS_SHORT, type TypeCode } from '@/types/domain';

interface Props {
  value: TypeCode[];
  onChange: (next: TypeCode[]) => void;
}

export function ColumnPicker({ value, onChange }: Props) {
  function toggle(code: TypeCode, checked: boolean) {
    if (checked) {
      const next = [...value, code].filter((c, i, a) => a.indexOf(c) === i);
      onChange(TYPE_CODES.filter((c) => next.includes(c))); // preserve canonical order
    } else {
      onChange(value.filter((c) => c !== code));
    }
  }
  return (
    <div className="space-y-2">
      {TYPE_CODES.map((code) => (
        <div key={code} className="flex items-center gap-2">
          <Checkbox
            id={`col-${code}`}
            checked={value.includes(code)}
            onCheckedChange={(c) => toggle(code, c === true)}
          />
          <Label htmlFor={`col-${code}`} className="cursor-pointer">
            {TYPE_LABELS_SHORT[code]}
          </Label>
        </div>
      ))}
    </div>
  );
}
