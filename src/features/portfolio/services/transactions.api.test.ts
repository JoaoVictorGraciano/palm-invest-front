import { describe, expect, it, vi } from 'vitest';
import { ASSET_CLASS } from '@/types';
import {
  createTransaction,
  deleteAssetTransactions,
  listTransactions,
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
  assetClass: 'STOCK',
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
  assetClass: ASSET_CLASS.CRYPTO,
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

  it('usa a classe devolvida pela API, sem inferir pelo ticker', () => {
    // Ticker sem dígito que é ação e ticker com dígito que é cripto.
    expect(toTransaction({ ...dto, assetSymbol: 'AAPL', assetClass: 'STOCK' }).assetClass).toBe(ASSET_CLASS.STOCK);
    expect(toTransaction({ ...dto, assetSymbol: '1INCH', assetClass: 'CRYPTO' }).assetClass).toBe(ASSET_CLASS.CRYPTO);
  });

  it('usa o tipo BUY/SELL exatamente como a API devolve', () => {
    expect(toTransaction({ ...dto, type: 'BUY' }).type).toBe(TRANSACTION_TYPE.BUY);
    expect(toTransaction({ ...dto, type: 'SELL' }).type).toBe(TRANSACTION_TYPE.SELL);
  });

  it('listTransactions mantém a ordem devolvida pela API (mais recente primeiro)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () =>
        jsonResponse([
          { ...dto, id: 3, transactionDate: '2025-05-01T10:00:00' },
          { ...dto, id: 1, transactionDate: '2025-03-01T10:00:00' },
          { ...dto, id: 2, transactionDate: '2025-01-01T10:00:00' },
        ]),
      ),
    );

    const transactions = await listTransactions();

    expect(transactions.map((transaction) => transaction.id)).toEqual(['3', '1', '2']);
  });

  it('monta o corpo de POST/PUT exatamente com os campos da API, sem id', () => {
    expect(toPayload(input)).toEqual({
      type: 'SELL',
      assetSymbol: 'BTC',
      assetClass: 'CRYPTO',
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
  it('apaga todas as transações do ativo com uma única chamada DELETE', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ assetSymbol: 'PETR4', excluidas: 2 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteAssetTransactions(' petr4 ')).resolves.toEqual({ ticker: 'PETR4', deleted: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/transactions?assetSymbol=PETR4');
    expect(init?.method).toBe('DELETE');
  });

  it('propaga o 404 quando o ativo não tem transações', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => jsonResponse({ mensagem: 'Nenhuma transação' }, 404)));

    await expect(deleteAssetTransactions('PETR4')).rejects.toMatchObject({ name: 'HttpError', status: 404 });
  });
});
