import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MIN_SEARCH_LENGTH, useAssetSearch } from '@/features/portfolio/hooks/useAssetSearch';
import { cn } from '@/lib/utils';
import type { AssetSearchProvider, AssetSuggestion } from '@/services';
import { ASSET_CLASS } from '@/types';
import type { AssetClass } from '@/types';

const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  [ASSET_CLASS.STOCK]: 'Ação',
  [ASSET_CLASS.CRYPTO]: 'Cripto',
};

const PROVIDER_FAILURE_LABEL: Record<AssetSearchProvider, string> = {
  brapi: 'A busca de ações está indisponível no momento.',
  coingecko: 'A busca de criptomoedas está indisponível no momento.',
};

function optionKey(option: AssetSuggestion): string {
  return `${option.assetClass}:${option.ticker}`;
}

interface TickerComboboxProps {
  id: string;
  /** Ativo escolhido; `null` enquanto o usuário não escolhe uma sugestão. */
  selected: AssetSuggestion | null;
  onSelect: (asset: AssetSuggestion | null) => void;
  /** Ativos que já estão na carteira: aparecem como sugestão mesmo sem a busca externa. */
  ownedAssets?: AssetSuggestion[];
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
}

/**
 * Campo de ticker com sugestões. O texto digitado serve só para buscar: o
 * valor do campo é sempre um ativo escolhido na lista, nunca texto livre.
 * Digitar depois de escolher desfaz a escolha.
 */
export function TickerCombobox({ id, selected, onSelect, ownedAssets, invalid, inputRef, onBlur }: TickerComboboxProps) {
  const listboxId = useId();
  const [text, setText] = useState(selected?.ticker ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const term = text.trim().toUpperCase();
  const { suggestions, failedProviders, isSearching } = useAssetSearch(selected ? '' : text);

  const options = useMemo(() => {
    if (term === '') return [];

    const owned = (ownedAssets ?? []).filter((asset) => asset.ticker.includes(term));
    const seen = new Set(owned.map(optionKey));
    return [...owned, ...suggestions.filter((suggestion) => !seen.has(optionKey(suggestion)))];
  }, [ownedAssets, suggestions, term]);

  const showList = open && !selected && term !== '';
  const highlighted = Math.min(activeIndex, Math.max(options.length - 1, 0));

  function choose(option: AssetSuggestion) {
    setText(option.ticker);
    setOpen(false);
    onSelect(option);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList || options.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((highlighted + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((highlighted - 1 + options.length) % options.length);
    } else if (event.key === 'Enter') {
      // Enter escolhe a sugestão em vez de enviar o formulário.
      event.preventDefault();
      choose(options[highlighted]);
    }
  }

  let status: string | null = null;
  if (options.length === 0) {
    if (term.length < MIN_SEARCH_LENGTH) status = `Digite ao menos ${MIN_SEARCH_LENGTH} caracteres para buscar.`;
    else if (isSearching) status = 'Buscando…';
    else if (failedProviders.length === 0) status = `Nenhum ativo encontrado para "${term}".`;
  } else if (isSearching) {
    status = 'Buscando…';
  }

  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={showList && options.length > 0 ? `${listboxId}-${highlighted}` : undefined}
        aria-invalid={invalid}
        autoComplete="off"
        placeholder="Busque por ticker ou nome (ex: PETR4, BTC)"
        className="uppercase placeholder:normal-case"
        value={text}
        onChange={(event) => {
          setText(event.target.value.toUpperCase());
          setOpen(true);
          setActiveIndex(0);
          if (selected) onSelect(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={handleKeyDown}
      />

      {showList && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
          <ul id={listboxId} role="listbox" aria-label="Sugestões de ativos">
            {options.map((option, index) => (
              <li
                key={optionKey(option)}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === highlighted}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  index === highlighted && 'bg-accent text-accent-foreground',
                )}
                // `mousedown` com preventDefault mantém o foco no campo até o clique terminar.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span className="font-medium">{option.ticker}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{option.name}</span>
                <Badge variant="outline">{ASSET_CLASS_LABEL[option.assetClass]}</Badge>
              </li>
            ))}
          </ul>

          {status && <p className="px-2 py-1.5 text-sm text-muted-foreground">{status}</p>}
          {failedProviders.map((provider) => (
            <p key={provider} className="px-2 py-1.5 text-sm text-muted-foreground">
              {PROVIDER_FAILURE_LABEL[provider]}
            </p>
          ))}
        </div>
      )}

      {selected && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {ASSET_CLASS_LABEL[selected.assetClass]}
          {selected.name !== selected.ticker && ` · ${selected.name}`}
        </p>
      )}
    </div>
  );
}
