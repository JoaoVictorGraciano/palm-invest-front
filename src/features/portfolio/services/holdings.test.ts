import { describe, expect, it } from 'vitest';
import { ASSET_CLASS } from '@/types';
import { getAvailableQuantity, getHoldingsFromTransactions } from '@/features/portfolio/services/holdings';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction } from '@/features/portfolio/types';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    ticker: 'PETR4',
    name: 'PETR4',
    assetClass: ASSET_CLASS.STOCK,
    type: TRANSACTION_TYPE.BUY,
    quantity: 100,
    pricePaid: 10,
    purchasedAt: '2025-01-01T10:00:00',
    broker: '',
    fee: 0,
    observation: '',
    ...overrides,
  };
}

describe('getHoldingsFromTransactions', () => {
  it('calcula o custo médio ponderado de duas compras', () => {
    const [holding] = getHoldingsFromTransactions([
      transaction({ quantity: 100, pricePaid: 10 }),
      transaction({ quantity: 300, pricePaid: 20, purchasedAt: '2025-02-01T10:00:00' }),
    ]);

    expect(holding).toMatchObject({ ticker: 'PETR4', quantity: 400, averageCost: 17.5, assetClass: ASSET_CLASS.STOCK });
  });

  it('embute as taxas da compra no custo médio', () => {
    const [holding] = getHoldingsFromTransactions([transaction({ quantity: 10, pricePaid: 10, fee: 5 })]);

    expect(holding.averageCost).toBe(10.5);
  });

  it('venda reduz a quantidade sem alterar o custo médio, mesmo fora de ordem na lista', () => {
    const [holding] = getHoldingsFromTransactions([
      transaction({ type: TRANSACTION_TYPE.SELL, quantity: 40, pricePaid: 50, purchasedAt: '2025-03-01T10:00:00' }),
      transaction({ quantity: 100, pricePaid: 10 }),
    ]);

    expect(holding).toMatchObject({ quantity: 60, averageCost: 10 });
  });

  it('posição zerada some da carteira', () => {
    const holdings = getHoldingsFromTransactions([
      transaction({ quantity: 100 }),
      transaction({ type: TRANSACTION_TYPE.SELL, quantity: 100, purchasedAt: '2025-03-01T10:00:00' }),
      transaction({ ticker: 'BTC', name: 'BTC', assetClass: ASSET_CLASS.CRYPTO, quantity: 1 }),
    ]);

    expect(holdings.map((holding) => holding.ticker)).toEqual(['BTC']);
  });

  it('getAvailableQuantity devolve o saldo do ticker, ou 0 se não houver posição', () => {
    const transactions = [transaction({ quantity: 100 })];

    expect(getAvailableQuantity(transactions, 'petr4')).toBe(100);
    expect(getAvailableQuantity(transactions, 'VALE3')).toBe(0);
  });
});
