import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Props {
  from: number | null;
  to: number | null;
  onChange: (next: { from: number | null; to: number | null }) => void;
}

const PRESETS: Array<{ label: string; from: number | null; to: number | null }> = [
  { label: 'Vše',           from: null, to: null },
  { label: 'Pravěk',        from: null, to: 0 },
  { label: 'Raný středověk', from: 500, to: 1000 },
  { label: 'Středověk',     from: 1000, to: 1500 },
  { label: 'Lucemburkové',  from: 1310, to: 1437 },
  { label: 'Jagellonci',    from: 1471, to: 1526 },
  { label: 'Habsburkové',   from: 1526, to: 1918 },
  { label: 'Husitství',     from: 1419, to: 1471 },
  { label: 'Novověk',       from: 1500, to: 1918 },
  { label: '20. století',   from: 1900, to: 2000 },
];

export function YearRangeFilter({ from, to, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="yr-from" className="text-xs">Od</Label>
          <Input
            id="yr-from"
            type="number"
            value={from ?? ''}
            onChange={(e) => onChange({ from: e.target.value === '' ? null : parseInt(e.target.value, 10), to })}
            placeholder="-70000"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="yr-to" className="text-xs">Do</Label>
          <Input
            id="yr-to"
            type="number"
            value={to ?? ''}
            onChange={(e) => onChange({ from, to: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
            placeholder="2026"
          />
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Rychlý výběr:</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onChange({ from: p.from, to: p.to })}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
