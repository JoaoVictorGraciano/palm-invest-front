import type { Portfolio } from '@/types';
import { cn } from '@/lib/utils';
import { calculateTotalReturn, formatCurrency, formatPercentage, sumIncomeOfAssets } from '@/utils';

interface PortfolioSummaryCardsProps {
  portfolio: Portfolio;
  /** Proventos líquidos recebidos por ticker; `undefined` enquanto carregam ou se falharem. */
  incomeByTicker?: ReadonlyMap<string, number>;
}

function resultColor(value: number) {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export function PortfolioSummaryCards({ portfolio, incomeByTicker }: PortfolioSummaryCardsProps) {
  const income = incomeByTicker ? sumIncomeOfAssets(portfolio.assets, incomeByTicker) : undefined;
  const result = calculateTotalReturn(portfolio.totalInvested, portfolio.profit, income ?? 0);

  const cards = [
    { label: 'Investido', value: formatCurrency(portfolio.totalInvested) },
    { label: 'Valor atual', value: formatCurrency(portfolio.currentValue) },
    {
      label: 'Valorização',
      value: formatCurrency(result.appreciation),
      detail: `${formatPercentage(result.appreciationPercentage)} sobre o investido`,
      colorClass: resultColor(result.appreciation),
    },
    {
      label: 'Proventos recebidos',
      value: income === undefined ? '—' : formatCurrency(income),
      detail: income === undefined ? 'Indisponível no momento' : `${formatPercentage(result.incomePercentage)} sobre o investido`,
      colorClass: income === undefined ? undefined : 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Resultado com proventos',
      value: income === undefined ? '—' : formatCurrency(result.total),
      detail:
        income === undefined
          ? 'Valorização + proventos'
          : `${formatPercentage(result.totalPercentage)} = valorização + proventos`,
      colorClass: income === undefined ? undefined : resultColor(result.total),
      wide: true,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn('rounded-lg border bg-card p-4 text-card-foreground', card.wide && 'col-span-2 lg:col-span-1')}
        >
          <dt className="text-sm text-muted-foreground">{card.label}</dt>
          <dd className={cn('text-lg font-semibold tabular-nums', card.colorClass)}>{card.value}</dd>
          {card.detail && <dd className="text-xs text-muted-foreground">{card.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}
