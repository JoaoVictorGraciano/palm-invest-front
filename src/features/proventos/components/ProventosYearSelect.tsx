import { cn } from '@/lib/utils';

interface ProventosYearSelectProps {
  value: number;
  years: number[];
  onChange: (year: number) => void;
  className?: string;
}

/** Seletor nativo de ano (acessível e simples de usar no celular). */
export function ProventosYearSelect({ value, years, onChange, className }: ProventosYearSelectProps) {
  const options = years.includes(value) ? years : [value, ...years].sort((a, b) => b - a);

  return (
    <label className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      Ano
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
