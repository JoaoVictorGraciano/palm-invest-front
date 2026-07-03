import { ASSET_CLASS } from '@/types';
import { readStorage, writeStorage } from '@/lib/storage';
import type { AssetHolding, NewTransactionInput, Transaction } from '@/features/portfolio/types';

/**
 * Repositório de transações (aportes), persistido no `localStorage` do
 * navegador. É a fonte da verdade da carteira: as posições (`AssetHolding`)
 * são sempre derivadas agregando as transações do mesmo ticker, nunca
 * armazenadas diretamente — isso garante que o custo médio fique sempre
 * consistente com o histórico de compras.
 */

const STORAGE_KEY = 'palm-invest:transactions';

/** Aportes iniciais de demonstração, carregados apenas na primeira execução (localStorage vazio). */
const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'seed-petr4',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    assetClass: ASSET_CLASS.STOCK,
    quantity: 200,
    pricePaid: 32.5,
    purchasedAt: '2025-03-10T13:00:00.000Z',
  },
  {
    id: 'seed-itub4',
    ticker: 'ITUB4',
    name: 'Itaú Unibanco PN',
    assetClass: ASSET_CLASS.STOCK,
    quantity: 150,
    pricePaid: 28.1,
    purchasedAt: '2025-04-22T13:00:00.000Z',
  },
  {
    id: 'seed-wege3',
    ticker: 'WEGE3',
    name: 'WEG ON',
    assetClass: ASSET_CLASS.STOCK,
    quantity: 80,
    pricePaid: 38.2,
    purchasedAt: '2025-06-05T13:00:00.000Z',
  },
  {
    id: 'seed-btc',
    ticker: 'BTC',
    name: 'Bitcoin',
    assetClass: ASSET_CLASS.CRYPTO,
    quantity: 0.15,
    pricePaid: 280000,
    purchasedAt: '2025-02-18T13:00:00.000Z',
  },
  {
    id: 'seed-eth',
    ticker: 'ETH',
    name: 'Ethereum',
    assetClass: ASSET_CLASS.CRYPTO,
    quantity: 2.4,
    pricePaid: 12500,
    purchasedAt: '2025-05-30T13:00:00.000Z',
  },
  {
    id: 'seed-sol',
    ticker: 'SOL',
    name: 'Solana',
    assetClass: ASSET_CLASS.CRYPTO,
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

/** Registra um novo aporte e retorna a transação criada. */
export function addTransaction(input: NewTransactionInput): Transaction {
  const transaction: Transaction = {
    id: generateId(),
    ticker: input.ticker.trim().toUpperCase(),
    name: input.ticker.trim().toUpperCase(),
    assetClass: input.assetClass,
    quantity: input.quantity,
    pricePaid: input.pricePaid,
    purchasedAt: new Date().toISOString(),
  };

  const transactions = [...getTransactions(), transaction];
  writeStorage(STORAGE_KEY, transactions);

  return transaction;
}

/**
 * Agrega as transações por ticker em posições (`AssetHolding`): soma as
 * quantidades e calcula o custo médio ponderado
 * (`Σ(quantidade × preço) / Σ(quantidade)`). Cada novo aporte de um ticker
 * já existente recalcula automaticamente o custo médio da posição inteira.
 */
export function getHoldingsFromTransactions(transactions: Transaction[]): AssetHolding[] {
  const transactionsByTicker = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const group = transactionsByTicker.get(transaction.ticker) ?? [];
    group.push(transaction);
    transactionsByTicker.set(transaction.ticker, group);
  }

  return [...transactionsByTicker.entries()].map(([ticker, group]) => {
    const quantity = group.reduce((sum, tx) => sum + tx.quantity, 0);
    const totalCost = group.reduce((sum, tx) => sum + tx.quantity * tx.pricePaid, 0);
    const averageCost = quantity === 0 ? 0 : totalCost / quantity;
    const mostRecent = group.reduce((latest, tx) => (tx.purchasedAt > latest.purchasedAt ? tx : latest));

    const base = {
      id: `holding-${ticker.toLowerCase()}`,
      ticker,
      name: mostRecent.name,
      quantity,
      averageCost,
    };

    if (mostRecent.assetClass === ASSET_CLASS.STOCK) {
      return { ...base, assetClass: ASSET_CLASS.STOCK, exchange: 'B3' };
    }

    return { ...base, assetClass: ASSET_CLASS.CRYPTO };
  });
}
