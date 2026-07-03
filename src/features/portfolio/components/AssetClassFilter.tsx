import { Button } from '@/components/ui/button';
import { ASSET_CLASS } from '@/types';
import type { AssetFilter } from '@/features/portfolio/types';

interface AssetClassFilterProps {
  value: AssetFilter;
  onChange: (value: AssetFilter) => void;
}

const OPTIONS: { value: AssetFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: ASSET_CLASS.STOCK, label: 'Ações' },
  { value: ASSET_CLASS.CRYPTO, label: 'Criptomoedas' },
];

export function AssetClassFilter({ value, onChange }: AssetClassFilterProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
