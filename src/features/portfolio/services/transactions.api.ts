import type { AssetClass } from '@/types';
import { httpClient } from '@/services';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction, TransactionInput, TransactionType } from '@/features/portfolio/types';

/**
 * Acesso às transações na palm-invest-api (`/api/transactions`). É a única
 * fonte de dados da carteira e o único lugar que conhece o formato da API:
 * o resto da aplicação trabalha com `Transaction`.
 */

const TRANSACTIONS_PATH = '/api/transactions';

/** Transação como a API devolve. */
export interface TransactionDto {
  id: number | string;
  type: string;
  assetSymbol: string;
  assetClass: AssetClass;
  quantity: number | string;
  price: number | string;
  transactionDate: string;
  broker?: string | null;
  fee?: number | string | null;
  observation?: string | null;
}

/** Corpo aceito pela API em POST e PUT (sem `id`). */
export interface TransactionPayload {
  type: TransactionType;
  assetSymbol: string;
  assetClass: AssetClass;
  quantity: number;
  price: number;
  transactionDate: string;
  broker: string;
  fee: number;
  observation: string;
}

function toTransactionType(type: string | null | undefined): TransactionType {
  const normalized = (type ?? '').toUpperCase();
  return normalized === 'SELL' || normalized === 'VENDA' ? TRANSACTION_TYPE.SELL : TRANSACTION_TYPE.BUY;
}

export function toTransaction(dto: TransactionDto): Transaction {
  const ticker = (dto.assetSymbol ?? '').trim().toUpperCase();

  return {
    id: String(dto.id),
    ticker,
    name: ticker,
    assetClass: dto.assetClass,
    type: toTransactionType(dto.type),
    quantity: Number(dto.quantity),
    pricePaid: Number(dto.price),
    purchasedAt: dto.transactionDate ?? '',
    broker: dto.broker ?? '',
    fee: Number(dto.fee ?? 0),
    observation: dto.observation ?? '',
  };
}

export function toPayload(input: TransactionInput): TransactionPayload {
  return {
    type: input.type,
    assetSymbol: input.ticker.trim().toUpperCase(),
    assetClass: input.assetClass,
    quantity: input.quantity,
    price: input.pricePaid,
    transactionDate: input.transactionDate,
    broker: input.broker.trim().toUpperCase(),
    fee: input.fee,
    observation: input.observation.trim().toUpperCase(),
  };
}

export async function listTransactions(): Promise<Transaction[]> {
  const response = await httpClient.get<TransactionDto[] | undefined>(TRANSACTIONS_PATH);
  return (response ?? []).map(toTransaction);
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const response = await httpClient.post<TransactionDto>(TRANSACTIONS_PATH, toPayload(input));
  return toTransaction(response);
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  const response = await httpClient.put<TransactionDto>(
    `${TRANSACTIONS_PATH}/${encodeURIComponent(id)}`,
    toPayload(input),
  );
  return toTransaction(response);
}

export async function deleteTransaction(id: string): Promise<void> {
  await httpClient.delete(`${TRANSACTIONS_PATH}/${encodeURIComponent(id)}`);
}

export interface AssetDeletionResult {
  ticker: string;
  /** Quantas transações foram apagadas. */
  deleted: number;
}

/**
 * Remove um ativo da carteira apagando todas as suas transações em uma única
 * chamada (`DELETE /api/transactions?assetSymbol=X`), atômica no servidor.
 * Lança `HttpError` 404 quando o ativo não tem nenhuma transação.
 */
export async function deleteAssetTransactions(ticker: string): Promise<AssetDeletionResult> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const response = await httpClient.delete<{ assetSymbol?: string; excluidas?: number } | undefined>(
    `${TRANSACTIONS_PATH}?assetSymbol=${encodeURIComponent(normalizedTicker)}`,
  );

  return {
    ticker: response?.assetSymbol ?? normalizedTicker,
    deleted: Number(response?.excluidas ?? 0),
  };
}
