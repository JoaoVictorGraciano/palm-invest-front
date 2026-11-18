import { useMemo } from 'react';
import { useProventos } from '@/features/proventos/hooks/useProventos';
import type { Provento } from '@/features/proventos/types';

/** Total líquido recebido por ticker, somando todos os anos. */
export function sumNetByTicker(proventos: Provento[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const provento of proventos) {
    totals.set(provento.ticker, (totals.get(provento.ticker) ?? 0) + provento.valorLiquido);
  }
  return totals;
}

/**
 * Proventos líquidos recebidos por ativo, de todos os anos. Fica
 * `undefined` enquanto carrega ou se a API falhar: a carteira mostra "—" em
 * vez de um zero enganoso.
 */
export function useProventosByTicker(): ReadonlyMap<string, number> | undefined {
  const { data } = useProventos();
  return useMemo(() => (data ? sumNetByTicker(data) : undefined), [data]);
}
