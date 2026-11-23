import { CircleAlertIcon } from 'lucide-react';
import type { Alerta } from '@/features/impostos/types';
import { alertaLabel, formatMonth } from '@/features/impostos/utils/impostos';
import { formatPaymentDate } from '@/features/proventos/utils/proventos';

/** Alertas do ano (ex: possível day trade, DARF abaixo do mínimo). */
export function TaxAlerts({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null;

  return (
    <section aria-label="Alertas" className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
      <h2 className="text-lg font-semibold tracking-tight">Alertas</h2>
      <ul className="flex flex-col gap-3">
        {alertas.map((alerta, index) => (
          <li key={`${alerta.tipo}-${alerta.mes}-${alerta.ticker ?? ''}-${index}`} className="flex gap-2 text-sm">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-medium">
                {alertaLabel(alerta.tipo)}
                {alerta.ticker && ` · ${alerta.ticker}`}
                <span className="font-normal text-muted-foreground">
                  {' · '}
                  {alerta.data ? formatPaymentDate(alerta.data) : formatMonth(alerta.mes)}
                </span>
              </p>
              {alerta.mensagem && <p className="text-muted-foreground">{alerta.mensagem}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
