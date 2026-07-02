import type { HomeStats } from '@/features/home/types';

interface StatsGridProps {
  stats: HomeStats[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border bg-card p-4 text-card-foreground">
          <dt className="text-sm text-muted-foreground">{stat.label}</dt>
          <dd className="text-lg font-semibold">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
