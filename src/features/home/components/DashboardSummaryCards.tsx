import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Portfolio } from '@/types';
import { calculateTotalReturn, formatCurrency, formatPercentage, sumIncomeOfAssets } from '@/utils';

interface DashboardSummaryCardsProps {
  portfolio: Portfolio;
  /** Proventos líquidos recebidos por ticker, de todos os anos; `undefined` se indisponível. */
  incomeByTicker?: ReadonlyMap<string, number>;
  /** Total líquido de proventos do ano corrente; `undefined` se indisponível. */
  incomeThisYear?: number;
  currentYear: number;
}

function resultColor(value: number) {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export function DashboardSummaryCards({ portfolio, incomeByTicker, incomeThisYear, currentYear }: DashboardSummaryCardsProps) {
  const income = incomeByTicker ? sumIncomeOfAssets(portfolio.assets, incomeByTicker) : undefined;
  const result = calculateTotalReturn(portfolio.totalInvested, portfolio.profit, income ?? 0);

  const cards = [
    { label: 'Patrimônio total', value: formatCurrency(portfolio.currentValue) },
    { label: 'Total investido', value: formatCurrency(portfolio.totalInvested) },
    {
      label: 'Valorização',
      value: formatCurrency(result.appreciation),
      detail: `${formatPercentage(result.appreciationPercentage)} sobre o investido`,
      colorClass: resultColor(result.appreciation),
    },
    {
      label: 'Proventos no ano',
      value: incomeThisYear === undefined ? '—' : formatCurrency(incomeThisYear),
      detail: `Líquido recebido em ${currentYear}`,
      colorClass: incomeThisYear === undefined ? undefined : 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Rentabilidade com proventos',
      value: income === undefined ? '—' : formatPercentage(result.totalPercentage),
      detail:
        income === undefined
          ? 'Valorização + proventos'
          : `Valorização ${formatPercentage(result.appreciationPercentage)} + proventos ${formatPercentage(result.incomePercentage, 'pt-BR', 'never')} (${formatCurrency(result.total)})`,
      colorClass: income === undefined ? undefined : resultColor(result.total),
      wide: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label} className={cn(card.wide && 'col-span-2 lg:col-span-1')}>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-normal text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-xl font-semibold tabular-nums', card.colorClass)}>{card.value}</p>
            {card.detail && <p className="text-xs text-muted-foreground">{card.detail}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
