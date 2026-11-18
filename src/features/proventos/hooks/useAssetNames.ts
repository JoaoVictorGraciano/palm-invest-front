import { useQueries } from '@tanstack/react-query';
import { searchAssets } from '@/features/portfolio/services/asset-search.api';
import type { AssetClass } from '@/types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface NamedAsset {
  ticker: string;
  assetClass: AssetClass;
}

/**
 * Nome do ativo pela busca da API (`GET /api/assets/search`), procurando o
 * símbolo exato na classe dele. Devolve `null` quando a busca não traz um
 * nome diferente do próprio símbolo.
 */
export async function findAssetName(asset: NamedAsset, signal?: AbortSignal): Promise<string | null> {
  const { suggestions } = await searchAssets(asset.ticker, signal, asset.assetClass);
  const name = suggestions.find((suggestion) => suggestion.ticker === asset.ticker)?.name?.trim();
  return name && name !== asset.ticker ? name : null;
}

/**
 * Nomes dos ativos da carteira (as transações só guardam o símbolo). Cada
 * nome é buscado uma vez e guardado por um dia; enquanto não chega, ou se a
 * busca falhar, o ativo fica sem nome no mapa.
 */
export function useAssetNames(assets: NamedAsset[]): ReadonlyMap<string, string> {
  return useQueries({
    queries: assets.map((asset) => ({
      queryKey: ['asset-name', asset.assetClass, asset.ticker],
      queryFn: ({ signal }: { signal: AbortSignal }) => findAssetName(asset, signal),
      staleTime: ONE_DAY_MS,
      gcTime: ONE_DAY_MS,
      retry: false,
      meta: { silent: true },
    })),
    combine: (results) => {
      const names = new Map<string, string>();
      results.forEach((result, index) => {
        if (result.data) names.set(assets[index].ticker, result.data);
      });
      return names;
    },
  });
}
