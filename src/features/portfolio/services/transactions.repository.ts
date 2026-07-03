import { ASSET_CLASS } from '@/types';
import { readStorage, writeStorage } from '@/lib/storage';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { AssetHolding, NewTransactionInput, Transaction } from '@/features/portfolio/types';

/**
 * Repositório de transações (compras e vendas), persistido no `localStorage`
 * do navegador. É a fonte da verdade da carteira: as posições
 * (`AssetHolding`) são sempre derivadas processando as transações do mesmo
 * ticker em ordem cronológica, nunca armazenadas diretamente — isso garante
 * que o custo médio e a quantidade em estoque fiquem sempre consistentes
 * com o histórico de compras e vendas.
 */

const STORAGE_KEY = 'palm-invest:transactions';

/** Erro lançado ao tentar vender mais unidades do que o disponível em estoque. */
export class InsufficientQuantityError extends Error {
  readonly ticker: string;
  readonly available: number;

  constructor(ticker: string, available: number) {
    super(`Quantidade insuficiente de ${ticker}: disponível ${available}.`);
    this.name = 'InsufficientQuantityError';
    this.ticker = ticker;
    this.available = available;
  }
}

/** Transações iniciais de demonstração, carregadas apenas na primeira execução (localStorage vazio). */
const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'seed-petr4',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    assetClass: ASSET_CLASS.STOCK,
    type: TRANSACTION_TYPE.BUY,
    quantity: 200,
    pricePaid: 32.5,
    purchasedAt: '2025-03-10T13:00:00.000Z',
  },
  {
    id: 'seed-itub4',
    ticker: 'ITUB4',
    name: 'Itaú Unibanco PN',
    assetClass: ASSET_CLASS.STOCK,
    type: TRANSACTION_TYPE.BUY,
    quantity: 150,
    pricePaid: 28.1,
    purchasedAt: '2025-04-22T13:00:00.000Z',
  },
  {
    id: 'seed-wege3',
    ticker: 'WEGE3',
    name: 'WEG ON',
    assetClass: ASSET_CLASS.STOCK,
    type: TRANSACTION_TYPE.BUY,
    quantity: 80,
    pricePaid: 38.2,
    purchasedAt: '2025-06-05T13:00:00.000Z',
  },
  {
    id: 'seed-btc',
    ticker: 'BTC',
    name: 'Bitcoin',
    assetClass: ASSET_CLASS.CRYPTO,
    type: TRANSACTION_TYPE.BUY,
    quantity: 0.15,
    pricePaid: 280000,
    purchasedAt: '2025-02-18T13:00:00.000Z',
  },
  {
    id: 'seed-eth',
    ticker: 'ETH',
    name: 'Ethereum',
    assetClass: ASSET_CLASS.CRYPTO,
    type: TRANSACTION_TYPE.BUY,
    quantity: 2.4,
    pricePaid: 12500,
    purchasedAt: '2025-05-30T13:00:00.000Z',
  },
  {
    id: 'seed-sol',
    ticker: 'SOL',
    name: 'Solana',
    assetClass: ASSET_CLASS.CRYPTO,
    type: TRANSACTION_TYPE.BUY,
    quantity: 30,
    pricePaid: 480,
    purchasedAt: '2025-07-01T13:00:00.000Z',
  },
];

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Lê as transações do localStorage. Na primeira execução (chave ainda não
 * existe), semeia com `SEED_TRANSACTIONS` para que a carteira não comece
 * vazia — isso preserva a experiência de demonstração já existente.
 */
export function getTransactions(): Transaction[] {
  const stored = readStorage<Transaction[] | null>(STORAGE_KEY, null);

  if (stored === null) {
    writeStorage(STORAGE_KEY, SEED_TRANSACTIONS);
    return SEED_TRANSACTIONS;
  }

  return stored;
}

/**
 * Registra uma nova transação (compra ou venda) e retorna a transação
 * criada. Vendas são validadas contra a quantidade atualmente em estoque
 * (derivada do histórico) — não é possível vender mais do que se possui.
 */
export function addTransaction(input: NewTransactionInput): Transaction {
  const ticker = input.ticker.trim().toUpperCase();

  if (input.type === TRANSACTION_TYPE.SELL) {
    const currentHolding = getHoldingsFromTransactions(getTransactions()).find((holding) => holding.ticker === ticker);
    const availableQuantity = currentHolding?.quantity ?? 0;

    if (input.quantity > availableQuantity) {
      throw new InsufficientQuantityError(ticker, availableQuantity);
    }
  }

  const transaction: Transaction = {
    id: generateId(),
    ticker,
    name: ticker,
    assetClass: input.assetClass,
    type: input.type,
    quantity: input.quantity,
    pricePaid: input.pricePaid,
    purchasedAt: new Date().toISOString(),
  };

  const transactions = [...getTransactions(), transaction];
  writeStorage(STORAGE_KEY, transactions);

  return transaction;
}

/** Remove definitivamente todas as transações de um ticker, apagando o ativo da carteira. */
export function deleteAssetTransactions(ticker: string): void {
  const normalizedTicker = ticker.trim().toUpperCase();
  const remaining = getTransactions().filter((transaction) => transaction.ticker !== normalizedTicker);
  writeStorage(STORAGE_KEY, remaining);
}

/**
 * Agrega as transações por ticker em posições (`AssetHolding`), processando
 * o histórico em ordem cronológica:
 * - Compras recalculam o custo médio ponderado (`Σ(quantidade × preço) / Σ(quantidade)`).
 * - Vendas apenas reduzem a quantidade em estoque; o custo médio da posição
 *   remanescente não muda (prática contábil padrão de custo médio).
 * Um ticker cuja quantidade final chega a zero (ou menos) não aparece mais
 * na carteira.
 */
export function getHoldingsFromTransactions(transactions: Transaction[]): AssetHolding[] {
  const transactionsByTicker = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const group = transactionsByTicker.get(transaction.ticker) ?? [];
    group.push(transaction);
    transactionsByTicker.set(transaction.ticker, group);
  }

  const holdings: AssetHolding[] = [];

  for (const [ticker, group] of transactionsByTicker) {
    const sorted = [...group].sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt));

    let quantity = 0;
    let averageCost = 0;

    for (const transaction of sorted) {
      if (transaction.type === TRANSACTION_TYPE.SELL) {
        quantity = Math.max(0, quantity - transaction.quantity);
      } else {
        const totalCost = quantity * averageCost + transaction.quantity * transaction.pricePaid;
        quantity += transaction.quantity;
        averageCost = quantity === 0 ? 0 : totalCost / quantity;
      }
    }

    if (quantity <= 0) continue;

    const mostRecent = sorted[sorted.length - 1];
    const base = {
      id: `holding-${ticker.toLowerCase()}`,
      ticker,
      name: mostRecent.name,
      quantity,
      averageCost,
    };

    holdings.push(
      mostRecent.assetClass === ASSET_CLASS.STOCK
        ? { ...base, assetClass: ASSET_CLASS.STOCK, exchange: 'B3' }
        : { ...base, assetClass: ASSET_CLASS.CRYPTO },
    );
  }

  return holdings;
}
