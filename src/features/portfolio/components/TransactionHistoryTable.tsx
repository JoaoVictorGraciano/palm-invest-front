import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction } from '@/features/portfolio/types';
import { formatCurrency, formatDate } from '@/utils';

interface TransactionHistoryTableProps {
  transactions: Transaction[];
}

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma transação registrada ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Preço unitário</TableHead>
            <TableHead className="text-right">Valor total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            // Transações salvas antes da distinção compra/venda existir não têm `type` —
            // tratamos como compra, igual à lógica de agregação em `getHoldingsFromTransactions`.
            const isSell = transaction.type === TRANSACTION_TYPE.SELL;
            const totalValue = transaction.quantity * transaction.pricePaid;

            return (
              <TableRow key={transaction.id}>
                <TableCell className="text-muted-foreground">{formatDate(transaction.purchasedAt)}</TableCell>
                <TableCell>
                  <Badge variant={isSell ? 'destructive' : 'success'}>{isSell ? 'Venda' : 'Compra'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.ticker}</div>
                  <div className="text-xs text-muted-foreground">{transaction.name}</div>
                </TableCell>
                <TableCell className="text-right">{transaction.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(transaction.pricePaid)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(totalValue)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
