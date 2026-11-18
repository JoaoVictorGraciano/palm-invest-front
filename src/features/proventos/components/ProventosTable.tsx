import { useState } from 'react';
import { PencilIcon, Trash2Icon } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDeleteProvento } from '@/features/proventos/hooks/useDeleteProvento';
import type { Provento } from '@/features/proventos/types';
import { TIPO_PROVENTO_COLOR, TIPO_PROVENTO_LABEL, formatPaymentDate } from '@/features/proventos/utils/proventos';
import { formatCurrency } from '@/utils';

interface ProventosTableProps {
  proventos: Provento[];
  ano: number;
  onEdit?: (provento: Provento) => void;
}

export function ProventosTable({ proventos, ano, onEdit }: ProventosTableProps) {
  const [deleting, setDeleting] = useState<Provento | null>(null);
  const deleteMutation = useDeleteProvento();

  if (proventos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum provento registrado em {ano}.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label={`Proventos de ${ano}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Pagamento</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">IR retido</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proventos.map((provento) => {
              const description = `${TIPO_PROVENTO_LABEL[provento.tipo]} de ${provento.ticker} em ${formatPaymentDate(provento.dataPagamento)}`;
              return (
                <TableRow key={provento.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatPaymentDate(provento.dataPagamento)}
                  </TableCell>
                  <TableCell className="font-medium">{provento.ticker}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: TIPO_PROVENTO_COLOR[provento.tipo] }}
                        aria-hidden="true"
                      />
                      {TIPO_PROVENTO_LABEL[provento.tipo]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(provento.valorBruto)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(provento.irRetido)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(provento.valorLiquido)}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-xs text-muted-foreground" title={provento.observacao}>
                    {provento.observacao || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground"
                          aria-label={`Editar ${description}`}
                          onClick={() => onEdit(provento)}
                        >
                          <PencilIcon />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Excluir ${description}`}
                        onClick={() => setDeleting(provento)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este provento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `${TIPO_PROVENTO_LABEL[deleting.tipo]} de ${deleting.ticker} pago em ${formatPaymentDate(deleting.dataPagamento)}, líquido de ${formatCurrency(deleting.valorLiquido)}. `}
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
