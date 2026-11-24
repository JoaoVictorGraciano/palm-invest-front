import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/features/home/HomePage';
import { describeAssetDeletion } from '@/features/portfolio/hooks/useDeleteAsset';
import { PortfolioPage } from '@/features/portfolio/PortfolioPage';
import { sumNetByTicker } from '@/features/proventos/hooks/useProventosByTicker';
import { buy, stubProventosApi } from '@/features/proventos/test/fake-proventos-api';
import type { FakeProvento } from '@/features/proventos/test/fake-proventos-api';
import type { Asset } from '@/types';
import { calculateTotalResult, calculateTotalReturn, sumByTicker, sumIncomeOfAssets } from '@/utils';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

function provento(id: number, assetSymbol: string, tipo: string, dataPagamento: string, valorBruto: number, irRetido = 0): FakeProvento {
  return {
    id,
    assetSymbol,
    assetClass: assetSymbol === 'HGLG11' ? 'FII' : 'STOCK',
    tipo,
    dataPagamento,
    valorBruto,
    irRetido,
    observacao: null,
  };
}

// PETR4: 10 a R$ 10, cotada a R$ 12. HGLG11: 10 a R$ 10, cotada a R$ 9.
// VALE3: 10 a R$ 10, vendida por inteiro a R$ 12 (lucro realizado de R$ 20).
const TRANSACTIONS = [
  buy('PETR4', 'STOCK'),
  buy('HGLG11', 'FII'),
  buy('VALE3', 'STOCK'),
  {
    ...buy('VALE3', 'STOCK', '2025-02-01T10:00:00', 12),
    id: 't-VALE3-venda',
    type: 'SELL' as const,
    lucroRealizado: 20,
  },
];

const PROVENTOS = [
  provento(1, 'PETR4', 'DIVIDENDO', '2025-06-10', 5),
  provento(2, 'PETR4', 'JCP', '2026-03-20', 10, 1.5),
  provento(3, 'HGLG11', 'RENDIMENTO', '2026-05-15', 8),
  provento(4, 'VALE3', 'DIVIDENDO', '2025-01-20', 3),
];

const QUOTES = { PETR4: 12, HGLG11: 9 };

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Texto com os espaços não separáveis do Intl trocados por espaços comuns. */
function text(element: Element | null | undefined) {
  return (element?.textContent ?? '').replace(/\s/g, ' ');
}

/** Texto do card (da Carteira ou do Dashboard) que tem este título. */
function card(label: string) {
  // O primeiro é o título do card; no Dashboard o mesmo rótulo também aparece no detalhamento do resultado total.
  const [title] = screen.getAllByText(label, { selector: 'dt, [data-slot=card-title]' });
  return text(title.closest('[data-slot=card]') ?? title.parentElement);
}

describe('calculateTotalReturn, calculateTotalResult e sumIncomeOfAssets', () => {
  it('o resultado total soma realizado, em aberto e proventos', () => {
    expect(calculateTotalResult(20, 10, 24.5)).toEqual({ realized: 20, open: 10, income: 24.5, total: 54.5 });
    expect(sumByTicker(new Map([['A', 1.5], ['B', -0.5]]))).toBe(1);
  });


  it('separa valorização e proventos, com os percentuais sobre o investido', () => {
    expect(calculateTotalReturn(200, 10, 21.5)).toEqual({
      appreciation: 10,
      appreciationPercentage: 5,
      income: 21.5,
      incomePercentage: 10.75,
      total: 31.5,
      totalPercentage: 15.75,
    });
    expect(calculateTotalReturn(0, 0, 5).totalPercentage).toBe(0);
  });

  it('soma só os proventos dos ativos que estão na carteira', () => {
    const income = sumNetByTicker([
      { id: '1', ticker: 'PETR4', assetClass: 'STOCK', tipo: 'JCP', dataPagamento: '2026-01-01', valorBruto: 10, irRetido: 1.5, valorLiquido: 8.5, observacao: '' },
      { id: '2', ticker: 'PETR4', assetClass: 'STOCK', tipo: 'DIVIDENDO', dataPagamento: '2025-01-01', valorBruto: 5, irRetido: 0, valorLiquido: 5, observacao: '' },
      { id: '3', ticker: 'VALE3', assetClass: 'STOCK', tipo: 'DIVIDENDO', dataPagamento: '2025-01-01', valorBruto: 3, irRetido: 0, valorLiquido: 3, observacao: '' },
    ]);
    expect(income.get('PETR4')).toBe(13.5);
    expect(sumIncomeOfAssets([{ ticker: 'PETR4' } as Asset], income)).toBe(13.5);
  });
});

describe('Carteira: resultado total', () => {
  it('separa lucro em aberto, lucro realizado e proventos por ativo e nos totais', async () => {
    const { callsTo } = stubProventosApi({ transactions: TRANSACTIONS, proventos: PROVENTOS, quotes: QUOTES });

    renderWithProviders(<PortfolioPage />);

    const table = await screen.findByRole('table');
    // A carteira busca os proventos de todos os anos (sem ?ano=).
    expect(callsTo('GET', '/api/proventos').some(([input]) => new URL(String(input)).search === '')).toBe(true);

    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(
      expect.arrayContaining(['Lucro em aberto', 'Lucro realizado', 'Proventos', 'Resultado total']),
    );
    const column = (name: string) => headers.indexOf(name);

    const rowOf = async (ticker: string) =>
      within(table)
        .getAllByRole('row')
        .find((row) => within(row).queryAllByText(ticker).length > 0)!;

    const petr4 = within(await rowOf('PETR4')).getAllByRole('cell');
    expect(text(petr4[column('Lucro em aberto')])).toBe('R$ 20,00(+20,00%)');
    expect(text(petr4[column('Lucro realizado')])).toBe('R$ 0,00');
    expect(text(petr4[column('Proventos')])).toBe('R$ 13,50');
    expect(text(petr4[column('Resultado total')])).toBe('R$ 33,50');

    const hglg = within(await rowOf('HGLG11')).getAllByRole('cell');
    expect(text(hglg[column('Lucro em aberto')])).toBe('-R$ 10,00(-10,00%)');
    expect(text(hglg[column('Proventos')])).toBe('R$ 8,00');
    expect(text(hglg[column('Resultado total')])).toBe('-R$ 2,00');

    // Os totais incluem VALE3, já vendida: lucro realizado de R$ 20 e provento de R$ 3.
    await waitFor(() => expect(card('Proventos')).toContain('R$ 24,50'));
    expect(card('Lucro em aberto')).toBe('Lucro em abertoR$ 10,00+5,00% · valorização do que você tem');
    expect(card('Lucro realizado')).toBe('Lucro realizadoR$ 20,00Nas vendas já feitas');
    expect(card('Proventos')).toBe('ProventosR$ 24,50Líquidos recebidos');
    expect(card('Resultado total')).toBe('Resultado totalR$ 54,50Realizado + em aberto + proventos');
  });

  it('se os proventos não carregarem, mostra "—" em vez de zero, também no resultado total', async () => {
    const { fetchMock } = stubProventosApi({ transactions: TRANSACTIONS, quotes: QUOTES });
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) =>
      new URL(String(input)).pathname === '/api/proventos'
        ? new Response(JSON.stringify({ mensagem: 'Erro interno no servidor' }), { status: 500 })
        : original(input, init),
    );

    renderWithProviders(<PortfolioPage />);

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);
    const petr4 = within(within(table).getAllByRole('row')[1]).getAllByRole('cell');
    await waitFor(() => expect(petr4[headers.indexOf('Proventos')]).toHaveTextContent('—'));
    expect(petr4[headers.indexOf('Resultado total')]).toHaveTextContent('—');
    expect(card('Proventos')).toContain('—');
    expect(card('Resultado total')).toContain('—');
  });
});

describe('Dashboard: proventos e resultado total', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 12));
  });

  it('mostra os proventos do ano, a rentabilidade com proventos e o resultado total em três partes', async () => {
    const { callsTo } = stubProventosApi({ transactions: TRANSACTIONS, proventos: PROVENTOS, quotes: QUOTES });

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Proventos no ano')).toBeInTheDocument();
    expect(new URL(String(callsTo('GET', '/api/proventos/resumo')[0][0])).searchParams.get('ano')).toBe('2026');
    // 2026: JCP de PETR4 (10 − 1,50) + rendimento de HGLG11 (8).
    await screen.findByText('R$ 16,50');
    expect(card('Proventos no ano')).toBe('Proventos no anoR$ 16,50Líquido recebido em 2026');
    expect(card('Lucro em aberto')).toBe('Lucro em abertoR$ 10,00+5,00% sobre o investido');
    // Rentabilidade sobre o investido: só as posições atuais e os proventos delas (21,50).
    expect(card('Rentabilidade com proventos')).toBe(
      'Rentabilidade com proventos+15,75%Em aberto +5,00% + proventos 10,75%',
    );

    const result = screen.getByRole('region', { name: 'Resultado total' });
    await waitFor(() => expect(text(result)).toContain('R$ 54,50'));
    expect(text(result)).toBe(
      'Resultado totalR$ 54,50Lucro realizadoR$ 20,00Lucro em abertoR$ 10,00ProventosR$ 24,50',
    );
  });
});

describe('Excluir ativo com proventos', () => {
  it('describeAssetDeletion conta os proventos apagados junto', () => {
    expect(describeAssetDeletion({ ticker: 'PETR4', deleted: 3, deletedProventos: 2 })).toBe(
      'PETR4 removido, junto com 2 proventos.',
    );
    expect(describeAssetDeletion({ ticker: 'PETR4', deleted: 3, deletedProventos: 1 })).toBe(
      'PETR4 removido, junto com 1 provento.',
    );
    expect(describeAssetDeletion({ ticker: 'PETR4', deleted: 3, deletedProventos: 0 })).toBe(
      'PETR4 foi removido da carteira.',
    );
  });

  it('o aviso diz que os proventos também serão apagados e o toast conta quantos foram', async () => {
    const { callsTo } = stubProventosApi({ transactions: TRANSACTIONS, proventos: PROVENTOS, quotes: QUOTES });
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    await user.click(await screen.findByRole('button', { name: 'Remover PETR4 da carteira' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(
      'Isso apaga permanentemente todo o histórico de transações de PETR4 e também todos os proventos registrados dele.',
    );

    const proventosCallsBefore = callsTo('GET', '/api/proventos').length;
    await user.click(within(dialog).getByRole('button', { name: 'Remover' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Ativo removido', {
        description: 'PETR4 removido, junto com 2 proventos.',
      }),
    );
    expect(callsTo('DELETE', '/api/transactions')).toHaveLength(1);
    // Os proventos são recarregados: a coluna e os totais não mostram mais os de PETR4.
    await waitFor(() => expect(callsTo('GET', '/api/proventos').length).toBeGreaterThan(proventosCallsBefore));
    await waitFor(() => expect(screen.queryByText('PETR4')).not.toBeInTheDocument());
    // Sobram HGLG11 (R$ 8) e VALE3, já vendida (R$ 3).
    expect(card('Proventos')).toContain('R$ 11,00');
  });
});
