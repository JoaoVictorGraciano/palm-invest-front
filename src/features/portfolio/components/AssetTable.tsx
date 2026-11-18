import type { Asset } from '@/types';
import { cn } from '@/lib/utils';
import { ASSET_CLASS_LABEL, calculateTotalReturn, formatCurrency, formatPercentage } from '@/utils';
import { DeleteAssetButton } from '@/features/portfolio/components/DeleteAssetButton';

interface AssetTableProps {
  assets: Asset[];
  /** Proventos líquidos recebidos por ticker; `undefined` enquanto carregam ou se falharem. */
  incomeByTicker?: ReadonlyMap<string, number>;
}

function resultColor(value: number) {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

export function AssetTable({ assets, incomeByTicker }: AssetTableProps) {
  if (assets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum ativo encontrado nesta categoria.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium">Classe</th>
              <th className="px-4 py-3 text-right font-medium">Quantidade</th>
              <th className="px-4 py-3 text-right font-medium">Custo médio</th>
              <th className="px-4 py-3 text-right font-medium">Cotação atual</th>
              <th className="px-4 py-3 text-right font-medium">Valor atual</th>
              <th className="px-4 py-3 text-right font-medium">Valorização</th>
              <th className="px-4 py-3 text-right font-medium">Proventos</th>
              <th className="px-4 py-3 text-right font-medium">Resultado c/ proventos</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const income = incomeByTicker?.get(asset.ticker) ?? (incomeByTicker ? 0 : undefined);
              const result = calculateTotalReturn(asset.totalInvested, asset.profit, income ?? 0);

              return (
                <tr key={asset.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{asset.ticker}</div>
                    <div className="text-xs text-muted-foreground">{asset.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      {ASSET_CLASS_LABEL[asset.assetClass]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{asset.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(asset.averageCost, 'pt-BR', asset.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(asset.currentPrice, 'pt-BR', asset.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(asset.currentValue, 'pt-BR', asset.currency)}
                  </td>
                  <td className={cn('px-4 py-3 text-right font-medium whitespace-nowrap', resultColor(asset.profit))}>
                    {formatCurrency(asset.profit, 'pt-BR', asset.currency)}
                    <span className="ml-1 text-xs">({formatPercentage(asset.profitPercentage)})</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {income === undefined ? '—' : formatCurrency(income, 'pt-BR', asset.currency)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right font-medium whitespace-nowrap',
                      income !== undefined && resultColor(result.total),
                    )}
                  >
                    {income === undefined ? (
                      '—'
                    ) : (
                      <>
                        {formatCurrency(result.total, 'pt-BR', asset.currency)}
                        <span className="ml-1 text-xs">({formatPercentage(result.totalPercentage)})</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteAssetButton ticker={asset.ticker} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Valorização: valor atual menos o investido. Proventos: total líquido recebido (dividendos, JCP, rendimentos e
        amortizações). Resultado c/ proventos: valorização + proventos, em relação ao investido.
      </p>
    </div>
  );
}
