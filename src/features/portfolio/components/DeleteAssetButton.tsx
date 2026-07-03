import { Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteAsset } from '@/features/portfolio/hooks/useDeleteAsset';

interface DeleteAssetButtonProps {
  ticker: string;
}

/** Botão de lixeira com confirmação, para remover um ativo (e todo o seu histórico) da carteira. */
export function DeleteAssetButton({ ticker }: DeleteAssetButtonProps) {
  const { mutate, isPending } = useDeleteAsset();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remover ${ticker} da carteira`}
        >
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {ticker} da carteira?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso apaga permanentemente todo o histórico de transações de {ticker}. Essa ação não
            pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate(ticker)}
          >
            {isPending ? 'Removendo…' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
