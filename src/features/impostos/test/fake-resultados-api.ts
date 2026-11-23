import { vi } from 'vitest';

/**
 * Imitação das rotas `/api/resultados` e `/api/transactions` da
 * palm-invest-api para os testes de impostos, com respostas no formato do README.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export const RESULTADOS_2026 = {
  ano: 2026,
  meses: [
    {
      mes: '2026-03',
      categorias: [
        {
          categoria: 'STOCK',
          totalVendas: 15000,
          lucroBruto: -800,
          prejuizoCompensado: 0,
          baseCalculo: 0,
          isento: true,
          aliquota: 0.15,
          impostoEstimado: 0,
          codigoDarf: '6015',
          vencimentoDarf: '2026-04-30',
        },
      ],
      darfs: [],
      impostoEstimado: 0,
    },
    {
      mes: '2026-04',
      categorias: [
        {
          categoria: 'STOCK',
          totalVendas: 23400,
          lucroBruto: 3000,
          prejuizoCompensado: 800,
          baseCalculo: 2200,
          isento: false,
          aliquota: 0.15,
          impostoEstimado: 330,
          codigoDarf: '6015',
          vencimentoDarf: '2026-05-29',
        },
        {
          categoria: 'CRYPTO',
          totalVendas: 40000,
          lucroBruto: '1000.00',
          prejuizoCompensado: 0,
          baseCalculo: 1000,
          isento: false,
          aliquota: 0.15,
          impostoEstimado: 150,
          codigoDarf: '4600',
          vencimentoDarf: '2026-05-29',
        },
      ],
      darfs: [
        { codigoDarf: '6015', impostoEstimado: 330, vencimento: '2026-05-29' },
        { codigoDarf: '4600', impostoEstimado: 150, vencimento: '2026-05-29' },
      ],
      impostoEstimado: 480,
    },
  ],
  totalAno: { totalVendas: 78400, lucroBruto: 3200, prejuizoCompensado: 800, baseCalculo: 3200, impostoEstimado: 480 },
  prejuizoAcumulado: { inicioDoAno: { acoesEtfBdr: 500, fii: 0 }, fimDoAno: { acoesEtfBdr: 0, fii: 120 } },
  alertas: [
    {
      tipo: 'POSSIVEL_DAY_TRADE',
      mes: '2026-04',
      assetSymbol: 'PETR4',
      data: '2026-04-10',
      mensagem: 'Compra e venda de PETR4 no mesmo dia: day trade não é calculado.',
    },
  ],
};

export function emptyResultados(ano: number) {
  return {
    ano,
    meses: Array.from({ length: 12 }, (_, index) => ({
      mes: `${ano}-${String(index + 1).padStart(2, '0')}`,
      categorias: [],
      darfs: [],
      impostoEstimado: 0,
    })),
    totalAno: { totalVendas: 0, lucroBruto: 0, prejuizoCompensado: 0, baseCalculo: 0, impostoEstimado: 0 },
    prejuizoAcumulado: { inicioDoAno: { acoesEtfBdr: 0, fii: 0 }, fimDoAno: { acoesEtfBdr: 0, fii: 0 } },
    alertas: [],
  };
}

export function limite(mes: string, acoesVendido: number, criptoVendido: number) {
  const parte = (limiteValor: number, vendido: number) => ({
    limite: limiteValor,
    vendido,
    disponivel: Math.max(0, limiteValor - vendido),
    dentroDoLimite: vendido <= limiteValor,
  });
  return { mes, acoes: parte(20000, acoesVendido), cripto: parte(35000, criptoVendido) };
}

interface FakeOptions {
  resultados?: Record<number, unknown>;
  limites?: Record<string, unknown>;
  transactions?: unknown[];
}

export function stubResultadosApi(options: FakeOptions = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.origin !== 'http://api.test') throw new Error(`Chamada fora da API: ${url}`);

    if (url.pathname === '/api/transactions') return jsonResponse(options.transactions ?? []);
    if (url.pathname === '/api/resultados') {
      const ano = Number(url.searchParams.get('ano'));
      return jsonResponse(options.resultados?.[ano] ?? emptyResultados(ano));
    }
    if (url.pathname === '/api/resultados/limite-isencao') {
      const mes = url.searchParams.get('mes') ?? '';
      return jsonResponse(options.limites?.[mes] ?? limite(mes, 0, 0));
    }
    throw new Error(`Rota inesperada no teste: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);

  function callsTo(pathname: string) {
    return fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname === pathname);
  }

  return { fetchMock, callsTo };
}
