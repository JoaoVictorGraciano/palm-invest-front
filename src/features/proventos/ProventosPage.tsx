import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { HistorySkeleton } from '@/features/portfolio/components/HistorySkeleton';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import { ProventosBreakdown } from '@/features/proventos/components/ProventosBreakdown';
import { ProventosMonthlyChart } from '@/features/proventos/components/ProventosMonthlyChart';
import { ProventosSummaryCards } from '@/features/proventos/components/ProventosSummaryCards';
import { ProventosTable } from '@/features/proventos/components/ProventosTable';
import { ProventosYearSelect } from '@/features/proventos/components/ProventosYearSelect';
import { useProventos, useProventosResumo } from '@/features/proventos/hooks/useProventos';
import { availableYears } from '@/features/proventos/utils/proventos';

export function ProventosPage() {
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const { data: transactions } = useTransactions();
  const resumoQuery = useProventosResumo(ano);
  const proventosQuery = useProventos(ano);

  const years = useMemo(
    () => availableYears((transactions ?? []).map((transaction) => transaction.purchasedAt)),
    [transactions],
  );

  const isLoading = resumoQuery.isPending || proventosQuery.isPending;
  const isError = resumoQuery.isError || proventosQuery.isError;
  const resumo = resumoQuery.data;
  const proventos = proventosQuery.data ?? [];

  function retry() {
    void resumoQuery.refetch();
    void proventosQuery.refetch();
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Proventos</h1>
          <p className="text-muted-foreground">Dividendos, JCP, rendimentos e amortizações recebidos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProventosYearSelect value={ano} years={years} onChange={setAno} />
        </div>
      </div>

      {isLoading && <HistorySkeleton />}

      {isError && !isLoading && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          <p>Não foi possível carregar os proventos agora. Tente novamente em instantes.</p>
          <Button size="sm" variant="outline" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && resumo && (
        <>
          <ProventosSummaryCards resumo={resumo} />
          {resumo.totalLiquido > 0 && (
            <>
              <ProventosMonthlyChart resumo={resumo} />
              <ProventosBreakdown resumo={resumo} />
            </>
          )}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Proventos de {ano}</h2>
            <ProventosTable proventos={proventos} ano={ano} />
          </div>
        </>
      )}
    </section>
  );
}
