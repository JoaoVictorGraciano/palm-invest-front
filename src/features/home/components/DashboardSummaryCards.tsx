import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Portfolio } from '@/types';
import {
  calculateTotalResult,
  calculateTotalReturn,
  formatCurrency,
  formatPercentage,
  sumByTicker,
  sumIncomeOfAssets,
} from '@/utils';

interface DashboardSummaryCardsProps {
  portfolio: Portfolio;
  /** Lucro realizado nas vendas, por ticker (todos os ativos). */
  realizedByTicker?: ReadonlyMap<string, number>;
  /** Proventos líquidos recebidos por ticker, de todos os anos; `undefined` se indisponível. */
  incomeByTicker?: ReadonlyMap<string, number>;
  /** Total líquido de proventos do ano corrente; `undefined` se indisponível. */
  incomeThisYear?: number;
  currentYear: number;
}

function resultColor(value: number) {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export function DashboardSummaryCards({
  portfolio,
  realizedByTicker,
  incomeByTicker,
  incomeThisYear,
  currentYear,
}: DashboardSummaryCardsProps) {
  // Rentabilidade sobre o investido: só posições atuais e os proventos delas.
  const heldIncome = incomeByTicker ? sumIncomeOfAssets(portfolio.assets, incomeByTicker) : undefined;
  const returnOnInvested = calculateTotalReturn(portfolio.totalInvested, portfolio.profit, heldIncome ?? 0);

  // Resultado total: todos os ativos, inclusive os já vendidos.
  const realized = realizedByTicker ? sumByTicker(realizedByTicker) : undefined;
  const income = incomeByTicker ? sumByTicker(incomeByTicker) : undefined;
  const complete = realized !== undefined && income !== undefined;
  const result = calculateTotalResult(realized ?? 0, portfolio.profit, income ?? 0);

  const cards = [
    { label: 'Patrimônio total', value: formatCurrency(portfolio.currentValue) },
    { label: 'Total investido', value: formatCurrency(portfolio.totalInvested) },
    {
      label: 'Lucro em aberto',
      value: formatCurrency(portfolio.profit),
      detail: `${formatPercentage(portfolio.profitPercentage)} sobre o investido`,
      colorClass: resultColor(portfolio.profit),
    },
    {
      label: 'Proventos no ano',
      value: incomeThisYear === undefined ? '—' : formatCurrency(incomeThisYear),
      detail: `Líquido recebido em ${currentYear}`,
      colorClass: incomeThisYear === undefined ? undefined : 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Rentabilidade com proventos',
      value: heldIncome === undefined ? '—' : formatPercentage(returnOnInvested.totalPercentage),
      detail:
        heldIncome === undefined
          ? 'Lucro em aberto + proventos'
          : `Em aberto ${formatPercentage(returnOnInvested.appreciationPercentage)} + proventos ${formatPercentage(returnOnInvested.incomePercentage, 'pt-BR', 'never')}`,
      colorClass: heldIncome === undefined ? undefined : resultColor(returnOnInvested.total),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} className={cn(card.label === 'Rentabilidade com proventos' && 'col-span-2 lg:col-span-1')}>
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

      <Card role="region" aria-label="Resultado total">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-normal text-muted-foreground">Resultado total</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className={cn('text-2xl font-semibold tabular-nums', complete && resultColor(result.total))}>
            {complete ? formatCurrency(result.total) : '—'}
          </p>
          <dl className="grid grid-cols-3 gap-4 text-sm sm:gap-8">
            {[
              { label: 'Lucro realizado', value: realized },
              { label: 'Lucro em aberto', value: portfolio.profit },
              { label: 'Proventos', value: income },
            ].map((part) => (
              <div key={part.label}>
                <dt className="text-xs text-muted-foreground">{part.label}</dt>
                <dd className={cn('font-medium tabular-nums', part.value !== undefined && resultColor(part.value))}>
                  {part.value === undefined ? '—' : formatCurrency(part.value)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
