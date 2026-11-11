import { deleteTransaction, listTransactions } from '@/features/portfolio/services/transactions.api';

/** Parte das transações do ativo foi excluída e parte não: a API não tem exclusão atômica por ativo. */
export class PartialAssetDeletionError extends Error {
  readonly ticker: string;
  readonly deleted: number;
  readonly total: number;

  constructor(ticker: string, deleted: number, total: number) {
    super(`Apenas ${deleted} de ${total} transações de ${ticker} foram excluídas.`);
    this.name = 'PartialAssetDeletionError';
    this.ticker = ticker;
    this.deleted = deleted;
    this.total = total;
  }
}

export interface AssetDeletionResult {
  ticker: string;
  deleted: number;
}

/**
 * Remove um ativo da carteira excluindo, uma a uma, todas as transações do
 * ticker (`DELETE /api/transactions/{id}`). A lista é relida da API antes,
 * para não depender de cache desatualizado.
 *
 * Não é atômico: se alguma exclusão falhar, lança `PartialAssetDeletionError`
 * (ou o erro original, se nenhuma foi excluída). Trocar por um único
 * endpoint de exclusão por ativo quando o back-end oferecer.
 */
export async function deleteAssetTransactions(ticker: string): Promise<AssetDeletionResult> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const transactions = (await listTransactions()).filter((transaction) => transaction.ticker === normalizedTicker);

  const results = await Promise.allSettled(transactions.map((transaction) => deleteTransaction(transaction.id)));
  const failures = results.filter((result) => result.status === 'rejected');
  const deleted = results.length - failures.length;

  if (failures.length > 0) {
    if (deleted === 0) throw failures[0].reason;
    throw new PartialAssetDeletionError(normalizedTicker, deleted, results.length);
  }

  return { ticker: normalizedTicker, deleted };
}
