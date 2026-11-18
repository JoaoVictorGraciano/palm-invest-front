import { useMemo, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistorySkeleton } from '@/features/portfolio/components/HistorySkeleton';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import { ProventoDialog } from '@/features/proventos/components/ProventoDialog';
import { ProventosBreakdown } from '@/features/proventos/components/ProventosBreakdown';
import { ProventosMonthlyChart } from '@/features/proventos/components/ProventosMonthlyChart';
import { ProventosSummaryCards } from '@/features/proventos/components/ProventosSummaryCards';
import { ProventosTable } from '@/features/proventos/components/ProventosTable';
import { ProventosYearSelect } from '@/features/proventos/components/ProventosYearSelect';
import { useProventos, useProventosResumo } from '@/features/proventos/hooks/useProventos';
import type { Provento } from '@/features/proventos/types';
import { availableYears } from '@/features/proventos/utils/proventos';

export function ProventosPage() {
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const { data: transactions } = useTransactions();
  const resumoQuery = useProventosResumo(ano);
  const proventosQuery = useProventos(ano);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provento | undefined>(undefined);

  const years = useMemo(
    () => availableYears((transactions ?? []).map((transaction) => transaction.purchasedAt)),
    [transactions],
  );

  const isLoading = resumoQuery.isPending || proventosQuery.isPending;
  const isError = resumoQuery.isError || proventosQuery.isError;
  const resumo = resumoQuery.data;
  const proventos = proventosQuery.data ?? [];

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(provento: Provento) {
    setEditing(provento);
    setDialogOpen(true);
  }

  // Depois de salvar, mostra o ano do pagamento, para o provento aparecer na lista.
  function handleSaved(provento: Provento) {
    const year = Number(provento.dataPagamento.slice(0, 4));
    if (Number.isInteger(year) && year !== ano) setAno(year);
  }

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
          <Button variant="outline" onClick={openNew}>
            <PlusIcon />
            Novo provento
          </Button>
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
            <ProventosTable proventos={proventos} ano={ano} onEdit={openEdit} />
          </div>
        </>
      )}

      <ProventoDialog open={dialogOpen} onOpenChange={setDialogOpen} provento={editing} onSaved={handleSaved} />
    </section>
  );
}
