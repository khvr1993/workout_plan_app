import { Card } from '../ui/Card';

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1 !p-4 lg:!p-5">
      <span className="text-label text-text-muted">{label}</span>
      <span className="text-h1 text-text tnum">{value}</span>
      {hint && <span className="text-body-sm text-text-muted">{hint}</span>}
    </Card>
  );
}