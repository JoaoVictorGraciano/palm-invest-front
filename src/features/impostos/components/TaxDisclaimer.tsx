import { TriangleAlertIcon } from 'lucide-react';
import { TAX_DISCLAIMER } from '@/features/impostos/utils/impostos';

/** Aviso fixo no topo da página: fica visível mesmo rolando a tela. */
export function TaxDisclaimer() {
  return (
    <p
      role="note"
      className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-100 p-3 text-sm font-medium text-amber-900 shadow-sm dark:bg-amber-950 dark:text-amber-100"
    >
      <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
      {TAX_DISCLAIMER}
    </p>
  );
}
