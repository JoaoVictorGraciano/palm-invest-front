import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ContributionForm } from '@/features/portfolio/components/ContributionForm';

const FORM_ID = 'contribution-form';

export function ContributionDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusIcon />
          Nova transação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar transação</DialogTitle>
          <DialogDescription>
            Compras aumentam a posição e recalculam o custo médio; vendas reduzem a quantidade em
            estoque. Se o ticker ainda não existir na carteira, ele é criado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <ContributionForm
          formId={FORM_ID}
          onPendingChange={setIsPending}
          onSuccess={() => setOpen(false)}
        />

        <DialogFooter>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isPending ? 'Salvando…' : 'Registrar transação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
