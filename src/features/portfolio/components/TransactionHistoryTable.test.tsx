import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransactionHistoryTable } from '@/features/portfolio/components/TransactionHistoryTable';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction } from '@/features/portfolio/types';
import { ASSET_CLASS } from '@/types';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    ticker: 'PETR4',
    name: 'PETR4',
    assetClass: ASSET_CLASS.STOCK,
    type: TRANSACTION_TYPE.BUY,
    quantity: 10,
    pricePaid: 30,
    purchasedAt: '2026-01-10T10:00:00',
    broker: 'CLEAR',
    fee: 0,
    observation: '',
    realizedProfit: null,
    ...overrides,
  };
}

/** Texto com os espaços não separáveis do Intl trocados por espaços comuns. */
function text(element: Element) {
  return (element.textContent ?? '').replace(/\s/g, ' ');
}

describe('TransactionHistoryTable: lucro realizado', () => {
  it('mostra o lucro realizado nas vendas, verde para lucro e vermelho para prejuízo, e "—" nas compras', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TransactionHistoryTable
          transactions={[
            transaction({ type: TRANSACTION_TYPE.SELL, ticker: 'PETR4', realizedProfit: 150 }),
            transaction({ type: TRANSACTION_TYPE.SELL, ticker: 'VALE3', realizedProfit: -42.5 }),
            transaction({ type: TRANSACTION_TYPE.BUY, ticker: 'ITUB4' }),
          ]}
        />
      </QueryClientProvider>,
    );

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    const column = headers.indexOf('Lucro realizado');
    expect(column).toBeGreaterThan(-1);

    const [profit, loss, buy] = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[column]);

    expect(text(profit)).toBe('R$ 150,00');
    expect(profit.firstElementChild).toHaveClass('text-emerald-600');
    expect(text(loss)).toBe('-R$ 42,50');
    expect(loss.firstElementChild).toHaveClass('text-red-600');
    expect(text(buy)).toBe('—');
  });
});
