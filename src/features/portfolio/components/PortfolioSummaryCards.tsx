import type { Portfolio } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/utils';

interface PortfolioSummaryCardsProps {
  portfolio: Portfolio;
}

export function PortfolioSummaryCards({ portfolio }: PortfolioSummaryCardsProps) {
  const isProfit = portfolio.profit >= 0;
  const profitColor = isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  const cards = [
    { label: 'Investido', value: formatCurrency(portfolio.totalInvested) },
    { label: 'Valor atual', value: formatCurrency(portfolio.currentValue) },
    { label: 'Lucro/Prejuízo', value: formatCurrency(portfolio.profit), colorClass: profitColor },
    { label: 'Rentabilidade', value: formatPercentage(portfolio.profitPercentage), colorClass: profitColor },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-card p-4 text-card-foreground">
          <dt className="text-sm text-muted-foreground">{card.label}</dt>
          <dd className={cn('text-lg font-semibold', card.colorClass)}>{card.value}</dd>
        </div>
      ))}
    </dl>
  );
}
