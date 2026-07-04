import { Button } from '@/components/ui/button';
import { HistorySkeleton } from '@/features/portfolio/components/HistorySkeleton';
import { TransactionHistoryTable } from '@/features/portfolio/components/TransactionHistoryTable';
import { useTransactionHistory } from '@/features/portfolio/hooks/useTransactionHistory';

export function HistoryPage() {
  const { transactions, isLoading, isError, refetch } = useTransactionHistory();

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Histórico de transações</h1>
        <p className="text-muted-foreground">Extrato completo de compras e vendas registradas na carteira.</p>
      </div>

      {isLoading && <HistorySkeleton />}

      {isError && !isLoading && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          <p>Não foi possível carregar o extrato agora. Tente novamente em instantes.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && <TransactionHistoryTable transactions={transactions} />}
    </section>
  );
}
