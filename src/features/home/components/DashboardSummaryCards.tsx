import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Portfolio } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils';

interface DashboardSummaryCardsProps {
  portfolio: Portfolio;
}

export function DashboardSummaryCards({ portfolio }: DashboardSummaryCardsProps) {
  const isProfit = portfolio.profit >= 0;
  const profitColorClass = isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  const cards = [
    { label: 'Patrimônio total', value: formatCurrency(portfolio.currentValue) },
    { label: 'Total investido', value: formatCurrency(portfolio.totalInvested) },
    { label: 'Lucro/Prejuízo', value: formatCurrency(portfolio.profit), colorClass: profitColorClass },
    { label: 'Rentabilidade', value: formatPercentage(portfolio.profitPercentage), colorClass: profitColorClass },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-normal text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-semibold', card.colorClass)}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
