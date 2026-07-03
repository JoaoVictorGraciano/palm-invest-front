import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddTransaction } from '@/features/portfolio/hooks/useAddTransaction';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import { ASSET_CLASS } from '@/types';

const contributionFormSchema = z.object({
  type: z.enum([TRANSACTION_TYPE.BUY, TRANSACTION_TYPE.SELL]),
  ticker: z
    .string()
    .trim()
    .min(1, 'Informe o ticker do ativo.')
    .max(15, 'Use no máximo 15 caracteres.')
    .regex(/^[A-Za-z0-9]+$/, 'Use apenas letras e números (ex: PETR4, BTC).'),
  assetClass: z.enum([ASSET_CLASS.STOCK, ASSET_CLASS.CRYPTO]),
  quantity: z.coerce.number().positive('Informe uma quantidade maior que zero.'),
  pricePaid: z.coerce.number().positive('Informe um preço maior que zero.'),
});

type ContributionFormInput = z.input<typeof contributionFormSchema>;
type ContributionFormOutput = z.output<typeof contributionFormSchema>;

interface ContributionFormProps {
  /** Chamado após a transação ser salva com sucesso (ex: fechar o Dialog). */
  onSuccess: () => void;
  /** Notifica o pai sobre o estado de envio, para controlar o botão no rodapé do Dialog. */
  onPendingChange?: (isPending: boolean) => void;
  formId: string;
}

export function ContributionForm({ onSuccess, onPendingChange, formId }: ContributionFormProps) {
  const { mutate, isPending } = useAddTransaction();

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const form = useForm<ContributionFormInput, unknown, ContributionFormOutput>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: {
      type: TRANSACTION_TYPE.BUY,
      ticker: '',
      assetClass: ASSET_CLASS.STOCK,
      quantity: undefined as unknown as number,
      pricePaid: undefined as unknown as number,
    },
  });

  const transactionType = form.watch('type');
  const isSell = transactionType === TRANSACTION_TYPE.SELL;

  function onSubmit(values: ContributionFormOutput) {
    mutate(
      {
        ticker: values.ticker,
        assetClass: values.assetClass,
        type: values.type,
        quantity: values.quantity,
        pricePaid: values.pricePaid,
      },
      { onSuccess: () => onSuccess() },
    );
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
                <RadioGroup
                  className="grid-cols-2"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <Label
                    htmlFor="type-buy"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 has-data-checked:border-primary/30 has-data-checked:bg-primary/5"
                  >
                    <RadioGroupItem value={TRANSACTION_TYPE.BUY} id="type-buy" />
                    Compra
                  </Label>
                  <Label
                    htmlFor="type-sell"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 has-data-checked:border-primary/30 has-data-checked:bg-primary/5"
                  >
                    <RadioGroupItem value={TRANSACTION_TYPE.SELL} id="type-sell" />
                    Venda
                  </Label>
                </RadioGroup>
              )}
            />
            <FieldError errors={form.formState.errors.type ? [form.formState.errors.type] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.ticker}>
          <FieldLabel htmlFor="ticker">Ticker</FieldLabel>
          <FieldContent>
            <Input
              id="ticker"
              placeholder="Ex: PETR4, BTC"
              autoComplete="off"
              autoCapitalize="characters"
              aria-invalid={!!form.formState.errors.ticker}
              {...form.register('ticker')}
            />
            <FieldError errors={form.formState.errors.ticker ? [form.formState.errors.ticker] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.assetClass}>
          <FieldLabel htmlFor="assetClass">Classe do ativo</FieldLabel>
          <FieldContent>
            <Controller
              control={form.control}
              name="assetClass"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="assetClass" className="w-full" aria-invalid={!!form.formState.errors.assetClass}>
                    <SelectValue placeholder="Selecione a classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ASSET_CLASS.STOCK}>Ação</SelectItem>
                    <SelectItem value={ASSET_CLASS.CRYPTO}>Criptomoeda</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={form.formState.errors.assetClass ? [form.formState.errors.assetClass] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.quantity}>
          <FieldLabel htmlFor="quantity">{isSell ? 'Quantidade vendida' : 'Quantidade comprada'}</FieldLabel>
          <FieldContent>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0"
              placeholder="Ex: 100"
              aria-invalid={!!form.formState.errors.quantity}
              {...form.register('quantity')}
            />
            <FieldError errors={form.formState.errors.quantity ? [form.formState.errors.quantity] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!form.formState.errors.pricePaid}>
          <FieldLabel htmlFor="pricePaid">{isSell ? 'Preço de venda (por unidade)' : 'Preço pago (por unidade)'}</FieldLabel>
          <FieldContent>
            <Input
              id="pricePaid"
              type="number"
              step="any"
              min="0"
              placeholder="Ex: 32.50"
              aria-invalid={!!form.formState.errors.pricePaid}
              {...form.register('pricePaid')}
            />
            <FieldError errors={form.formState.errors.pricePaid ? [form.formState.errors.pricePaid] : undefined} />
          </FieldContent>
        </Field>
      </FieldGroup>
    </form>
  );
}
