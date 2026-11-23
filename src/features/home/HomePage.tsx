import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/features/home/components/DashboardSkeleton';
import { DashboardSummaryCards } from '@/features/home/components/DashboardSummaryCards';
import { PortfolioDistributionChart } from '@/features/home/components/PortfolioDistributionChart';
import { usePortfolio } from '@/features/portfolio/hooks/usePortfolio';
import { useRealizedProfitByTicker } from '@/features/portfolio/hooks/useRealizedProfitByTicker';
import { useProventosResumo } from '@/features/proventos/hooks/useProventos';
import { useProventosByTicker } from '@/features/proventos/hooks/useProventosByTicker';

export function HomePage() {
  const { portfolio, isLoading, isError, refetch } = usePortfolio();
  const currentYear = new Date().getFullYear();
  const incomeByTicker = useProventosByTicker();
  const realizedByTicker = useRealizedProfitByTicker();
  const { data: resumo } = useProventosResumo(currentYear);

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
          <DashboardSummaryCards
            portfolio={portfolio}
            realizedByTicker={realizedByTicker}
            incomeByTicker={incomeByTicker}
            incomeThisYear={resumo?.ano === currentYear ? resumo.totalLiquido : undefined}
            currentYear={currentYear}
          />
          <PortfolioDistributionChart portfolio={portfolio} />
        </>
      )}
    </section>
  );
}
