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
            <TableHead>Corretora</TableHead> {/* 🚀 NOVA COLUNA */}
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Preço unitário</TableHead>
            <TableHead className="text-right">Taxas</TableHead> {/* 🚀 NOVA COLUNA */}
            <TableHead className="text-right">Valor total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const isSell = transaction.type === TRANSACTION_TYPE.SELL;
            
            // Usamos "as any" temporariamente para o TypeScript não reclamar das variáveis novas
            const brokerName = (transaction as any).broker || '-';
            const feeValue = Number((transaction as any).fee || 0);
            
            // Matemática financeira real: 
            // Na compra, a taxa aumenta seu custo. Na venda, a taxa diminui seu resgate.
            const baseValue = transaction.quantity * transaction.pricePaid;
            const totalValue = isSell ? baseValue - feeValue : baseValue + feeValue;

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
                {/* 🚀 CELULAS NOVAS */}
                <TableCell className="text-muted-foreground">{brokerName}</TableCell>
                
                <TableCell className="text-right">{transaction.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(transaction.pricePaid)}</TableCell>
                
                {/* 🚀 TAXA */}
                <TableCell className="text-right text-muted-foreground">{formatCurrency(feeValue)}</TableCell>
                
                <TableCell className="text-right font-medium">{formatCurrency(totalValue)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}