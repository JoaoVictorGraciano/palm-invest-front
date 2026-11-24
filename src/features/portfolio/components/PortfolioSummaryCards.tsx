import type { Portfolio } from '@/types';
import { cn } from '@/lib/utils';
import { calculateTotalResult, formatCurrency, formatPercentage, sumByTicker } from '@/utils';

interface PortfolioSummaryCardsProps {
  portfolio: Portfolio;
  /** Lucro realizado nas vendas, por ticker (todos os ativos, inclusive os já vendidos por inteiro). */
  realizedByTicker?: ReadonlyMap<string, number>;
  /** Proventos líquidos recebidos por ticker (todos os ativos); `undefined` enquanto carregam ou se falharem. */
  incomeByTicker?: ReadonlyMap<string, number>;
}

function resultColor(value: number) {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export function PortfolioSummaryCards({ portfolio, realizedByTicker, incomeByTicker }: PortfolioSummaryCardsProps) {
  const realized = realizedByTicker ? sumByTicker(realizedByTicker) : undefined;
  const income = incomeByTicker ? sumByTicker(incomeByTicker) : undefined;
  const complete = realized !== undefined && income !== undefined;
  const result = calculateTotalResult(realized ?? 0, portfolio.profit, income ?? 0);

  const cards = [
    { label: 'Investido', value: formatCurrency(portfolio.totalInvested), detail: 'Custo das posições atuais' },
    { label: 'Valor atual', value: formatCurrency(portfolio.currentValue), detail: 'Pela cotação atual' },
    {
      label: 'Lucro em aberto',
      value: formatCurrency(result.open),
      detail: `${formatPercentage(portfolio.profitPercentage)} · valorização do que você tem`,
      colorClass: resultColor(result.open),
    },
    {
      label: 'Lucro realizado',
      value: realized === undefined ? '—' : formatCurrency(realized),
      detail: 'Nas vendas já feitas',
      colorClass: realized === undefined ? undefined : resultColor(realized),
    },
    {
      label: 'Proventos',
      value: income === undefined ? '—' : formatCurrency(income),
      detail: income === undefined ? 'Indisponível no momento' : 'Líquidos recebidos',
      colorClass: income === undefined ? undefined : 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Resultado total',
      value: complete ? formatCurrency(result.total) : '—',
      detail: 'Realizado + em aberto + proventos',
      colorClass: complete ? resultColor(result.total) : undefined,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-card p-4 text-card-foreground">
          <dt className="text-sm text-muted-foreground">{card.label}</dt>
          <dd className={cn('text-lg font-semibold tabular-nums', card.colorClass)}>{card.value}</dd>
          <dd className="text-xs text-muted-foreground">{card.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
