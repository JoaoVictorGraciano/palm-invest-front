import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction } from '@/features/portfolio/types';
import { formatCurrency } from '@/utils';

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
            <TableHead>Data e Hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead>Corretora</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Preço unitário</TableHead>
            <TableHead className="text-right">Taxas</TableHead>
            <TableHead className="text-right">Valor total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const isSell = transaction.type === TRANSACTION_TYPE.SELL;
            
            const brokerName = (transaction as any).broker || '-';
            const feeValue = Number((transaction as any).fee || 0);
            
            const baseValue = transaction.quantity * transaction.pricePaid;
            const totalValue = isSell ? baseValue - feeValue : baseValue + feeValue;

            // 🚀 Formatação de Data E Hora
            const dateObj = new Date(transaction.purchasedAt);
            const dataFormatada = dateObj.toLocaleDateString('pt-BR');
            const horaFormatada = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <TableRow key={transaction.id}>
                {/* 🚀 Renderizando a Data e Hora com quebra de linha sutil */}
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  <div>{dataFormatada}</div>
                  <div className="text-xs opacity-70">às {horaFormatada}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={isSell ? 'destructive' : 'success'}>{isSell ? 'Venda' : 'Compra'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.ticker}</div>
                  <div className="text-xs text-muted-foreground">{transaction.name}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{brokerName}</TableCell>
                <TableCell className="text-right">{transaction.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(transaction.pricePaid)}</TableCell>
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