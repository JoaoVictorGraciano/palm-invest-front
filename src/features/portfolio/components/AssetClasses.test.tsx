import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PortfolioDistributionChart } from '@/features/home/components/PortfolioDistributionChart';
import { AssetClassFilter } from '@/features/portfolio/components/AssetClassFilter';
import { AssetTable } from '@/features/portfolio/components/AssetTable';
import { ASSET_CLASS } from '@/types';
import type { Asset, AssetClass, Portfolio } from '@/types';
import { calculateClassDistribution, calculatePortfolioTotals } from '@/utils';

/** Posição fictícia com valor de mercado `currentValue`. */
function asset(ticker: string, assetClass: AssetClass, currentValue: number): Asset {
  const base = {
    id: `holding-${ticker.toLowerCase()}`,
    ticker,
    name: ticker,
    quantity: 1,
    averageCost: currentValue,
    currentPrice: currentValue,
    currency: 'BRL',
    updatedAt: '2026-01-01T00:00:00Z',
    totalInvested: currentValue,
    currentValue,
    profit: 0,
    profitPercentage: 0,
  };

  return assetClass === ASSET_CLASS.CRYPTO
    ? { ...base, assetClass }
    : { ...base, assetClass, exchange: 'B3' };
}

const ASSETS: Asset[] = [
  asset('BTC', ASSET_CLASS.CRYPTO, 100),
  asset('PETR4', ASSET_CLASS.STOCK, 300),
  asset('VALE3', ASSET_CLASS.STOCK, 100),
  asset('MXRF11', ASSET_CLASS.FII, 200),
  asset('BOVA11', ASSET_CLASS.ETF, 200),
  asset('AAPL34', ASSET_CLASS.BDR, 100),
];

describe('calculateClassDistribution', () => {
  it('soma o valor de mercado por classe, na ordem padrão das classes', () => {
    expect(calculateClassDistribution(ASSETS)).toEqual([
      { assetClass: 'STOCK', value: 400 },
      { assetClass: 'FII', value: 200 },
      { assetClass: 'ETF', value: 200 },
      { assetClass: 'BDR', value: 100 },
      { assetClass: 'CRYPTO', value: 100 },
    ]);
  });

  it('omite as classes sem valor na carteira', () => {
    const distribution = calculateClassDistribution([asset('MXRF11', ASSET_CLASS.FII, 50)]);

    expect(distribution).toEqual([{ assetClass: 'FII', value: 50 }]);
  });
});

describe('PortfolioDistributionChart', () => {
  it('mostra na legenda uma linha por classe presente, com o percentual', () => {
    const portfolio: Portfolio = {
      id: 'default',
      name: 'Minha Carteira',
      assets: ASSETS,
      updatedAt: '2026-01-01T00:00:00Z',
      ...calculatePortfolioTotals(ASSETS),
    };

    render(<PortfolioDistributionChart portfolio={portfolio} />);

    const legend = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(legend).toEqual(['Ações40,00%', 'FIIs20,00%', 'ETFs20,00%', 'BDRs10,00%', 'Cripto10,00%']);
  });
});

describe('AssetTable', () => {
  it('mostra a etiqueta da classe de cada ativo', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AssetTable assets={ASSETS} />
      </QueryClientProvider>,
    );

    const labelByTicker = Object.fromEntries(
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => {
          const cells = within(row).getAllByRole('cell');
          return [within(cells[0]).getAllByText(/.+/)[0].textContent, cells[1].textContent];
        }),
    );

    expect(labelByTicker).toEqual({
      BTC: 'Cripto',
      PETR4: 'Ação',
      VALE3: 'Ação',
      MXRF11: 'FII',
      BOVA11: 'ETF',
      AAPL34: 'BDR',
    });
  });
});

describe('AssetClassFilter', () => {
  it('oferece todas as classes e avisa qual foi escolhida', async () => {
    const onChange = vi.fn();
    render(<AssetClassFilter value="ALL" onChange={onChange} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Todos',
      'Ações',
      'FIIs',
      'ETFs',
      'BDRs',
      'Cripto',
    ]);

    await userEvent.setup().click(screen.getByRole('button', { name: 'ETFs' }));

    expect(onChange).toHaveBeenCalledWith('ETF');
  });
});
