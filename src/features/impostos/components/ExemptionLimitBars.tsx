import { useLimiteIsencao } from '@/features/impostos/hooks/useResultados';
import type { LimiteCategoria } from '@/features/impostos/types';
import { currentMonth, formatMonth, formatThousands } from '@/features/impostos/utils/impostos';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils';

function LimitBar({ label, limite }: { label: string; limite: LimiteCategoria }) {
  const share = limite.limite > 0 ? Math.min(100, (limite.vendido / limite.limite) * 100) : 0;
  const color = !limite.dentroDoLimite ? 'bg-red-500' : share >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {formatCurrency(limite.vendido)} <span className="text-muted-foreground">de {formatThousands(limite.limite)}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Vendas de ${label.toLowerCase()} no mês`}
        aria-valuemin={0}
        aria-valuemax={limite.limite}
        aria-valuenow={Math.min(limite.vendido, limite.limite)}
        aria-valuetext={`${formatCurrency(limite.vendido)} de ${formatCurrency(limite.limite)}`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn('h-full rounded-full', color)} style={{ width: `${share}%` }} />
      </div>
      <p className={cn('text-xs', limite.dentroDoLimite ? 'text-muted-foreground' : 'font-medium text-red-600 dark:text-red-400')}>
        {limite.dentroDoLimite
          ? `Ainda cabem ${formatCurrency(limite.disponivel)} na isenção.`
          : 'Acima do limite: o lucro do mês nesta categoria fica tributável.'}
      </p>
    </div>
  );
}

/** Vendas do mês corrente em ações e cripto, comparadas ao limite de isenção. */
export function ExemptionLimitBars() {
  const mes = currentMonth();
  const { data, isPending, isError } = useLimiteIsencao(mes);

  return (
    <section
      aria-label="Limite de isenção do mês"
      className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground"
    >
      <h2 className="text-lg font-semibold tracking-tight">Limite de isenção em {formatMonth(mes)}</h2>
      {isPending && <div className="h-16 animate-pulse rounded-lg bg-muted/50" />}
      {isError && <p className="text-sm text-muted-foreground">Não foi possível carregar as vendas do mês.</p>}
      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <LimitBar label="Ações" limite={data.acoes} />
          <LimitBar label="Cripto" limite={data.cripto} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Conta o total vendido no mês (quantidade × preço). Ações: só ações, sem ETF, BDR e FII. Cripto: todas as moedas
        somadas.
      </p>
    </section>
  );
}
