import { ASSET_CLASS } from '@/types';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { AssetHolding, Transaction } from '@/features/portfolio/types';

/**
 * Agrega as transações por ticker em posições (`AssetHolding`), processando
 * o histórico em ordem cronológica:
 * - Compras recalculam o custo médio ponderado, com as taxas embutidas no
 *   custo (`Σ(quantidade × preço + taxa) / Σ(quantidade)`).
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
        const totalCost =
          quantity * averageCost + transaction.quantity * transaction.pricePaid + transaction.fee;
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

/** Quantidade em estoque de um ticker, derivada do histórico (0 se não houver posição). */
export function getAvailableQuantity(transactions: Transaction[], ticker: string): number {
  const normalizedTicker = ticker.trim().toUpperCase();
  const holding = getHoldingsFromTransactions(transactions).find((item) => item.ticker === normalizedTicker);
  return holding?.quantity ?? 0;
}
