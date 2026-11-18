import type { ProventosResumo } from '@/features/proventos/types';
import { MONTH_SHORT_LABEL, monthlyAverage } from '@/features/proventos/utils/proventos';
import { formatCurrency } from '@/utils';

interface ProventosSummaryCardsProps {
  resumo: ProventosResumo;
}

export function ProventosSummaryCards({ resumo }: ProventosSummaryCardsProps) {
  const average = monthlyAverage(resumo);
  const averagePeriod =
    average.months === 12
      ? `12 meses de ${resumo.ano}`
      : average.months === 1
        ? `jan de ${resumo.ano}`
        : `jan a ${MONTH_SHORT_LABEL[average.months - 1]} de ${resumo.ano}`;

  const cards = [
    {
      label: `Total líquido em ${resumo.ano}`,
      value: formatCurrency(resumo.totalLiquido),
      detail: `Bruto ${formatCurrency(resumo.totalBruto)} − IR ${formatCurrency(resumo.totalIrRetido)}`,
    },
    {
      label: 'Média mensal',
      value: formatCurrency(average.value),
      detail: `Líquido, considerando ${averagePeriod}`,
    },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-card p-4 text-card-foreground">
          <dt className="text-sm text-muted-foreground">{card.label}</dt>
          <dd className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{card.value}</dd>
          <dd className="text-xs text-muted-foreground">{card.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
