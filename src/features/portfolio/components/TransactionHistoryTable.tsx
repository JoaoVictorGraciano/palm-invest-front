import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction } from '@/features/portfolio/types';
import { formatCurrency } from '@/utils';
import { Trash2, Pencil } from 'lucide-react'; // 🚀 Importando os ícones mágicos

interface TransactionHistoryTableProps {
  transactions: Transaction[];
}

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  
  // 🚀 LÓGICA DE EXCLUSÃO (Deleta do Java)
  async function handleDelete(id: string) {
    const confirm = window.confirm("Tem certeza que deseja excluir esta transação?");
    if (!confirm) return;

    try {
      const response = await fetch(`http://localhost:8080/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert("Transação excluída com sucesso!");
        window.location.reload(); 
      } else {
        alert("Erro ao excluir. O seu Spring Boot tem a rota DELETE?");
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Falha de conexão. O servidor está ligado?");
    }
  }

  // 🚀 LÓGICA DE EDIÇÃO (Placeholder)
  function handleEdit(transaction: Transaction) {
    alert(`Editar transação do ativo ${transaction.ticker} em breve!`);
    // Aqui no futuro a gente abre um modal de edição com os dados preenchidos
  }

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
            <TableHead>Observação</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Preço unitário</TableHead>
            <TableHead className="text-right">Taxas</TableHead>
            <TableHead className="text-right">Valor total</TableHead>
            <TableHead className="text-right">Ações</TableHead> {/* 🚀 NOVA COLUNA */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const isSell = transaction.type === TRANSACTION_TYPE.SELL;
            
            const brokerName = (transaction as any).broker || '-';
            const feeValue = Number((transaction as any).fee || 0);
            const obsText = (transaction as any).observation || '-';
            
            const baseValue = transaction.quantity * transaction.pricePaid;
            const totalValue = isSell ? baseValue - feeValue : baseValue + feeValue;

            const dateObj = new Date(transaction.purchasedAt);
            const dataFormatada = dateObj.toLocaleDateString('pt-BR');
            const horaFormatada = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <TableRow key={transaction.id} className="group">
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
                
                <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate" title={obsText}>
                  {obsText}
                </TableCell>

                <TableCell className="text-right">{transaction.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(transaction.pricePaid)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(feeValue)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(totalValue)}</TableCell>
                
                {/* 🚀 BOTÕES DE AÇÃO: Aparecem no final com hover sutil */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-blue-500 transition-colors"
                      title="Editar transação"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
                      title="Excluir transação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}