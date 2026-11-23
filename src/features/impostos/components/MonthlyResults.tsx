import { Badge } from '@/components/ui/badge';
import type { ResultadoMes } from '@/features/impostos/types';
import { categoriaLabel, formatMonth } from '@/features/impostos/utils/impostos';
import { formatPaymentDate } from '@/features/proventos/utils/proventos';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils';

function resultColor(value: number) {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 });

function MonthCard({ mes }: { mes: ResultadoMes }) {
  const title = formatMonth(mes.mes);

  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl border bg-card p-6 text-card-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* Só a primeira letra maiúscula: "Novembro de 2026". */}
        <h3 className="text-base font-semibold tracking-tight">{title.charAt(0).toUpperCase() + title.slice(1)}</h3>
        <p className="text-sm">
          Imposto estimado: <span className="font-semibold tabular-nums">{formatCurrency(mes.impostoEstimado)}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={`Resultado por categoria em ${title}`}>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Categoria</th>
              <th className="py-2 pr-3 text-right font-medium">Total vendido</th>
              <th className="py-2 pr-3 text-right font-medium">Lucro</th>
              <th className="py-2 pr-3 text-right font-medium">Prejuízo compensado</th>
              <th className="py-2 pr-3 font-medium">Situação</th>
              <th className="py-2 pr-3 text-right font-medium">Imposto estimado</th>
              <th className="py-2 pr-3 font-medium">DARF</th>
              <th className="py-2 font-medium">Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {mes.categorias.map((categoria) => {
              const hasTax = categoria.impostoEstimado > 0;
              return (
                <tr key={categoria.categoria} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{categoriaLabel(categoria.categoria)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(categoria.totalVendas)}</td>
                  <td className={cn('py-2 pr-3 text-right tabular-nums', resultColor(categoria.lucroBruto))}>
                    {formatCurrency(categoria.lucroBruto)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(categoria.prejuizoCompensado)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {categoria.isento ? (
                      <Badge variant="success">Isento</Badge>
                    ) : (
                      <Badge variant="outline">Tributável ({percent.format(categoria.aliquota)})</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium tabular-nums">
                    {formatCurrency(categoria.impostoEstimado)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{hasTax ? categoria.codigoDarf : '—'}</td>
                  <td className="py-2 whitespace-nowrap tabular-nums">
                    {hasTax && categoria.vencimentoDarf ? formatPaymentDate(categoria.vencimentoDarf) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mes.darfs.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm">
          {mes.darfs.map((darf) => (
            <li key={darf.codigoDarf}>
              DARF <span className="font-medium">{darf.codigoDarf}</span>:{' '}
              <span className="font-semibold tabular-nums">{formatCurrency(darf.impostoEstimado)}</span>, vence em{' '}
              {formatPaymentDate(darf.vencimento)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Um card por mês com vendas; meses sem vendas ficam de fora. */
export function MonthlyResults({ meses, ano }: { meses: ResultadoMes[]; ano: number }) {
  const withSales = meses.filter((mes) => mes.categorias.length > 0);

  if (withSales.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma venda registrada em {ano}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {withSales.map((mes) => (
        <MonthCard key={mes.mes} mes={mes} />
      ))}
      <p className="text-xs text-muted-foreground">Meses sem vendas não aparecem.</p>
    </div>
  );
}
