import type { ProventosResumo } from '@/features/proventos/types';
import { TIPO_PROVENTO_COLOR, TIPO_PROVENTO_LABEL } from '@/features/proventos/utils/proventos';
import { ASSET_CLASS_LABEL, formatCurrency, formatPercentage } from '@/utils';

interface ProventosBreakdownProps {
  resumo: ProventosResumo;
}

interface BreakdownRow {
  key: string;
  label: string;
  hint?: string;
  value: number;
  color: string;
}

function BreakdownList({ title, rows, total }: { title: string; rows: BreakdownRow[]; total: number }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-6 text-card-foreground" aria-label={title}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const share = total > 0 ? (row.value / total) * 100 : 0;
          return (
            <li key={row.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-medium">{row.label}</span>
                  {row.hint && <span className="text-xs text-muted-foreground">{row.hint}</span>}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatCurrency(row.value)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({formatPercentage(share, 'pt-BR', 'never')})
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: row.color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Totais líquidos do ano por ativo e por tipo, com a fatia de cada um no total. */
export function ProventosBreakdown({ resumo }: ProventosBreakdownProps) {
  const byAsset: BreakdownRow[] = resumo.porAtivo.map((item) => ({
    key: item.ticker,
    label: item.ticker,
    hint: ASSET_CLASS_LABEL[item.assetClass],
    value: item.totalLiquido,
    color: '#10b981',
  }));

  const byType: BreakdownRow[] = resumo.porTipo.map((item) => ({
    key: item.tipo,
    label: TIPO_PROVENTO_LABEL[item.tipo],
    value: item.totalLiquido,
    color: TIPO_PROVENTO_COLOR[item.tipo],
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BreakdownList title="Por ativo" rows={byAsset} total={resumo.totalLiquido} />
      <BreakdownList title="Por tipo" rows={byType} total={resumo.totalLiquido} />
    </div>
  );
}
