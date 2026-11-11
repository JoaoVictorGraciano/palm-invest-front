import { describe, expect, it, vi } from 'vitest';
import { ASSET_CLASS } from '@/types';
import { deleteAssetTransactions, PartialAssetDeletionError } from '@/features/portfolio/services/asset-deletion';
import {
  createTransaction,
  inferAssetClass,
  toPayload,
  toTransaction,
} from '@/features/portfolio/services/transactions.api';
import type { TransactionDto } from '@/features/portfolio/services/transactions.api';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { TransactionInput } from '@/features/portfolio/types';

const dto: TransactionDto = {
  id: 7,
  type: 'BUY',
  assetSymbol: 'petr4',
  quantity: '100',
  price: '32.5',
  transactionDate: '2025-03-10T13:00:00',
  broker: 'CLEAR',
  fee: null,
  observation: null,
};

const input: TransactionInput = {
  type: TRANSACTION_TYPE.SELL,
  ticker: 'btc',
  quantity: 0.5,
  pricePaid: 300000,
  transactionDate: '2025-06-01T10:30:00',
  broker: 'binance',
  fee: 12.5,
  observation: 'realização parcial',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('mapeamento de transações', () => {
  it('converte a resposta da API para o modelo da aplicação', () => {
    expect(toTransaction(dto)).toEqual({
      id: '7',
      ticker: 'PETR4',
      name: 'PETR4',
      assetClass: ASSET_CLASS.STOCK,
      type: TRANSACTION_TYPE.BUY,
      quantity: 100,
      pricePaid: 32.5,
      purchasedAt: '2025-03-10T13:00:00',
      broker: 'CLEAR',
      fee: 0,
      observation: '',
    });
  });

  it('infere a classe pelo ticker enquanto a API não a persiste', () => {
    expect(inferAssetClass('ITUB4')).toBe(ASSET_CLASS.STOCK);
    expect(inferAssetClass('btc')).toBe(ASSET_CLASS.CRYPTO);
  });

  it('monta o corpo de POST/PUT exatamente com os campos da API, sem id', () => {
    expect(toPayload(input)).toEqual({
      type: 'SELL',
      assetSymbol: 'BTC',
      quantity: 0.5,
      price: 300000,
      transactionDate: '2025-06-01T10:30:00',
      broker: 'BINANCE',
      fee: 12.5,
      observation: 'REALIZAÇÃO PARCIAL',
    });
  });

  it('createTransaction faz POST em /api/transactions e devolve a transação com id', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ ...dto, id: 42 }, 201));
    vi.stubGlobal('fetch', fetchMock);

    const created = await createTransaction(input);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/transactions');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('id');
    expect(created.id).toBe('42');
  });
});

describe('deleteAssetTransactions', () => {
  const list = [
    { ...dto, id: 1, assetSymbol: 'PETR4' },
    { ...dto, id: 2, assetSymbol: 'ITUB4' },
    { ...dto, id: 3, assetSymbol: 'PETR4' },
  ];

  it('exclui na API apenas as transações do ticker', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) =>
      init?.method === 'DELETE' ? new Response(null, { status: 204 }) : jsonResponse(list),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteAssetTransactions('petr4')).resolves.toEqual({ ticker: 'PETR4', deleted: 2 });

    const deletedUrls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE').map(([url]) => url);
    expect(deletedUrls).toEqual(['http://api.test/api/transactions/1', 'http://api.test/api/transactions/3']);
  });

  it('avisa quando só parte das transações foi excluída', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url, init) => {
      if (init?.method !== 'DELETE') return jsonResponse(list);
      return new Response(null, { status: String(url).endsWith('/3') ? 500 : 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteAssetTransactions('PETR4')).rejects.toMatchObject({
      name: PartialAssetDeletionError.name,
      deleted: 1,
      total: 2,
    });
  });
});
