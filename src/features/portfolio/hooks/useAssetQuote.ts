import { useQuery } from '@tanstack/react-query';
import { fetchCryptoQuotes, fetchStockQuotes } from '@/services';
import type { AssetSuggestion } from '@/services';
import { ASSET_CLASS } from '@/types';

/** A partir de qual diferença relativa o preço digitado é considerado fora do esperado (50%). */
export const PRICE_DEVIATION_THRESHOLD = 0.5;

/**
 * Diferença relativa entre o preço digitado e a cotação (0.6 = 60% acima,
 * -0.6 = 60% abaixo). `null` quando não dá para comparar.
 */
export function priceDeviation(price: number, quote: number | null | undefined): number | null {
  if (quote == null || !Number.isFinite(price) || !Number.isFinite(quote) || quote <= 0 || price <= 0) return null;
  return (price - quote) / quote;
}

export function isPriceFarFromQuote(price: number, quote: number | null | undefined): boolean {
  const deviation = priceDeviation(price, quote);
  return deviation !== null && Math.abs(deviation) > PRICE_DEVIATION_THRESHOLD;
}

async function fetchQuotePrice(asset: AssetSuggestion): Promise<number | null> {
  const { quotes } =
    asset.assetClass === ASSET_CLASS.STOCK
      ? await fetchStockQuotes([asset.ticker])
      : await fetchCryptoQuotes([asset.ticker]);

  return quotes[0]?.price ?? null;
}

/**
 * Cotação atual (em reais) do ativo escolhido no formulário, usada só como
 * referência para o preço digitado. `null` quando o provedor não tem a
 * cotação; nesse caso o formulário segue sem a comparação.
 */
export function useAssetQuote(asset: AssetSuggestion | null) {
  const query = useQuery({
    queryKey: ['asset-quote', asset?.assetClass, asset?.ticker],
    queryFn: () => fetchQuotePrice(asset!),
    enabled: asset !== null,
    staleTime: 60_000,
    retry: false,
    // A cotação é só uma referência: falhar não vale um toast de erro.
    meta: { silent: true },
  });

  return {
    price: asset === null ? null : (query.data ?? null),
    isLoading: asset !== null && query.isLoading,
  };
}
