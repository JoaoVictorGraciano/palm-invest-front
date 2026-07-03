import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ASSET_CLASS, isCrypto, isStock } from '@/types';
import type { AssetClass, Portfolio } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils';

interface PortfolioDistributionChartProps {
  portfolio: Portfolio;
}

interface DistributionSlice {
  key: AssetClass;
  name: string;
  value: number;
}

const COLOR_BY_CLASS: Record<AssetClass, string> = {
  [ASSET_CLASS.STOCK]: 'var(--chart-1)',
  [ASSET_CLASS.CRYPTO]: 'var(--chart-3)',
};

export function PortfolioDistributionChart({ portfolio }: PortfolioDistributionChartProps) {
  const stockValue = portfolio.assets.filter(isStock).reduce((sum, asset) => sum + asset.currentValue, 0);
  const cryptoValue = portfolio.assets.filter(isCrypto).reduce((sum, asset) => sum + asset.currentValue, 0);
  const total = stockValue + cryptoValue;

  const slices: DistributionSlice[] = [
    { key: ASSET_CLASS.STOCK, name: 'Ações', value: stockValue },
    { key: ASSET_CLASS.CRYPTO, name: 'Criptomoedas', value: cryptoValue },
  ].filter((slice) => slice.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição do patrimônio</CardTitle>
        <CardDescription>Ações vs. Criptomoedas, por valor de mercado atual</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ativo na carteira ainda.</p>
        ) : (
          <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={slices.length > 1 ? 3 : 0}
                    strokeWidth={0}
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.key} fill={COLOR_BY_CLASS[slice.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Patrimônio</span>
                <span className="text-lg font-semibold">{formatCurrency(total)}</span>
              </div>
            </div>

            <ul className="flex flex-col gap-3 sm:min-w-40">
              {slices.map((slice) => (
                <li key={slice.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_BY_CLASS[slice.key] }}
                  />
                  <span className="flex-1 text-muted-foreground">{slice.name}</span>
                  <span className="font-medium">{formatPercentage((slice.value / total) * 100, 'pt-BR', 'never')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
