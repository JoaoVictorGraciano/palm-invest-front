import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, ReferenceLine } from 'recharts';
import type { Portfolio } from '@/types';
import { formatCurrency } from '@/utils';

// Cores vibrantes para o gráfico de composição (Rosca)
const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#10b981'];

interface PortfolioChartsProps {
  portfolio: Portfolio;
}

export function PortfolioCharts({ portfolio }: PortfolioChartsProps) {
  // 1. Gráfico de Rosca
  const compositionData = useMemo(() => {
    return portfolio.assets
      .map((a) => ({ name: a.ticker, value: a.quantity * a.currentPrice }))
      .filter((a) => a.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [portfolio]);

  // 2. Gráfico de Barras
  const performanceData = useMemo(() => {
    return portfolio.assets
      .map((a) => ({
        name: a.ticker,
        profit: (a.quantity * a.currentPrice) - (a.quantity * a.averageCost),
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [portfolio]);

  if (portfolio.assets.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* CARD 1: Gráfico de Rosca */}
      <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
        <h3 className="mb-4 text-lg font-semibold tracking-tight">Composição da Carteira</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={compositionData as any}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {/* Trocamos 'entry' por '_' para tirar o aviso amarelo do VS Code */}
                {compositionData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                 formatter={(value: any) => [formatCurrency(Number(value)), 'Valor total']}
                 contentStyle={{ borderRadius: '8px', backgroundColor: '#18181b', border: '1px solid #333', color: '#fff' }}
                 itemStyle={{ color: '#e4e4e7' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CARD 2: Gráfico de Barras */}
      <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
        <h3 className="mb-4 text-lg font-semibold tracking-tight">Lucro / Prejuízo por Ativo</h3>
        <div className="h-64 w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData as any} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#e4e4e7' }} tickLine={false} axisLine={false} />
              
              <RechartsTooltip 
                 formatter={(value: any) => [formatCurrency(Number(value)), 'Resultado']}
                 cursor={{ fill: '#333', opacity: 0.2 }}
                 contentStyle={{ borderRadius: '8px', backgroundColor: '#18181b', border: '1px solid #333', color: '#fff' }}
                 itemStyle={{ color: '#e4e4e7' }}
                 labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
              />
              <ReferenceLine y={0} stroke="#555" />
              
              <Bar dataKey="profit" radius={[4, 4, 0, 0] as any}>
                {performanceData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}