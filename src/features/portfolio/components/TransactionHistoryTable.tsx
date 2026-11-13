import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ContributionForm } from '@/features/portfolio/components/ContributionForm';
import { useDeleteTransaction } from '@/features/portfolio/hooks/useDeleteTransaction';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction } from '@/features/portfolio/types';
import { formatCurrency } from '@/utils';

const EDIT_FORM_ID = 'edit-transaction-form';

interface TransactionHistoryTableProps {
  transactions: Transaction[];
}

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const deleteMutation = useDeleteTransaction();

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma transação registrada ainda.
      </p>
    );
  }

  return (
    <>
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const isSell = transaction.type === TRANSACTION_TYPE.SELL;
              const brokerName = transaction.broker || '-';
              const obsText = transaction.observation || '-';
              const baseValue = transaction.quantity * transaction.pricePaid;
              const totalValue = isSell ? baseValue - transaction.fee : baseValue + transaction.fee;

              const dateObj = new Date(transaction.purchasedAt);
              const dataFormatada = dateObj.toLocaleDateString('pt-BR');
              const horaFormatada = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              return (
                <TableRow key={transaction.id} className="group">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <div>{dataFormatada}</div><div className="text-xs opacity-70">às {horaFormatada}</div>
                  </TableCell>
                  <TableCell><Badge variant={isSell ? 'destructive' : 'success'}>{isSell ? 'Venda' : 'Compra'}</Badge></TableCell>
                  <TableCell>
                    <div className="font-medium">{transaction.ticker}</div><div className="text-xs text-muted-foreground">{transaction.name}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{brokerName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate" title={obsText}>{obsText}</TableCell>
                  <TableCell className="text-right">{transaction.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(transaction.pricePaid)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(transaction.fee)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(totalValue)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingTransaction(transaction)}
                        className="rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-blue-500 transition-colors"
                        title="Editar transação"
                        aria-label={`Editar transação de ${transaction.ticker}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingTransaction(transaction)}
                        className="rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
                        title="Excluir transação"
                        aria-label={`Excluir transação de ${transaction.ticker}`}
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

      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>

          {editingTransaction && (
            <>
              <ContributionForm
                formId={EDIT_FORM_ID}
                onPendingChange={setIsSaving}
                onSuccess={() => setEditingTransaction(null)}
                transactionToEdit={editingTransaction}
              />
              <div className="flex justify-end pt-4">
                <Button type="submit" form={EDIT_FORM_ID} className="w-full" disabled={isSaving}>
                  {isSaving ? 'Salvando…' : 'Salvar Alterações'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta transação?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction &&
                `${deletingTransaction.type === TRANSACTION_TYPE.SELL ? 'Venda' : 'Compra'} de ${deletingTransaction.quantity} ${deletingTransaction.ticker}. `}
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingTransaction && deleteMutation.mutate(deletingTransaction.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
