import { vi } from 'vitest';

/**
 * Imitação da palm-invest-api para os testes de proventos: guarda proventos
 * e transações em memória e responde às rotas como o contrato do README.
 */

export interface FakeProvento {
  id: number;
  assetSymbol: string;
  assetClass: string;
  tipo: string;
  dataPagamento: string;
  valorBruto: number;
  irRetido: number;
  observacao: string | null;
}

export interface FakeTransaction {
  id: string;
  type: 'BUY' | 'SELL';
  assetSymbol: string;
  assetClass: string;
  quantity: number;
  price: number;
  transactionDate: string;
  broker: string;
  fee: number;
  observation: string;
}

export function buy(assetSymbol: string, assetClass: string, transactionDate = '2025-01-02T10:00:00', price = 10) {
  return {
    id: `t-${assetSymbol}`,
    type: 'BUY' as const,
    assetSymbol,
    assetClass,
    quantity: 10,
    price,
    transactionDate,
    broker: 'CLEAR',
    fee: 0,
    observation: '',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

const TIPOS = ['DIVIDENDO', 'JCP', 'RENDIMENTO', 'AMORTIZACAO'];

function withLiquido(provento: FakeProvento) {
  return { ...provento, valorLiquido: provento.valorBruto - provento.irRetido };
}

interface FakeApiOptions {
  proventos?: FakeProvento[];
  transactions?: FakeTransaction[];
  /** Substitui a resposta do POST/PUT de proventos (ex: um 400 ou 422). */
  saveReply?: () => Response;
  /** Cotação de cada símbolo em GET /api/quotes; os ausentes ficam sem cotação. */
  quotes?: Record<string, number>;
}

export function stubProventosApi(options: FakeApiOptions = {}) {
  const state = {
    proventos: [...(options.proventos ?? [])],
    transactions: [...(options.transactions ?? [])],
    nextId: 100,
  };

  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    if (url.origin !== 'http://api.test') throw new Error(`Chamada fora da API: ${url}`);

    if (url.pathname === '/auth/me') return jsonResponse({ id: 1, nome: 'Teste', email: 'teste@exemplo.test' });

    if (url.pathname === '/api/transactions' && method === 'GET') return jsonResponse(state.transactions);

    if (url.pathname === '/api/transactions' && method === 'DELETE') {
      const symbol = url.searchParams.get('assetSymbol');
      const excluidas = state.transactions.filter((item) => item.assetSymbol === symbol).length;
      const proventosExcluidos = state.proventos.filter((item) => item.assetSymbol === symbol).length;
      state.transactions = state.transactions.filter((item) => item.assetSymbol !== symbol);
      state.proventos = state.proventos.filter((item) => item.assetSymbol !== symbol);
      if (excluidas + proventosExcluidos === 0) return jsonResponse({ mensagem: 'Nada a excluir' }, 404);
      return jsonResponse({ assetSymbol: symbol, excluidas, proventosExcluidos });
    }

    if (url.pathname === '/api/quotes') {
      const symbols = (url.searchParams.get('symbols') ?? '').split(',');
      return jsonResponse({
        quotes: symbols.flatMap((symbol) =>
          options.quotes?.[symbol] ? [{ symbol, price: options.quotes[symbol], currency: 'BRL' }] : [],
        ),
        failures: [],
      });
    }

    if (url.pathname === '/api/proventos/resumo') {
      const ano = Number(url.searchParams.get('ano'));
      const doAno = state.proventos.filter((item) => item.dataPagamento.startsWith(`${ano}-`));
      const liquido = (item: FakeProvento) => item.valorBruto - item.irRetido;
      const sum = (items: FakeProvento[], value: (item: FakeProvento) => number) =>
        items.reduce((total, item) => total + value(item), 0);
      const symbols = [...new Set(doAno.map((item) => item.assetSymbol))];

      return jsonResponse({
        ano,
        totalBruto: sum(doAno, (item) => item.valorBruto),
        totalIrRetido: sum(doAno, (item) => item.irRetido),
        totalLiquido: sum(doAno, liquido),
        porMes: Array.from({ length: 12 }, (_, index) => ({
          mes: index + 1,
          totalLiquido: sum(
            doAno.filter((item) => Number(item.dataPagamento.slice(5, 7)) === index + 1),
            liquido,
          ),
        })),
        porAtivo: symbols
          .map((symbol) => {
            const items = doAno.filter((item) => item.assetSymbol === symbol);
            return { assetSymbol: symbol, assetClass: items[0].assetClass, totalLiquido: sum(items, liquido) };
          })
          .sort((a, b) => b.totalLiquido - a.totalLiquido),
        porTipo: TIPOS.map((tipo) => ({
          tipo,
          totalLiquido: sum(doAno.filter((item) => item.tipo === tipo), liquido),
        })),
      });
    }

    if (url.pathname === '/api/proventos' && method === 'GET') {
      const ano = url.searchParams.get('ano');
      const symbol = url.searchParams.get('assetSymbol');
      return jsonResponse(
        state.proventos
          .filter((item) => (ano ? item.dataPagamento.startsWith(`${ano}-`) : true))
          .filter((item) => (symbol ? item.assetSymbol === symbol : true))
          .sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento) || b.id - a.id)
          .map(withLiquido),
      );
    }

    if (url.pathname.startsWith('/api/proventos')) {
      const id = Number(url.pathname.split('/')[3]);

      if (method === 'DELETE') {
        state.proventos = state.proventos.filter((item) => item.id !== id);
        return jsonResponse(undefined, 204);
      }

      if (method === 'POST' || method === 'PUT') {
        if (options.saveReply) return options.saveReply();
        const body = JSON.parse(String(init?.body));
        const assetClass =
          state.transactions.find((item) => item.assetSymbol === body.assetSymbol)?.assetClass ?? 'STOCK';
        const saved: FakeProvento = {
          id: method === 'POST' ? state.nextId++ : id,
          assetClass,
          ...body,
          irRetido: body.irRetido ?? 0,
        };
        state.proventos = [...state.proventos.filter((item) => item.id !== saved.id), saved];
        return jsonResponse(withLiquido(saved), method === 'POST' ? 201 : 200);
      }
    }

    throw new Error(`Rota inesperada no teste: ${method} ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);

  function callsTo(method: string, pathname: string) {
    return fetchMock.mock.calls.filter(([input, init]) => {
      const url = new URL(String(input));
      return (init?.method ?? 'GET') === method && url.pathname === pathname;
    });
  }

  return { state, fetchMock, callsTo };
}
