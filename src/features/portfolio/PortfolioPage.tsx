import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AssetClassFilter } from '@/features/portfolio/components/AssetClassFilter';
import { AssetTable } from '@/features/portfolio/components/AssetTable';
import { PortfolioSkeleton } from '@/features/portfolio/components/PortfolioSkeleton';
import { PortfolioSummaryCards } from '@/features/portfolio/components/PortfolioSummaryCards';
import { usePortfolio } from '@/features/portfolio/hooks/usePortfolio';
import type { AssetFilter } from '@/features/portfolio/types';

export function PortfolioPage() {
  const { portfolio, isLoading, isError, isFetching, refetch } = usePortfolio();
  const [filter, setFilter] = useState<AssetFilter>('ALL');

  const filteredAssets = useMemo(() => {
    if (!portfolio) return [];
    if (filter === 'ALL') return portfolio.assets;
    return portfolio.assets.filter((asset) => asset.assetClass === filter);
  }, [portfolio, filter]);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{portfolio?.name ?? 'Minha Carteira'}</h1>
        <p className="text-muted-foreground">
          Acompanhe a performance consolidada dos seus ativos.
          {isFetching && !isLoading && ' Atualizando cotações…'}
        </p>
      </div>

      {isLoading && <PortfolioSkeleton />}

      {isError && !isLoading && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          <p>Não foi possível carregar sua carteira agora. Tente novamente em instantes.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {portfolio && !isLoading && (
        <>
          <PortfolioSummaryCards portfolio={portfolio} />

          <div className="flex flex-col gap-4">
            <AssetClassFilter value={filter} onChange={setFilter} />
            <AssetTable assets={filteredAssets} />
          </div>
        </>
      )}
    </section>
  );
}
