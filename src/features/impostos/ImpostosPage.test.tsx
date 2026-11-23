import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImpostosPage } from '@/features/impostos/ImpostosPage';
import { RESULTADOS_2026, limite, stubResultadosApi } from '@/features/impostos/test/fake-resultados-api';
import { chooseOption } from '@/test/select';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ImpostosPage />
    </QueryClientProvider>,
  );
}

/** Texto com os espaços não separáveis do Intl trocados por espaços comuns. */
function text(element: Element | null | undefined) {
  return (element?.textContent ?? '').replace(/\s/g, ' ');
}

const TRANSACTIONS = [
  {
    id: '1',
    type: 'BUY',
    assetSymbol: 'PETR4',
    assetClass: 'STOCK',
    quantity: 10,
    price: 30,
    transactionDate: '2025-05-10T10:00:00',
    broker: 'CLEAR',
    fee: 0,
    observation: '',
  },
];

describe('ImpostosPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 23, 12));
  });

  it('mostra o aviso fixo de estimativa no topo', async () => {
    stubResultadosApi();
    renderPage();

    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Estimativa para organização. Confirme com um contador antes de pagar ou declarar.');
    expect(note).toHaveClass('sticky');
    await screen.findByText('Nenhuma venda registrada em 2026.');
  });

  it('mostra as vendas do mês atual de ações e cripto contra os limites de isenção', async () => {
    const { callsTo } = stubResultadosApi({ limites: { '2026-11': limite('2026-11', 23400, 5000) } });
    renderPage();

    const section = await screen.findByRole('region', { name: 'Limite de isenção do mês' });
    expect(callsTo('/api/resultados/limite-isencao')[0].searchParams.get('mes')).toBe('2026-11');
    expect(section).toHaveTextContent('Limite de isenção em novembro de 2026');

    const acoes = await within(section).findByRole('progressbar', { name: 'Vendas de ações no mês' });
    expect(acoes.getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('R$ 23.400,00 de R$ 20.000,00');
    const cripto = within(section).getByRole('progressbar', { name: 'Vendas de cripto no mês' });
    expect(cripto.getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('R$ 5.000,00 de R$ 35.000,00');

    expect(text(section)).toContain('R$ 23.400,00 de R$ 20 mil');
    expect(text(section)).toContain('Acima do limite: o lucro do mês nesta categoria fica tributável.');
    expect(text(section)).toContain('R$ 5.000,00 de R$ 35 mil');
    expect(text(section)).toContain('Ainda cabem R$ 30.000,00 na isenção.');
  });

  it('mostra, por mês, cada categoria com total vendido, lucro, isenção, imposto, DARF e vencimento', async () => {
    stubResultadosApi({ resultados: { 2026: RESULTADOS_2026 } });
    renderPage();

    const abril = await screen.findByRole('region', { name: 'abril de 2026' });
    expect(within(abril).getByRole('heading', { level: 3 })).toHaveTextContent(/^Abril de 2026$/);
    const rows = within(abril).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map(text));
    expect(rows).toEqual([
      ['Ações', 'R$ 23.400,00', 'R$ 3.000,00', 'R$ 800,00', 'Tributável (15%)', 'R$ 330,00', '6015', '29/05/2026'],
      ['Cripto', 'R$ 40.000,00', 'R$ 1.000,00', 'R$ 0,00', 'Tributável (15%)', 'R$ 150,00', '4600', '29/05/2026'],
    ]);
    expect(text(abril)).toContain('Imposto estimado: R$ 480,00');
    expect(text(abril)).toContain('DARF 6015: R$ 330,00, vence em 29/05/2026');
    expect(text(abril)).toContain('DARF 4600: R$ 150,00, vence em 29/05/2026');

    // Mês isento com prejuízo: sem DARF nem vencimento.
    const marco = screen.getByRole('region', { name: 'março de 2026' });
    const [marcoRow] = within(marco).getAllByRole('row').slice(1);
    expect(within(marcoRow).getAllByRole('cell').map(text)).toEqual([
      'Ações',
      'R$ 15.000,00',
      '-R$ 800,00',
      'R$ 0,00',
      'Isento',
      'R$ 0,00',
      '—',
      '—',
    ]);

    // Meses sem vendas não aparecem.
    expect(screen.queryByRole('region', { name: 'janeiro de 2026' })).not.toBeInTheDocument();
  });

  it('mostra o prejuízo acumulado por grupo, os totais do ano e os alertas', async () => {
    stubResultadosApi({ resultados: { 2026: RESULTADOS_2026 } });
    renderPage();

    const prejuizo = await screen.findByRole('region', { name: 'Prejuízo acumulado' });
    const rows = within(prejuizo).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map(text));
    expect(rows).toEqual([
      ['Ações, ETFs e BDRs', 'R$ 500,00', 'R$ 0,00'],
      ['FIIs', 'R$ 0,00', 'R$ 120,00'],
    ]);

    expect(text(screen.getByText('Imposto estimado', { selector: 'dt' }).parentElement)).toBe(
      'Imposto estimadoR$ 480,00',
    );

    const alertas = screen.getByRole('region', { name: 'Alertas' });
    expect(text(alertas)).toContain('Possível day trade · PETR4 · 10/04/2026');
    expect(text(alertas)).toContain('Compra e venda de PETR4 no mesmo dia');
  });

  it('trocar o ano busca os resultados daquele ano', async () => {
    const { callsTo } = stubResultadosApi({ resultados: { 2026: RESULTADOS_2026 }, transactions: TRANSACTIONS });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'abril de 2026' });

    await chooseOption(user, screen.getByRole('combobox', { name: 'Ano' }), '2025');

    expect(await screen.findByText('Nenhuma venda registrada em 2025.')).toBeInTheDocument();
    expect(callsTo('/api/resultados').map((url) => url.searchParams.get('ano'))).toContain('2025');
  });
});
