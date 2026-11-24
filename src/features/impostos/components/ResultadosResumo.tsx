import type { ResultadosAno } from '@/features/impostos/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils';

function resultColor(value: number) {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

/** Totais do ano e prejuízo acumulado a compensar, por grupo. */
export function ResultadosResumo({ resultados }: { resultados: ResultadosAno }) {
  const { totalAno, prejuizoAcumulado, ano } = resultados;

  const cards = [
    { label: `Total vendido em ${ano}`, value: formatCurrency(totalAno.totalVendas) },
    { label: 'Lucro nas vendas', value: formatCurrency(totalAno.lucroBruto), colorClass: resultColor(totalAno.lucroBruto) },
    { label: 'Prejuízo compensado', value: formatCurrency(totalAno.prejuizoCompensado) },
    { label: 'Imposto estimado', value: formatCurrency(totalAno.impostoEstimado) },
  ];

  const grupos = [
    { label: 'Ações, ETFs e BDRs', inicio: prejuizoAcumulado.inicioDoAno.acoesEtfBdr, fim: prejuizoAcumulado.fimDoAno.acoesEtfBdr },
    { label: 'FIIs', inicio: prejuizoAcumulado.inicioDoAno.fii, fim: prejuizoAcumulado.fimDoAno.fii },
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-4 text-card-foreground">
            <dt className="text-sm text-muted-foreground">{card.label}</dt>
            <dd className={cn('text-lg font-semibold tabular-nums', card.colorClass)}>{card.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Prejuízo acumulado" className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold tracking-tight">Prejuízo acumulado a compensar</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Ações, ETFs e BDRs compensam entre si; FIIs só com FIIs; cripto não compensa.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Grupo</th>
              <th className="py-1 text-right font-medium">Início de {ano}</th>
              <th className="py-1 text-right font-medium">Fim de {ano}</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <tr key={grupo.label} className="border-t">
                <td className="py-2">{grupo.label}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(grupo.inicio)}</td>
                <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(grupo.fim)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
