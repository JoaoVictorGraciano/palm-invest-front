import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { TransactionType } from '@/features/portfolio/types';
import { formatCurrency } from '@/utils';

interface TransactionAmounts {
  type: TransactionType;
  quantity: number;
  /** Preço por unidade. */
  price: number;
  fee: number;
}

/**
 * Valor total de uma operação: na compra as taxas somam ao que se paga; na
 * venda, descontam do que se recebe. `null` enquanto quantidade ou preço
 * não forem números positivos.
 */
export function calculateTransactionTotal({ type, quantity, price, fee }: TransactionAmounts): number | null {
  if (!Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price <= 0) return null;

  const safeFee = Number.isFinite(fee) && fee > 0 ? fee : 0;
  const gross = quantity * price;
  return type === TRANSACTION_TYPE.SELL ? gross - safeFee : gross + safeFee;
}

const quantityFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 });

/**
 * A conta do total por extenso, ex: "40 × R$ 15,00 + taxas R$ 0,00 = R$ 600,00"
 * (na venda, "− taxas"). `null` quando ainda não dá para calcular.
 */
export function describeTransactionTotal(amounts: TransactionAmounts): string | null {
  const total = calculateTransactionTotal(amounts);
  if (total === null) return null;

  const fee = Number.isFinite(amounts.fee) && amounts.fee > 0 ? amounts.fee : 0;
  const sign = amounts.type === TRANSACTION_TYPE.SELL ? '−' : '+';

  return `${quantityFormatter.format(amounts.quantity)} × ${formatCurrency(amounts.price)} ${sign} taxas ${formatCurrency(fee)} = ${formatCurrency(total)}`;
}
