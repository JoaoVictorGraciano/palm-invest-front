import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { YearSelect } from '@/components/YearSelect';
import { HistorySkeleton } from '@/features/portfolio/components/HistorySkeleton';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import { ExemptionLimitBars } from '@/features/impostos/components/ExemptionLimitBars';
import { MonthlyResults } from '@/features/impostos/components/MonthlyResults';
import { ResultadosResumo } from '@/features/impostos/components/ResultadosResumo';
import { TaxAlerts } from '@/features/impostos/components/TaxAlerts';
import { TaxDisclaimer } from '@/features/impostos/components/TaxDisclaimer';
import { useResultados } from '@/features/impostos/hooks/useResultados';
import { availableYears } from '@/features/proventos/utils/proventos';

export function ImpostosPage() {
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const { data: transactions } = useTransactions();
  const { data: resultados, isPending, isError, refetch } = useResultados(ano);

  const years = useMemo(
    () => availableYears((transactions ?? []).map((transaction) => transaction.purchasedAt)),
    [transactions],
  );

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <TaxDisclaimer />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Impostos</h1>
          <p className="text-muted-foreground">
            Resultado das vendas por mês, isenções, prejuízo a compensar e imposto de renda estimado.
          </p>
        </div>
        <YearSelect value={ano} years={years} onChange={setAno} />
      </div>

      <ExemptionLimitBars />

      {isPending && <HistorySkeleton />}

      {isError && !isPending && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          <p>Não foi possível carregar os resultados agora. Tente novamente em instantes.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {resultados && !isPending && !isError && (
        <>
          <TaxAlerts alertas={resultados.alertas} />
          <ResultadosResumo resultados={resultados} />
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Mês a mês em {ano}</h2>
            <MonthlyResults meses={resultados.meses} ano={ano} />
          </div>
        </>
      )}
    </section>
  );
}
