import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProventosPage } from '@/features/proventos/ProventosPage';
import { buy, stubProventosApi } from '@/features/proventos/test/fake-proventos-api';
import { chooseOption, optionLabels } from '@/test/select';
import { suggestJcpIr } from '@/features/proventos/utils/proventos';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const TRANSACTIONS = [
  buy('PETR4', 'STOCK'),
  buy('HGLG11', 'FII'),
  // Vendido por inteiro: não está mais na carteira.
  buy('VALE3', 'STOCK'),
  { ...buy('VALE3', 'STOCK', '2025-02-01T10:00:00'), id: 't-VALE3-venda', type: 'SELL' as const },
];

async function openNewForm() {
  const user = userEvent.setup();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProventosPage />
    </QueryClientProvider>,
  );
  await screen.findByText('Total líquido em 2026');
  await user.click(screen.getByRole('button', { name: 'Novo provento' }));
  const dialog = await screen.findByRole('dialog', { name: 'Registrar provento' });
  // Espera as transações chegarem para o seletor de ativos.
  await waitFor(async () => expect(await optionLabels(user, field(dialog, 'Ativo'))).toContain('PETR4 · Ação'));
  return { user, dialog };
}

function field(dialog: HTMLElement, name: string | RegExp) {
  return within(dialog).getByLabelText(name) as HTMLInputElement;
}

describe('suggestJcpIr', () => {
  it('é 15% do bruto, em centavos', () => {
    expect(suggestJcpIr(50)).toBe(7.5);
    expect(suggestJcpIr(33.33)).toBe(5);
    expect(suggestJcpIr(0)).toBe(0);
  });
});

describe('ProventoForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 12));
  });

  it('oferece só os ativos que estão na carteira e começa com a data de hoje', async () => {
    stubProventosApi({ transactions: TRANSACTIONS });
    const { user, dialog } = await openNewForm();

    const options = await optionLabels(user, field(dialog, 'Ativo'));
    expect(options).toEqual(['HGLG11 · FII', 'PETR4 · Ação']);
    expect(field(dialog, 'Ativo')).toHaveTextContent('Escolha um ativo da carteira');
    // É o Select do projeto (lista estilizada pelo tema), não um <select> nativo.
    expect(field(dialog, 'Ativo').tagName).toBe('BUTTON');
    expect(field(dialog, 'Ativo')).toHaveAttribute('data-slot', 'select-trigger');
    expect(field(dialog, 'Data de pagamento').value).toBe('2026-11-18');
    expect(field(dialog, 'Data de pagamento').max).toBe('2026-11-18');
    expect(field(dialog, 'IR retido (R$)').value).toBe('0');
  });

  it('JCP sugere IR de 15% do bruto, editável, e mostra o líquido em tempo real', async () => {
    stubProventosApi({ transactions: TRANSACTIONS });
    const { user, dialog } = await openNewForm();

    await user.type(field(dialog, 'Valor bruto (R$)'), '50');
    expect(field(dialog, 'IR retido (R$)').value).toBe('0');
    expect(dialog).toHaveTextContent('R$ 50,00 − IR R$ 0,00 = R$ 50,00');

    await user.click(within(dialog).getByRole('radio', { name: 'JCP' }));
    expect(field(dialog, 'IR retido (R$)').value).toBe('7.5');
    expect(dialog).toHaveTextContent('Sugestão: 15% do bruto');
    expect(dialog).toHaveTextContent('R$ 50,00 − IR R$ 7,50 = R$ 42,50');

    // A sugestão acompanha o bruto enquanto o usuário não mexe no IR.
    await user.clear(field(dialog, 'Valor bruto (R$)'));
    await user.type(field(dialog, 'Valor bruto (R$)'), '100');
    expect(field(dialog, 'IR retido (R$)').value).toBe('15');

    // Editado à mão, o IR não é mais sobrescrito.
    await user.clear(field(dialog, 'IR retido (R$)'));
    await user.type(field(dialog, 'IR retido (R$)'), '12');
    await user.type(field(dialog, 'Valor bruto (R$)'), '0');
    expect(field(dialog, 'IR retido (R$)').value).toBe('12');
    expect(dialog).toHaveTextContent('R$ 1.000,00 − IR R$ 12,00 = R$ 988,00');

    // Outro tipo: o IR volta a 0.
    await user.click(within(dialog).getByRole('radio', { name: 'Rendimento' }));
    expect(field(dialog, 'IR retido (R$)').value).toBe('0');
  });

  it('registra pelo POST /api/proventos sem assetClass, fecha o diálogo e mostra o provento', async () => {
    const { callsTo } = stubProventosApi({ transactions: TRANSACTIONS });
    const { user, dialog } = await openNewForm();

    await chooseOption(user, field(dialog, 'Ativo'), 'PETR4 · Ação');
    await user.click(within(dialog).getByRole('radio', { name: 'JCP' }));
    await user.clear(field(dialog, 'Data de pagamento'));
    await user.type(field(dialog, 'Data de pagamento'), '2026-03-20');
    await user.type(field(dialog, 'Valor bruto (R$)'), '50');
    await user.type(field(dialog, 'Observação (opcional)'), 'jcp 1t26');
    await user.click(screen.getByRole('button', { name: 'Registrar provento' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [, init] = callsTo('POST', '/api/proventos')[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      assetSymbol: 'PETR4',
      tipo: 'JCP',
      dataPagamento: '2026-03-20',
      valorBruto: 50,
      irRetido: 7.5,
      observacao: 'JCP 1T26',
    });
    const table = await screen.findByRole('table', { name: 'Proventos de 2026' });
    expect(table).toHaveTextContent('20/03/2026');
    expect(table).toHaveTextContent('R$ 42,50');
  });

  it('valida no cliente: ativo, bruto, IR acima do bruto e data futura', async () => {
    const { callsTo } = stubProventosApi({ transactions: TRANSACTIONS });
    const { user, dialog } = await openNewForm();

    await user.clear(field(dialog, 'Data de pagamento'));
    await user.type(field(dialog, 'Data de pagamento'), '2026-12-01');
    await user.type(field(dialog, 'Valor bruto (R$)'), '10');
    await user.clear(field(dialog, 'IR retido (R$)'));
    await user.type(field(dialog, 'IR retido (R$)'), '11');
    await user.click(screen.getByRole('button', { name: 'Registrar provento' }));

    expect(await within(dialog).findByText('Escolha um ativo da sua carteira.')).toBeInTheDocument();
    expect(within(dialog).getByText('A data de pagamento não pode ser futura.')).toBeInTheDocument();
    expect(within(dialog).getByText('O IR retido não pode passar do valor bruto.')).toBeInTheDocument();
    expect(callsTo('POST', '/api/proventos')).toHaveLength(0);
  });

  it('um 400 vai para os campos e um 422 aparece com a mensagem da API', async () => {
    let reply = () => jsonResponse([{ campo: 'valorBruto', mensagem: 'deve ser maior que 0' }], 400);
    stubProventosApi({ transactions: TRANSACTIONS, saveReply: () => reply() });
    const { user, dialog } = await openNewForm();

    await chooseOption(user, field(dialog, 'Ativo'), 'HGLG11 · FII');
    await user.click(within(dialog).getByRole('radio', { name: 'Rendimento' }));
    await user.type(field(dialog, 'Valor bruto (R$)'), '80');
    await user.click(screen.getByRole('button', { name: 'Registrar provento' }));

    expect(await within(dialog).findByText('deve ser maior que 0')).toBeInTheDocument();
    expect(field(dialog, 'Valor bruto (R$)')).toHaveAttribute('aria-invalid', 'true');

    reply = () => jsonResponse({ mensagem: 'Você não tinha HGLG11 em 18/11/2026.' }, 422);
    await user.click(screen.getByRole('button', { name: 'Registrar provento' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Você não tinha HGLG11 em 18/11/2026.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('editar abre com os valores salvos (IR mantido) e salva pelo PUT /api/proventos/{id}', async () => {
    const { callsTo } = stubProventosApi({
      transactions: TRANSACTIONS,
      proventos: [
        {
          id: 9,
          assetSymbol: 'PETR4',
          assetClass: 'STOCK',
          tipo: 'JCP',
          dataPagamento: '2026-04-10',
          valorBruto: 100,
          irRetido: 10,
          observacao: null,
        },
      ],
    });
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ProventosPage />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Editar JCP de PETR4 em 10/04/2026' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar provento' });
    expect(field(dialog, 'Ativo')).toHaveTextContent('PETR4 · Ação');
    expect(field(dialog, 'IR retido (R$)').value).toBe('10');

    // Mudar o bruto não troca um IR que já estava salvo.
    await user.clear(field(dialog, 'Valor bruto (R$)'));
    await user.type(field(dialog, 'Valor bruto (R$)'), '120');
    expect(field(dialog, 'IR retido (R$)').value).toBe('10');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(callsTo('PUT', '/api/proventos/9')).toHaveLength(1));
    expect(JSON.parse(String(callsTo('PUT', '/api/proventos/9')[0][1]?.body))).toMatchObject({
      valorBruto: 120,
      irRetido: 10,
    });
    await waitFor(() => expect(screen.getByRole('table', { name: 'Proventos de 2026' })).toHaveTextContent('R$ 110,00'));
  });
});
