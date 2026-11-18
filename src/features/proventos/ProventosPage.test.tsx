import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProventosPage } from '@/features/proventos/ProventosPage';
import { buy, stubProventosApi } from '@/features/proventos/test/fake-proventos-api';
import type { FakeProvento } from '@/features/proventos/test/fake-proventos-api';

function provento(overrides: Partial<FakeProvento> & Pick<FakeProvento, 'id'>): FakeProvento {
  return {
    assetSymbol: 'PETR4',
    assetClass: 'STOCK',
    tipo: 'DIVIDENDO',
    dataPagamento: '2026-03-10',
    valorBruto: 100,
    irRetido: 0,
    observacao: null,
    ...overrides,
  };
}

const PROVENTOS = [
  provento({ id: 1, tipo: 'DIVIDENDO', dataPagamento: '2026-03-10', valorBruto: 100 }),
  provento({ id: 2, tipo: 'JCP', dataPagamento: '2026-05-20', valorBruto: 200, irRetido: 30 }),
  provento({ id: 3, assetSymbol: 'HGLG11', assetClass: 'FII', tipo: 'RENDIMENTO', dataPagamento: '2026-05-15', valorBruto: 80 }),
  provento({ id: 4, tipo: 'DIVIDENDO', dataPagamento: '2025-12-01', valorBruto: 60 }),
];

const TRANSACTIONS = [buy('PETR4', 'STOCK', '2025-01-02T10:00:00'), buy('HGLG11', 'FII', '2025-06-01T10:00:00')];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProventosPage />
    </QueryClientProvider>,
  );
}

/** Texto com os espaços não separáveis do Intl trocados por espaços comuns. */
function text(element: Element | null | undefined) {
  return (element?.textContent ?? '').replace(/\s/g, ' ');
}

function monthValue(month: string) {
  const table = screen.getByRole('table', { name: /Proventos líquidos por mês/ });
  return text(within(table).getByRole('rowheader', { name: month }).nextElementSibling);
}

describe('ProventosPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 12));
  });

  it('mostra o total líquido, a média mensal, o gráfico por mês, os totais e a lista do ano atual', async () => {
    const { callsTo } = stubProventosApi({ proventos: PROVENTOS, transactions: TRANSACTIONS });

    renderPage();

    expect(await screen.findByText('Total líquido em 2026')).toBeInTheDocument();
    expect(new URL(String(callsTo('GET', '/api/proventos/resumo')[0][0])).searchParams.get('ano')).toBe('2026');

    // 100 + (200 − 30) + 80 = 350 líquidos; média de jan a nov = 350 / 11.
    expect(screen.getByText('Total líquido em 2026').parentElement).toHaveTextContent('R$ 350,00');
    expect(screen.getByText('Total líquido em 2026').parentElement).toHaveTextContent('Bruto R$ 380,00 − IR R$ 30,00');
    expect(screen.getByText('Média mensal').parentElement).toHaveTextContent('R$ 31,82');
    expect(screen.getByText('Média mensal').parentElement).toHaveTextContent('jan a nov de 2026');

    expect(monthValue('mar')).toBe('R$ 100,00');
    expect(monthValue('mai')).toBe('R$ 250,00');
    expect(monthValue('dez')).toBe('R$ 0,00');

    const byAsset = within(screen.getByRole('region', { name: 'Por ativo' })).getAllByRole('listitem');
    expect(byAsset.map(text)).toEqual([
      'PETR4AçãoR$ 270,00(77,14%)',
      'HGLG11FIIR$ 80,00(22,86%)',
    ]);
    const byType = within(screen.getByRole('region', { name: 'Por tipo' })).getAllByRole('listitem');
    expect(byType.map(text)).toEqual([
      'DividendoR$ 100,00(28,57%)',
      'JCPR$ 170,00(48,57%)',
      'RendimentoR$ 80,00(22,86%)',
      'AmortizaçãoR$ 0,00(0,00%)',
    ]);

    const rows = within(screen.getByRole('table', { name: 'Proventos de 2026' })).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      '20/05/2026',
      '15/05/2026',
      '10/03/2026',
    ]);
    expect(rows[0]).toHaveTextContent('JCP');
    expect(rows[0]).toHaveTextContent('R$ 200,00R$ 30,00R$ 170,00');
  });

  it('trocar o ano busca o resumo e a lista daquele ano; os anos vão da primeira transação até hoje', async () => {
    const { callsTo } = stubProventosApi({ proventos: PROVENTOS, transactions: TRANSACTIONS });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Total líquido em 2026');

    const select = screen.getByRole('combobox', { name: 'Ano' });
    await waitFor(() =>
      expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['2026', '2025']),
    );

    await user.selectOptions(select, '2025');

    expect(await screen.findByText('Total líquido em 2025')).toBeInTheDocument();
    expect(screen.getByText('Média mensal').parentElement).toHaveTextContent('R$ 5,00');
    expect(screen.getByText('Média mensal').parentElement).toHaveTextContent('12 meses de 2025');
    const listCalls = callsTo('GET', '/api/proventos').map(([input]) => new URL(String(input)).searchParams.get('ano'));
    expect(listCalls).toContain('2025');
    expect(screen.getByRole('table', { name: 'Proventos de 2025' })).toHaveTextContent('01/12/2025');
  });

  it('ano sem proventos mostra os cards zerados e um aviso, sem gráfico', async () => {
    stubProventosApi({ proventos: [], transactions: TRANSACTIONS });

    renderPage();

    expect(await screen.findByText('Nenhum provento registrado em 2026.')).toBeInTheDocument();
    expect(screen.getByText('Total líquido em 2026').parentElement).toHaveTextContent('R$ 0,00');
    expect(screen.queryByRole('table', { name: /Proventos líquidos por mês/ })).not.toBeInTheDocument();
  });

  it('excluir pede confirmação, chama DELETE /api/proventos/{id} e atualiza os totais', async () => {
    const { callsTo } = stubProventosApi({ proventos: PROVENTOS, transactions: TRANSACTIONS });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Total líquido em 2026');

    await user.click(screen.getByRole('button', { name: 'Excluir JCP de PETR4 em 20/05/2026' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('JCP de PETR4 pago em 20/05/2026, líquido de R$ 170,00.');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(callsTo('DELETE', '/api/proventos/2')).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByText('Total líquido em 2026').parentElement).toHaveTextContent('R$ 180,00'),
    );
    expect(screen.queryByText('20/05/2026')).not.toBeInTheDocument();
  });
});
