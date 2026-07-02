import { Button } from '@/components/ui/button';
import { StatsGrid } from '@/features/home/components/StatsGrid';
import { useHomeStats } from '@/features/home/hooks/useHomeStats';

export function HomePage() {
  const stats = useHomeStats();

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Palm Invest</h1>
        <p className="text-muted-foreground">
          Estrutura inicial enterprise com Vite, React, TypeScript, Tailwind CSS, shadcn/ui e
          React Router.
        </p>
      </div>

      <StatsGrid stats={stats} />

      <div>
        <Button>Começar</Button>
      </div>
    </section>
  );
}
