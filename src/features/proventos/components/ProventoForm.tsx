import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import { getHoldingsFromTransactions } from '@/features/portfolio/services/holdings';
import { useAssetNames } from '@/features/proventos/hooks/useAssetNames';
import { isProventoFormError, useSaveProvento } from '@/features/proventos/hooks/useSaveProvento';
import { TIPO_PROVENTO, TIPO_PROVENTO_ORDER } from '@/features/proventos/types';
import type { Provento, TipoProvento } from '@/features/proventos/types';
import {
  TIPOS_POR_CLASSE,
  TIPO_PROVENTO_LABEL,
  paysProventos,
  suggestJcpIr,
  todayIsoDate,
} from '@/features/proventos/utils/proventos';
import { parseValidationErrors } from '@/services';
import type { HttpError } from '@/services';
import type { AssetClass } from '@/types';
import { ASSET_CLASS_LABEL, formatCurrency } from '@/utils';

const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const proventoFormSchema = z
  .object({
    ticker: z.string().min(1, 'Escolha um ativo da sua carteira.'),
    tipo: z.enum([TIPO_PROVENTO.DIVIDENDO, TIPO_PROVENTO.JCP, TIPO_PROVENTO.RENDIMENTO, TIPO_PROVENTO.AMORTIZACAO]),
    dataPagamento: z
      .string()
      .min(1, 'Informe a data de pagamento.')
      .refine((value) => value <= todayIsoDate(), 'A data de pagamento não pode ser futura.'),
    valorBruto: z.coerce
      .number()
      .positive('Informe um valor bruto maior que zero.')
      .refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais.'),
    irRetido: z.coerce
      .number()
      .min(0, 'O IR retido não pode ser negativo.')
      .refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais.'),
    observacao: z.string().max(255, 'Use no máximo 255 caracteres.'),
  })
  .refine((values) => values.irRetido <= values.valorBruto, {
    path: ['irRetido'],
    message: 'O IR retido não pode passar do valor bruto.',
  });

type ProventoFormInput = z.input<typeof proventoFormSchema>;
type ProventoFormOutput = z.output<typeof proventoFormSchema>;

/** Campo do formulário que corresponde a cada campo do corpo da API. */
const FORM_FIELD_BY_API_FIELD: Record<string, keyof ProventoFormInput | undefined> = {
  assetSymbol: 'ticker',
  tipo: 'tipo',
  dataPagamento: 'dataPagamento',
  valorBruto: 'valorBruto',
  irRetido: 'irRetido',
  observacao: 'observacao',
};

interface AssetOption {
  ticker: string;
  assetClass: AssetClass;
}

/** Ex: "PETR4 · PETROBRAS PN · Ação"; sem o nome enquanto ele não chega da API. */
function assetLabel(option: AssetOption, name: string | undefined): string {
  return [option.ticker, name, ASSET_CLASS_LABEL[option.assetClass]].filter(Boolean).join(' · ');
}

interface ProventoFormProps {
  formId: string;
  onSuccess: (provento: Provento) => void;
  onPendingChange?: (isPending: boolean) => void;
  /** Quando presente, edita este provento (PUT) em vez de registrar um novo (POST). */
  proventoToEdit?: Provento;
}

export function ProventoForm({ formId, onSuccess, onPendingChange, proventoToEdit }: ProventoFormProps) {
  const { mutateAsync, isPending } = useSaveProvento();
  const transactionsQuery = useTransactions();
  const today = todayIsoDate();

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  // Só os ativos da carteira que pagam proventos (cripto fica de fora). Na edição, o
  // ativo salvo entra mesmo que já tenha sido vendido.
  const assetOptions = useMemo<AssetOption[]>(() => {
    const options: AssetOption[] = getHoldingsFromTransactions(transactionsQuery.data ?? [])
      .filter((holding) => paysProventos(holding.assetClass))
      .map((holding) => ({ ticker: holding.ticker, assetClass: holding.assetClass }));
    if (proventoToEdit && !options.some((option) => option.ticker === proventoToEdit.ticker)) {
      options.push({ ticker: proventoToEdit.ticker, assetClass: proventoToEdit.assetClass });
    }
    return options.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [transactionsQuery.data, proventoToEdit]);
  const assetNames = useAssetNames(assetOptions);

  const form = useForm<ProventoFormInput, unknown, ProventoFormOutput>({
    resolver: zodResolver(proventoFormSchema),
    defaultValues: {
      ticker: proventoToEdit?.ticker ?? '',
      tipo: proventoToEdit?.tipo ?? TIPO_PROVENTO.DIVIDENDO,
      dataPagamento: proventoToEdit?.dataPagamento ?? today,
      valorBruto: proventoToEdit?.valorBruto ?? ('' as unknown as number),
      irRetido: proventoToEdit?.irRetido ?? 0,
      observacao: proventoToEdit?.observacao ?? '',
    },
  });

  // Enquanto o usuário não mexer no IR, ele segue a sugestão do tipo (15% do bruto no JCP, 0 nos outros).
  // Na edição, o IR salvo é mantido até o tipo mudar.
  const [irEditedByUser, setIrEditedByUser] = useState(proventoToEdit !== undefined);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const tipo = form.watch('tipo');
  const valorBruto = Number(form.watch('valorBruto'));
  const irRetido = Number(form.watch('irRetido') || 0);
  const isJcp = tipo === TIPO_PROVENTO.JCP;
  const selectedTicker = form.watch('ticker');

  /** Tipos que a classe do ativo paga; sem ativo escolhido, todos. Na edição, o tipo salvo continua valendo. */
  function tiposFor(ticker: string): TipoProvento[] {
    const assetClass = assetOptions.find((option) => option.ticker === ticker)?.assetClass;
    const tipos = assetClass ? TIPOS_POR_CLASSE[assetClass] : TIPO_PROVENTO_ORDER;
    const saved = proventoToEdit?.ticker === ticker ? proventoToEdit.tipo : undefined;
    return saved && !tipos.includes(saved) ? [...tipos, saved] : tipos;
  }
  const allowedTipos = tiposFor(selectedTicker);

  function applyIrSuggestion(nextTipo: TipoProvento, bruto: number) {
    form.setValue('irRetido', nextTipo === TIPO_PROVENTO.JCP ? suggestJcpIr(bruto) : 0, {
      shouldValidate: form.formState.isSubmitted,
    });
  }

  function handleTipoChange(nextTipo: TipoProvento) {
    form.setValue('tipo', nextTipo, { shouldDirty: true });
    setIrEditedByUser(false);
    applyIrSuggestion(nextTipo, Number(form.getValues('valorBruto')));
  }

  /** Ao trocar de ativo, um tipo que a nova classe não paga vira o primeiro tipo válido. */
  function handleTickerChange(ticker: string) {
    form.setValue('ticker', ticker, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    const tipos = tiposFor(ticker);
    if (tipos.length > 0 && !tipos.includes(form.getValues('tipo'))) handleTipoChange(tipos[0]);
  }

  const showNet = Number.isFinite(valorBruto) && valorBruto > 0 && Number.isFinite(irRetido);
  const netDescription = showNet
    ? `${formatCurrency(valorBruto)} − IR ${formatCurrency(irRetido)} = ${formatCurrency(valorBruto - irRetido)}`
    : null;

  async function onSubmit(values: ProventoFormOutput) {
    setApiMessage(null);
    try {
      const saved = await mutateAsync({
        id: proventoToEdit?.id,
        input: {
          ticker: values.ticker,
          tipo: values.tipo,
          dataPagamento: values.dataPagamento,
          valorBruto: values.valorBruto,
          irRetido: values.irRetido,
          observacao: values.observacao,
        },
      });
      onSuccess(saved);
    } catch (error) {
      // O diálogo continua aberto; os demais erros já viraram toast no `useSaveProvento`.
      if (isProventoFormError(error)) showApiError(error);
    }
  }

  function showApiError(error: HttpError) {
    // 422: regra de carteira (o usuário não tinha o ativo na data do pagamento).
    if (error.status === 422) {
      setApiMessage(error.message);
      return;
    }

    // 400: `[{campo, mensagem}]`, cada mensagem no seu campo.
    const { fields, general } = parseValidationErrors(error.body);
    const unmatched = [...general];
    let focused = false;

    for (const [apiField, message] of Object.entries(fields)) {
      const formField = FORM_FIELD_BY_API_FIELD[apiField];
      if (!formField) {
        unmatched.push(message);
        continue;
      }
      form.setError(formField, { message }, { shouldFocus: !focused });
      focused = true;
    }

    if (unmatched.length > 0 || !focused) {
      toast.error('Não foi possível salvar o provento', { description: unmatched.join(' ') || error.message });
    }
  }

  const errors = form.formState.errors;
  const noAssets = transactionsQuery.isSuccess && assetOptions.length === 0;

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {apiMessage && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive">
            {apiMessage}
          </p>
        )}

        <Field data-invalid={!!errors.ticker}>
          <FieldLabel htmlFor="provento-ticker">Ativo</FieldLabel>
          <FieldContent>
            <Controller
              control={form.control}
              name="ticker"
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleTickerChange} disabled={noAssets}>
                  <SelectTrigger
                    id="provento-ticker"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.ticker}
                    className="w-full"
                  >
                    <SelectValue placeholder="Escolha um ativo da carteira" />
                  </SelectTrigger>
                  {/* Mesma largura do campo: nomes longos da B3 são cortados com reticências. */}
                  <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                    {assetOptions.map((option) => {
                      const name = assetNames.get(option.ticker);
                      const label = assetLabel(option, name);
                      return (
                        <SelectItem
                          key={option.ticker}
                          value={option.ticker}
                          title={label}
                          className="*:[span]:last:min-w-0"
                        >
                          {/* Só o nome é cortado; a classe continua visível. O aria-label dá o texto inteiro. */}
                          <span aria-label={label} className="flex min-w-0">
                            <span className="truncate">{[option.ticker, name].filter(Boolean).join(' · ')}</span>
                            <span className="shrink-0 whitespace-pre">{' · '}{ASSET_CLASS_LABEL[option.assetClass]}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {noAssets && (
              <FieldDescription>Registre uma compra na Carteira antes de lançar proventos.</FieldDescription>
            )}
            <FieldError errors={errors.ticker ? [errors.ticker] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!errors.tipo}>
          <FieldLabel>Tipo</FieldLabel>
          <FieldContent>
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <RadioGroup
                  aria-label="Tipo"
                  className="grid-cols-2"
                  value={field.value}
                  onValueChange={(value) => handleTipoChange(value as TipoProvento)}
                >
                  {allowedTipos.map((option) => (
                    <Label
                      key={option}
                      htmlFor={`provento-tipo-${option}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 has-data-checked:border-primary/30 has-data-checked:bg-primary/5"
                    >
                      <RadioGroupItem value={option} id={`provento-tipo-${option}`} /> {TIPO_PROVENTO_LABEL[option]}
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
            <FieldError errors={errors.tipo ? [errors.tipo] : undefined} />
          </FieldContent>
        </Field>

        <Field data-invalid={!!errors.dataPagamento}>
          <FieldLabel htmlFor="provento-data">Data de pagamento</FieldLabel>
          <FieldContent>
            <Input
              id="provento-data"
              type="date"
              max={today}
              aria-invalid={!!errors.dataPagamento}
              {...form.register('dataPagamento')}
            />
            <FieldError errors={errors.dataPagamento ? [errors.dataPagamento] : undefined} />
          </FieldContent>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.valorBruto}>
            <FieldLabel htmlFor="provento-bruto">Valor bruto (R$)</FieldLabel>
            <FieldContent>
              <Input
                id="provento-bruto"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 50.00"
                aria-invalid={!!errors.valorBruto}
                {...form.register('valorBruto', {
                  onChange: (event) => {
                    if (!irEditedByUser) applyIrSuggestion(form.getValues('tipo'), Number(event.target.value));
                  },
                })}
              />
              <FieldError errors={errors.valorBruto ? [errors.valorBruto] : undefined} />
            </FieldContent>
          </Field>
          <Field data-invalid={!!errors.irRetido}>
            <FieldLabel htmlFor="provento-ir">IR retido (R$)</FieldLabel>
            <FieldContent>
              <Input
                id="provento-ir"
                type="number"
                step="0.01"
                min="0"
                aria-invalid={!!errors.irRetido}
                {...form.register('irRetido', { onChange: () => setIrEditedByUser(true) })}
              />
              <FieldDescription>
                {isJcp ? 'Sugestão: 15% do bruto, retidos na fonte. Pode editar.' : 'Preencha só se houve IR retido na fonte.'}
              </FieldDescription>
              <FieldError errors={errors.irRetido ? [errors.irRetido] : undefined} />
            </FieldContent>
          </Field>
        </div>

        {netDescription && (
          <div className="rounded-lg border bg-muted/40 p-2.5 text-sm" aria-live="polite">
            <p className="text-muted-foreground">Valor líquido</p>
            <p className="font-medium tabular-nums">{netDescription}</p>
          </div>
        )}

        <Field data-invalid={!!errors.observacao}>
          <FieldLabel htmlFor="provento-observacao">Observação (opcional)</FieldLabel>
          <FieldContent>
            <Input
              id="provento-observacao"
              placeholder="EX: JCP 1T25"
              autoComplete="off"
              maxLength={255}
              className="uppercase"
              aria-invalid={!!errors.observacao}
              {...form.register('observacao')}
            />
            <FieldError errors={errors.observacao ? [errors.observacao] : undefined} />
          </FieldContent>
        </Field>
      </FieldGroup>
    </form>
  );
}
