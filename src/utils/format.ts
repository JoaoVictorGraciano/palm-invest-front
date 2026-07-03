/**
 * Funções utilitárias puras de formatação, sem dependência de estado ou de UI.
 */

export function formatCurrency(value: number, locale = 'pt-BR', currency = 'BRL'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/**
 * Formata um percentual (valor em escala 0-100, ex: 12.5 -> "12,50%").
 * `signDisplay: 'exceptZero'` (padrão) é ideal para variações/lucros
 * ("+12,50%" / "-4,00%"); use `'never'` para proporções puras (ex: fatia de
 * um gráfico de distribuição), onde um "+" não faz sentido.
 */
export function formatPercentage(
  value: number,
  locale = 'pt-BR',
  signDisplay: Intl.NumberFormatOptions['signDisplay'] = 'exceptZero',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay,
  }).format(value / 100);
}

export function formatDate(date: Date | string, locale = 'pt-BR'): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(parsed);
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}
