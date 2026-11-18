import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProventosResumo } from '@/features/proventos/types';
import { MONTH_SHORT_LABEL } from '@/features/proventos/utils/proventos';
import { formatCurrency } from '@/utils';

interface ProventosMonthlyChartProps {
  resumo: ProventosResumo;
}

const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Proventos líquidos de cada mês do ano, em barras. */
export function ProventosMonthlyChart({ resumo }: ProventosMonthlyChartProps) {
  const data = resumo.porMes.map((item) => ({
    month: MONTH_SHORT_LABEL[item.mes - 1],
    value: item.totalLiquido,
  }));

  return (
    <figure className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground">
      <figcaption className="text-lg font-semibold tracking-tight">Proventos líquidos por mês</figcaption>

      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.12} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              tickFormatter={(value: number) => compactCurrency.format(value)}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), 'Líquido']}
              cursor={{ fill: 'currentColor', fillOpacity: 0.06 }}
              contentStyle={{ borderRadius: 8, backgroundColor: 'var(--popover)', border: '1px solid var(--border)' }}
              labelStyle={{ color: 'var(--popover-foreground)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--popover-foreground)' }}
            />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Os mesmos valores em texto, para leitores de tela. */}
      <table className="sr-only">
        <caption>Proventos líquidos por mês de {resumo.ano}</caption>
        <tbody>
          {resumo.porMes.map((item) => (
            <tr key={item.mes}>
              <th scope="row">{MONTH_SHORT_LABEL[item.mes - 1]}</th>
              <td>{formatCurrency(item.totalLiquido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
