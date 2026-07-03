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
          Novo aporte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar aporte</DialogTitle>
          <DialogDescription>
            Informe os dados da compra. Se o ticker já existir na carteira, o custo médio é
            recalculado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <ContributionForm
          formId={FORM_ID}
          onPendingChange={setIsPending}
          onSuccess={() => setOpen(false)}
        />

        <DialogFooter>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isPending ? 'Salvando…' : 'Registrar aporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
