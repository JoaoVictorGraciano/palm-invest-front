import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AssetFilter } from '@/features/portfolio/types';
import { ASSET_CLASS_ORDER, ASSET_CLASS_PLURAL_LABEL } from '@/utils';

interface AssetClassFilterProps {
  value: AssetFilter;
  onChange: (value: AssetFilter) => void;
  /** Tamanho dos botões; `xs` cabe em espaços estreitos, como o diálogo de transação. */
  size?: 'xs' | 'sm';
  /** Nome acessível do grupo de botões. */
  label?: string;
  className?: string;
}

const OPTIONS: { value: AssetFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  ...ASSET_CLASS_ORDER.map((assetClass) => ({ value: assetClass, label: ASSET_CLASS_PLURAL_LABEL[assetClass] })),
];

/** Botões "Todos | Ações | FIIs | ETFs | BDRs | Cripto" para filtrar por classe de ativo. */
export function AssetClassFilter({
  value,
  onChange,
  size = 'sm',
  label = 'Filtrar por classe de ativo',
  className,
}: AssetClassFilterProps) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          // `type="button"`: dentro de um formulário, o padrão seria enviar o formulário.
          type="button"
          size={size}
          variant={value === option.value ? 'default' : 'outline'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
