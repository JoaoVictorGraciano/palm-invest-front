import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProventoForm } from '@/features/proventos/components/ProventoForm';
import type { Provento } from '@/features/proventos/types';

const FORM_ID = 'provento-form';

interface ProventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provento em edição; sem ele, o diálogo registra um novo. */
  provento?: Provento;
  onSaved?: (provento: Provento) => void;
}

export function ProventoDialog({ open, onOpenChange, provento, onSaved }: ProventoDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = provento !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar provento' : 'Registrar provento'}</DialogTitle>
          <DialogDescription>
            Dividendos, JCP, rendimentos de FII e amortizações de ativos que você já tem na carteira.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ProventoForm
            key={provento?.id ?? 'novo'}
            formId={FORM_ID}
            proventoToEdit={provento}
            onPendingChange={setIsPending}
            onSuccess={(saved) => {
              onOpenChange(false);
              onSaved?.(saved);
            }}
          />
        )}

        <DialogFooter>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isPending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Registrar provento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
