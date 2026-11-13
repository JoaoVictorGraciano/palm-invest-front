import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContributionForm } from '@/features/portfolio/components/ContributionForm';

const FORM_ID = 'form-de-teste';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

interface ApiReplies {
  /** Resposta do POST /api/transactions. */
  create?: () => Response;
  /** Transações já existentes (GET /api/transactions). */
  transactions?: unknown[];
  /** Resposta da busca de ações (Brapi). */
  stockSearch?: () => Response;
  /** Resposta da busca de criptomoedas (CoinGecko). */
  cryptoSearch?: () => Response;
}

const DEFAULT_STOCKS = { stocks: [{ stock: 'PETR4', name: 'PETROBRAS PN' }] };
const DEFAULT_COINS = { coins: [{ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', market_cap_rank: 1 }] };

/** Compra já registrada na carteira, no formato da API. */
function ownedBuy(assetSymbol: string, assetClass: 'STOCK' | 'CRYPTO') {
  return {
    id: assetSymbol,
    type: 'BUY',
    assetSymbol,
    assetClass,
    quantity: 1,
    price: 10,
    transactionDate: '2025-01-01T10:00:00',
    broker: 'CLEAR',
    fee: 0,
    observation: '',
  };
}

/** Ticker de cada sugestão visível, na ordem da lista (é o primeiro elemento de cada linha). */
function optionTickers(): string[] {
  return screen.getAllByRole('option').map((option) => option.firstElementChild?.textContent ?? '');
}

/** Texto de cada sugestão visível, na ordem da lista. */
function optionTexts(): string[] {
  return screen.getAllByRole('option').map((option) => option.textContent ?? '');
}

/** Simula a palm-invest-api e os provedores de busca; nenhuma chamada real sai dos testes. */
function stubNetwork({ create, transactions = [], stockSearch, cryptoSearch }: ApiReplies = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (url.startsWith('https://brapi.dev/api/quote/list')) {
      return (stockSearch ?? (() => jsonResponse(DEFAULT_STOCKS)))();
    }
    if (url.startsWith('https://api.coingecko.com/api/v3/search')) {
      return (cryptoSearch ?? (() => jsonResponse(DEFAULT_COINS)))();
    }
    if (url === 'http://api.test/api/transactions' && init?.method === 'POST') {
      return (create ?? (() => jsonResponse({ id: 1, ...JSON.parse(String(init.body)) }, 201)))();
    }
    if (url === 'http://api.test/api/transactions') return jsonResponse(transactions);

    throw new Error(`URL inesperada no teste: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function postCalls(fetchMock: ReturnType<typeof stubNetwork>) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
}

function renderForm() {
  const onSuccess = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <ContributionForm formId={FORM_ID} onSuccess={onSuccess} />
      <button type="submit" form={FORM_ID}>
        Salvar
      </button>
    </QueryClientProvider>,
  );

  return { onSuccess, user: userEvent.setup() };
}

async function fillRest(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Corretora / Exchange'), 'clear');
  await user.type(screen.getByLabelText('Qtd comprada'), '10');
  await user.type(screen.getByLabelText('Preço (compra)'), '32.5');
}

describe('ContributionForm: erros da API nos campos', () => {
  async function submitPetr4(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Ativo'), 'petr');
    await user.click(await screen.findByRole('option', { name: /PETR4/ }));
    await fillRest(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
  }

  it('mostra o 422 de saldo no campo de quantidade e mantém o formulário aberto', async () => {
    const mensagem = 'Saldo insuficiente de PETR4 na data da operação.';
    stubNetwork({ create: () => jsonResponse({ mensagem }, 422) });
    const { user, onSuccess } = renderForm();

    await submitPetr4(user);

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    expect(screen.getByLabelText('Qtd comprada')).toHaveAttribute('aria-invalid', 'true');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('mostra cada erro de validação do 400 no campo correspondente', async () => {
    stubNetwork({
      create: () =>
        jsonResponse(
          [
            { campo: 'price', mensagem: 'Preço com casas demais.' },
            { campo: 'transactionDate', mensagem: 'A data não pode ser futura.' },
          ],
          400,
        ),
    });
    const { user, onSuccess } = renderForm();

    await submitPetr4(user);

    expect(await screen.findByText('Preço com casas demais.')).toBeInTheDocument();
    expect(screen.getByText('A data não pode ser futura.')).toBeInTheDocument();
    expect(screen.getByLabelText('Preço (compra)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('ContributionForm: ordem das sugestões', () => {
  it('o BTC da busca fica acima de um símbolo antigo "BITCOIN" da carteira, que leva a etiqueta', async () => {
    stubNetwork({
      transactions: [ownedBuy('BITCOIN', 'CRYPTO')],
      stockSearch: () => jsonResponse({ stocks: [{ stock: 'MOTV3', name: 'MOTIVA INFRAESTRUTURA DE MOBILIDADE' }] }),
    });
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'bi');
    await screen.findByRole('option', { name: /BTC/ });

    const texts = optionTexts();
    expect(optionTickers()).toEqual(['BTC', 'MOTV3', 'BITCOIN']);
    expect(texts[0]).not.toContain('Na sua carteira');
    expect(texts[2]).toContain('Na sua carteira');
  });

  it('com a busca de cripto fora do ar, o ativo da carteira concorre pela ordem normal', async () => {
    stubNetwork({
      transactions: [ownedBuy('BITCOIN', 'CRYPTO')],
      stockSearch: () => jsonResponse({ stocks: [{ stock: 'MOTV3', name: 'MOTIVA INFRAESTRUTURA DE MOBILIDADE' }] }),
      cryptoSearch: () => jsonResponse({ error: 'fora do ar' }, 503),
    });
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'bi');
    await screen.findByRole('option', { name: /MOTV3/ });

    // "BITCOIN" começa com o texto digitado; "MOTV3" não.
    const texts = optionTexts();
    expect(texts[0]).toMatch(/^BITCOIN/);
    expect(texts[0]).toContain('Na sua carteira');
    expect(texts[1]).toMatch(/^MOTV3/);
    expect(screen.getByText('A busca de criptomoedas está indisponível no momento.')).toBeInTheDocument();
  });

  it('um ativo da carteira que a busca também devolve aparece uma vez só, com a etiqueta', async () => {
    stubNetwork({ transactions: [ownedBuy('PETR4', 'STOCK')], cryptoSearch: () => jsonResponse({ coins: [] }) });
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'petr');
    await screen.findByText('PETROBRAS PN');

    const texts = optionTexts();
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain('PETROBRAS PN');
    expect(texts[0]).toContain('Na sua carteira');
  });
});

describe('ContributionForm: ticker validado pela busca', () => {
  it('não salva um ticker digitado à mão, sem escolher uma sugestão', async () => {
    const fetchMock = stubNetwork();
    const { user, onSuccess } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'xxxx9');
    await fillRest(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Escolha um ativo na lista de sugestões.')).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('salva a ação escolhida na busca com assetClass STOCK', async () => {
    const fetchMock = stubNetwork();
    const { user, onSuccess } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'petr');
    await user.click(await screen.findByRole('option', { name: /PETR4/ }));
    await fillRest(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [, init] = postCalls(fetchMock)[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      type: 'BUY',
      assetSymbol: 'PETR4',
      assetClass: 'STOCK',
      quantity: 10,
      price: 32.5,
      broker: 'CLEAR',
    });
  });

  it('a classe vem da escolha: uma cripto da busca é salva como CRYPTO', async () => {
    const fetchMock = stubNetwork();
    const { user, onSuccess } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'bt');
    await user.click(await screen.findByRole('option', { name: /BTC/ }));
    await fillRest(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const [, init] = postCalls(fetchMock)[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({ assetSymbol: 'BTC', assetClass: 'CRYPTO' });
  });

  it('ao sair do campo, a lista é escondida sem ser removida e o foco vai para o campo clicado', async () => {
    stubNetwork();
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'petr');
    await screen.findByRole('option', { name: /PETR4/ });
    const broker = screen.getByLabelText('Corretora / Exchange');
    await user.click(broker);

    expect(broker).toHaveFocus();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    // Continua no DOM (só escondida): removê-la na troca de foco fazia o diálogo roubar o foco.
    expect(screen.getByRole('listbox', { hidden: true })).toBeInTheDocument();
  });

  it('digitar depois de escolher desfaz a escolha', async () => {
    const fetchMock = stubNetwork();
    const { user } = renderForm();

    const input = screen.getByLabelText('Ativo');
    await user.type(input, 'petr');
    await user.click(await screen.findByRole('option', { name: /PETR4/ }));
    await user.type(input, '9');
    await fillRest(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Escolha um ativo na lista de sugestões.')).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });
});
