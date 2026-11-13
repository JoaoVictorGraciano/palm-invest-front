import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveTransaction } from '@/features/portfolio/hooks/useSaveTransaction';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import { getAvailableQuantity } from '@/features/portfolio/services/holdings';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { Transaction } from '@/features/portfolio/types';
import { ASSET_CLASS } from '@/types';

const contributionFormSchema = z.object({
  type: z.enum([TRANSACTION_TYPE.BUY, TRANSACTION_TYPE.SELL]),
  transactionDate: z.string().min(1, 'Informe a data e hora.'),
  ticker: z.string().trim().min(1, 'Informe o ticker do ativo.').max(15, 'Use no máximo 15 caracteres.').regex(/^[A-Za-z0-9]+$/, 'Use apenas letras e números.'),
  assetClass: z.enum([ASSET_CLASS.STOCK, ASSET_CLASS.CRYPTO]),
  quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
  pricePaid: z.coerce.number().positive('Informe um preço maior que zero.'),
  broker: z.string().trim().min(1, 'Informe a corretora (Ex: CLEAR, XP).'),
  fee: z.coerce.number().min(0, 'A taxa não pode ser negativa.'),
  observation: z.string().optional(),
});

type ContributionFormInput = z.input<typeof contributionFormSchema>;
type ContributionFormOutput = z.output<typeof contributionFormSchema>;

interface ContributionFormProps {
  onSuccess: () => void;
  onPendingChange?: (isPending: boolean) => void;
  formId: string;
  /** Quando presente, o formulário edita esta transação (PUT) em vez de criar uma nova (POST). */
  transactionToEdit?: Transaction;
}

export function ContributionForm({ onSuccess, onPendingChange, formId, transactionToEdit }: ContributionFormProps) {
  const { mutateAsync, isPending } = useSaveTransaction();
  const { data: transactions } = useTransactions();

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  // 🚀 Lógica de Data Corrigida: Evita o "Bug do Fuso Horário"
  // Se for edição, corta a string exata do Java (YYYY-MM-DDTHH:mm) sem converter para UTC.
  // Se for nova transação, pega a data/hora exata do seu computador no Brasil.
  const defaultDate = transactionToEdit?.purchasedAt
    ? transactionToEdit.purchasedAt.substring(0, 16)
    : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const form = useForm<ContributionFormInput, unknown, ContributionFormOutput>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: {
      type: transactionToEdit?.type || TRANSACTION_TYPE.BUY,
      transactionDate: defaultDate,
      ticker: transactionToEdit?.ticker || '',
      assetClass: transactionToEdit?.assetClass || ASSET_CLASS.STOCK,
      quantity: transactionToEdit?.quantity || (undefined as unknown as number),
      pricePaid: transactionToEdit?.pricePaid || (undefined as unknown as number),
      broker: transactionToEdit?.broker ?? '',
      fee: transactionToEdit?.fee ?? 0,
      observation: transactionToEdit?.observation ?? '',
    },
  });

  const transactionType = form.watch('type');
  const isSell = transactionType === TRANSACTION_TYPE.SELL;

  async function onSubmit(values: ContributionFormOutput) {
    const ticker = values.ticker.toUpperCase();

    // Conveniência no cliente: não deixa vender mais do que há em estoque.
    // Na edição, a própria transação editada não conta para o saldo.
    if (values.type === TRANSACTION_TYPE.SELL && transactions) {
      const others = transactions.filter((transaction) => transaction.id !== transactionToEdit?.id);
      const available = getAvailableQuantity(others, ticker);

      if (values.quantity > available) {
        form.setError(
          'quantity',
          {
            message:
              available > 0
                ? `Você possui apenas ${available} unidade(s) de ${ticker}.`
                : `Você não possui ${ticker} na carteira.`,
          },
          { shouldFocus: true },
        );
        return;
      }
    }

    try {
      // Com `transactionToEdit` é edição (PUT); sem, é criação (POST).
      await mutateAsync({
        id: transactionToEdit?.id,
        input: {
          type: values.type,
          ticker,
          assetClass: values.assetClass,
          quantity: values.quantity,
          pricePaid: values.pricePaid,
          transactionDate: `${values.transactionDate}:00`,
          broker: values.broker,
          fee: values.fee,
          observation: values.observation ?? '',
        },
      });
      onSuccess();
    } catch {
      // O erro já foi exibido em um toast pelo `useSaveTransaction`; o diálogo permanece aberto.
    }
  }

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.type}>
          <FieldLabel>Tipo de transação</FieldLabel>
          <FieldContent>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <RadioGroup className="grid-cols-2" value={field.value} onValueChange={field.onChange}>
                  <Label htmlFor="type-buy" className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 has-data-checked:border-primary/30 has-data-checked:bg-primary/5">
                    <RadioGroupItem value={TRANSACTION_TYPE.BUY} id="type-buy" /> Compra
                  </Label>
                  <Label htmlFor="type-sell" className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 has-data-checked:border-primary/30 has-data-checked:bg-primary/5">
                    <RadioGroupItem value={TRANSACTION_TYPE.SELL} id="type-sell" /> Venda
                  </Label>
                </RadioGroup>
              )}
            />
            <FieldError errors={form.formState.errors.type ? [form.formState.errors.type] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.transactionDate}>
          <FieldLabel htmlFor="transactionDate">Data e Hora da Transação</FieldLabel>
          <FieldContent>
            <Input id="transactionDate" type="datetime-local" aria-invalid={!!form.formState.errors.transactionDate} {...form.register('transactionDate')} />
            <FieldError errors={form.formState.errors.transactionDate ? [form.formState.errors.transactionDate] : undefined} />
          </FieldContent>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.ticker}>
            <FieldLabel htmlFor="ticker">Ticker</FieldLabel>
            <FieldContent>
              <Input id="ticker" placeholder="EX: PETR4" autoComplete="off" className="uppercase" aria-invalid={!!form.formState.errors.ticker} {...form.register('ticker', { onChange: (e) => e.target.value = e.target.value.toUpperCase() })} />
              <FieldError errors={form.formState.errors.ticker ? [form.formState.errors.ticker] : undefined} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!form.formState.errors.assetClass}>
            <FieldLabel htmlFor="assetClass">Classe</FieldLabel>
            <FieldContent>
              <Controller control={form.control} name="assetClass" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="assetClass" className="w-full" aria-invalid={!!form.formState.errors.assetClass}><SelectValue placeholder="Classe" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ASSET_CLASS.STOCK}>Ação</SelectItem>
                    <SelectItem value={ASSET_CLASS.CRYPTO}>Criptomoeda</SelectItem>
                  </SelectContent>
                </Select>
              )} />
              <FieldError errors={form.formState.errors.assetClass ? [form.formState.errors.assetClass] : undefined} />
            </FieldContent>
          </Field>
        </div>

        <Field data-invalid={!!form.formState.errors.broker}>
          <FieldLabel htmlFor="broker">Corretora / Exchange</FieldLabel>
          <FieldContent>
            <Input id="broker" placeholder="EX: CLEAR, NUINVEST, BINANCE..." autoComplete="off" className="uppercase" aria-invalid={!!form.formState.errors.broker} {...form.register('broker', { onChange: (e) => e.target.value = e.target.value.toUpperCase() })} />
            <FieldError errors={form.formState.errors.broker ? [form.formState.errors.broker] : undefined} />
          </FieldContent>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.quantity}>
            <FieldLabel htmlFor="quantity">{isSell ? 'Qtd vendida' : 'Qtd comprada'}</FieldLabel>
            <FieldContent>
              <Input id="quantity" type="number" step="any" min="0" placeholder="Ex: 100" aria-invalid={!!form.formState.errors.quantity} {...form.register('quantity')} />
              <FieldError errors={form.formState.errors.quantity ? [form.formState.errors.quantity] : undefined} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!form.formState.errors.pricePaid}>
            <FieldLabel htmlFor="pricePaid">{isSell ? 'Preço (venda)' : 'Preço (compra)'}</FieldLabel>
            <FieldContent>
              <Input id="pricePaid" type="number" step="any" min="0" placeholder="Ex: 32.50" aria-invalid={!!form.formState.errors.pricePaid} {...form.register('pricePaid')} />
              <FieldError errors={form.formState.errors.pricePaid ? [form.formState.errors.pricePaid] : undefined} />
            </FieldContent>
          </Field>
        </div>

        <Field data-invalid={!!form.formState.errors.fee}>
          <FieldLabel htmlFor="fee">Taxas e Custos (R$)</FieldLabel>
          <FieldContent>
            <Input id="fee" type="number" step="any" min="0" placeholder="Ex: 2.50" aria-invalid={!!form.formState.errors.fee} {...form.register('fee')} />
            <FieldError errors={form.formState.errors.fee ? [form.formState.errors.fee] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.observation}>
          <FieldLabel htmlFor="observation">Observações (Opcional)</FieldLabel>
          <FieldContent>
            <Input id="observation" placeholder="EX: APORTE MENSAL..." autoComplete="off" className="uppercase" aria-invalid={!!form.formState.errors.observation} {...form.register('observation', { onChange: (e) => e.target.value = e.target.value.toUpperCase() })} />
            <FieldError errors={form.formState.errors.observation ? [form.formState.errors.observation] : undefined} />
          </FieldContent>
        </Field>
      </FieldGroup>
    </form>
  );
}