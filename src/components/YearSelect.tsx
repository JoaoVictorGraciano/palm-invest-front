import { useId } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface YearSelectProps {
  value: number;
  years: number[];
  onChange: (year: number) => void;
  className?: string;
}

/** Seletor de ano com o `Select` do projeto (legível nos temas claro e escuro). */
export function YearSelect({ value, years, onChange, className }: YearSelectProps) {
  const labelId = useId();
  const options = years.includes(value) ? years : [value, ...years].sort((a, b) => b - a);

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <span id={labelId}>Ano</span>
      <Select value={String(value)} onValueChange={(year) => onChange(Number(year))}>
        <SelectTrigger aria-labelledby={labelId} className="min-w-24 text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {options.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
