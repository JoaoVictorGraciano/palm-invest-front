import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
  /** Cotação atual de PETR4 na Brapi; `null` simula a cotação indisponível. */
  petr4Quote?: number | null;
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
function stubNetwork({ create, transactions = [], stockSearch, cryptoSearch, petr4Quote = 32 }: ApiReplies = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (url.startsWith('https://brapi.dev/api/quote/list')) {
      return (stockSearch ?? (() => jsonResponse(DEFAULT_STOCKS)))();
    }
    if (url.startsWith('https://api.coingecko.com/api/v3/search')) {
      return (cryptoSearch ?? (() => jsonResponse(DEFAULT_COINS)))();
    }
    if (url.startsWith('https://brapi.dev/api/quote/PETR4')) {
      return petr4Quote === null
        ? jsonResponse({ error: true, message: 'indisponível' }, 404)
        : jsonResponse({ results: [{ symbol: 'PETR4', regularMarketPrice: petr4Quote, currency: 'BRL' }] });
    }
    if (url.startsWith('https://api.coingecko.com/api/v3/simple/price')) {
      return jsonResponse({ bitcoin: { brl: 33 } });
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

async function fillRest(user: ReturnType<typeof userEvent.setup>, price = '32.5') {
  await user.type(screen.getByLabelText('Corretora / Exchange'), 'clear');
  await user.type(screen.getByLabelText('Qtd comprada'), '10');
  await user.type(screen.getByLabelText('Preço por unidade'), price);
}

async function choosePetr4(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Ativo'), 'petr');
  await user.click(await screen.findByRole('option', { name: /PETR4/ }));
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
    expect(screen.getByLabelText('Preço por unidade')).toHaveAttribute('aria-invalid', 'true');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('ContributionForm: preço por unidade e cotação atual', () => {
  it('mostra a cotação atual do ativo escolhido junto ao campo de preço por unidade', async () => {
    stubNetwork({ petr4Quote: 44.7 });
    const { user } = renderForm();

    await choosePetr4(user);

    expect(await screen.findByText(/Cotação atual: R\$\s44,70 por unidade/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('preço mais de 50% diferente da cotação: avisa e só salva depois da confirmação', async () => {
    const fetchMock = stubNetwork({ petr4Quote: 40 });
    const { user, onSuccess } = renderForm();

    await choosePetr4(user);
    await screen.findByText(/Cotação atual/);
    await fillRest(user, '400');

    expect(screen.getByRole('status')).toHaveTextContent('900% acima da cotação atual de PETR4');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Preço bem diferente da cotação');
    expect(postCalls(fetchMock)).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Salvar mesmo assim' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(JSON.parse(String(postCalls(fetchMock)[0][1]?.body))).toMatchObject({ assetSymbol: 'PETR4', price: 400 });
  });

  it('preço quase zero perto da cotação aparece como 99% abaixo, nunca 100%', async () => {
    stubNetwork({ petr4Quote: 400000 });
    const { user } = renderForm();

    await choosePetr4(user);
    await screen.findByText(/Cotação atual/);
    await fillRest(user, '100');

    expect(screen.getByRole('status')).toHaveTextContent('99% abaixo da cotação atual de PETR4');
  });

  it('"Revisar preço" fecha a confirmação sem salvar', async () => {
    const fetchMock = stubNetwork({ petr4Quote: 40 });
    const { user, onSuccess } = renderForm();

    await choosePetr4(user);
    await screen.findByText(/Cotação atual/);
    await fillRest(user, '10');
    expect(screen.getByRole('status')).toHaveTextContent('75% abaixo da cotação atual de PETR4');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await user.click(await screen.findByRole('button', { name: 'Revisar preço' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(postCalls(fetchMock)).toHaveLength(0);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('diferença de até 50% salva direto, sem aviso', async () => {
    const fetchMock = stubNetwork({ petr4Quote: 40 });
    const { user, onSuccess } = renderForm();

    await choosePetr4(user);
    await screen.findByText(/Cotação atual/);
    await fillRest(user, '60');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(postCalls(fetchMock)).toHaveLength(1);
  });

  it('sem cotação disponível, não compara e salva direto', async () => {
    const fetchMock = stubNetwork({ petr4Quote: null });
    const { user, onSuccess } = renderForm();

    await choosePetr4(user);
    expect(await screen.findByText('Cotação atual indisponível.')).toBeInTheDocument();
    await fillRest(user, '99999');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(postCalls(fetchMock)).toHaveLength(1);
  });
});

describe('ContributionForm: total da operação em tempo real', () => {
  it('mostra a conta do total da compra e atualiza a cada mudança', async () => {
    stubNetwork();
    const { user } = renderForm();

    expect(screen.queryByText('Total da compra')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Qtd comprada'), '40');
    await user.type(screen.getByLabelText('Preço por unidade'), '15');
    expect(screen.getByText('Total da compra').parentElement).toHaveTextContent(
      '40 × R$ 15,00 + taxas R$ 0,00 = R$ 600,00',
    );

    const fee = screen.getByLabelText('Taxas e Custos (R$)');
    await user.clear(fee);
    await user.type(fee, '2.5');
    expect(screen.getByText('Total da compra').parentElement).toHaveTextContent(
      '40 × R$ 15,00 + taxas R$ 2,50 = R$ 602,50',
    );
  });

  it('na venda, as taxas são descontadas do total', async () => {
    stubNetwork();
    const { user } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Venda' }));
    await user.type(screen.getByLabelText('Qtd vendida'), '0.5');
    await user.type(screen.getByLabelText('Preço por unidade'), '1000');
    const fee = screen.getByLabelText('Taxas e Custos (R$)');
    await user.clear(fee);
    await user.type(fee, '10');

    expect(screen.getByText('Total da venda').parentElement).toHaveTextContent(
      '0,5 × R$ 1.000,00 − taxas R$ 10,00 = R$ 490,00',
    );
  });
});

describe('ContributionForm: filtro de classe', () => {
  const MIXED_FUNDS = {
    stocks: [
      { stock: 'BOVA11', name: 'ISHARES IBOVESPA', type: 'fund', subType: 'etf' },
      { stock: 'MXRF11', name: 'MAXI RENDA', type: 'fund', subType: 'fii' },
    ],
  };

  function searchUrls(fetchMock: ReturnType<typeof stubNetwork>, host: string): URL[] {
    return fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.host === host && (url.pathname.endsWith('/quote/list') || url.pathname.endsWith('/search')));
  }

  function classButton(name: string) {
    return screen.getByRole('button', { name });
  }

  it('mostra os botões de classe, com "Todos" marcado por padrão', () => {
    stubNetwork();
    renderForm();

    const names = ['Todos', 'Ações', 'FIIs', 'ETFs', 'BDRs', 'Cripto'];
    expect(names.map((name) => classButton(name).getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
    ]);
  });

  it('em "Todos", consulta a Brapi e a CoinGecko', async () => {
    const fetchMock = stubNetwork();
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Ativo'), 'petr');
    await screen.findByRole('option', { name: /PETR4/ });

    expect(searchUrls(fetchMock, 'brapi.dev')).toHaveLength(1);
    expect(searchUrls(fetchMock, 'brapi.dev')[0].searchParams.has('type')).toBe(false);
    expect(searchUrls(fetchMock, 'api.coingecko.com')).toHaveLength(1);
  });

  it('em "Cripto", consulta só a CoinGecko', async () => {
    const fetchMock = stubNetwork();
    const { user } = renderForm();

    await user.click(classButton('Cripto'));
    await user.type(screen.getByLabelText('Ativo'), 'bt');
    await screen.findByRole('option', { name: /BTC/ });

    expect(optionTickers()).toEqual(['BTC']);
    expect(searchUrls(fetchMock, 'api.coingecko.com')).toHaveLength(1);
    expect(searchUrls(fetchMock, 'brapi.dev')).toHaveLength(0);
  });

  it('em "FIIs", consulta só a Brapi (type=fund) e mostra só FIIs', async () => {
    const fetchMock = stubNetwork({ stockSearch: () => jsonResponse(MIXED_FUNDS) });
    const { user } = renderForm();

    await user.click(classButton('FIIs'));
    await user.type(screen.getByLabelText('Ativo'), '11');
    await screen.findByRole('option', { name: /MXRF11/ });

    expect(optionTickers()).toEqual(['MXRF11']);
    expect(searchUrls(fetchMock, 'brapi.dev')[0].searchParams.get('type')).toBe('fund');
    expect(searchUrls(fetchMock, 'api.coingecko.com')).toHaveLength(0);
  });

  it('o filtro também vale para as sugestões da carteira', async () => {
    stubNetwork({
      transactions: [ownedBuy('BITCOIN', 'CRYPTO')],
      stockSearch: () => jsonResponse({ stocks: [] }),
    });
    const { user } = renderForm();

    await user.click(classButton('Ações'));
    await user.type(screen.getByLabelText('Ativo'), 'bit');

    expect(await screen.findByText('Nenhum ativo encontrado para "BIT".')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('a classe salva vem do ativo escolhido, não do botão', async () => {
    const fetchMock = stubNetwork({ stockSearch: () => jsonResponse(MIXED_FUNDS) });
    const { user, onSuccess } = renderForm();

    // Escolhe o ETF com "Todos" e só depois troca o botão para "FIIs".
    await user.type(screen.getByLabelText('Ativo'), '11');
    await user.click(await screen.findByRole('option', { name: /BOVA11/ }));
    await user.click(classButton('FIIs'));
    await fillRest(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(JSON.parse(String(postCalls(fetchMock)[0][1]?.body))).toMatchObject({
      assetSymbol: 'BOVA11',
      assetClass: 'ETF',
    });
  });

  it('lembra a última classe usada ao abrir o formulário de novo', async () => {
    stubNetwork();
    const first = renderForm();
    await first.user.click(classButton('BDRs'));
    cleanup();

    renderForm();

    expect(classButton('BDRs')).toHaveAttribute('aria-pressed', 'true');
    expect(classButton('Todos')).toHaveAttribute('aria-pressed', 'false');
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
