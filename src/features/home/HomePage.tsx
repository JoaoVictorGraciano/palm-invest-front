import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/features/home/components/DashboardSkeleton';
import { DashboardSummaryCards } from '@/features/home/components/DashboardSummaryCards';
import { PortfolioDistributionChart } from '@/features/home/components/PortfolioDistributionChart';
import { usePortfolio } from '@/features/portfolio/hooks/usePortfolio';

export function HomePage() {
  const { portfolio, isLoading, isError, refetch } = usePortfolio();

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral consolidada do seu patrimônio.</p>
        </div>
        <Button asChild>
          <Link to="/carteira">Ver Carteira Detalhada</Link>
        </Button>
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          <p>Não foi possível carregar seu dashboard agora. Tente novamente em instantes.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {portfolio && !isLoading && (
        <>
          <DashboardSummaryCards portfolio={portfolio} />
          <PortfolioDistributionChart portfolio={portfolio} />
        </>
      )}
    </section>
  );
}
