import type { AssetClass } from '@/types';

/** Resultado de uma categoria (classe de ativo) num mês (`GET /api/resultados?ano=`). */
export interface ResultadoCategoria {
  categoria: AssetClass;
  /** Quantidade × preço das vendas, sem descontar taxas. */
  totalVendas: number;
  /** Lucro (ou prejuízo, se negativo) das vendas do mês. */
  lucroBruto: number;
  /** Prejuízo (do mês ou acumulado) que abateu o lucro. */
  prejuizoCompensado: number;
  baseCalculo: number;
  isento: boolean;
  /** Ex: 0.15 para 15%. */
  aliquota: number;
  impostoEstimado: number;
  codigoDarf: string;
  /** `AAAA-MM-DD`. */
  vencimentoDarf: string;
}

export interface Darf {
  codigoDarf: string;
  impostoEstimado: number;
  /** `AAAA-MM-DD`. */
  vencimento: string;
}

export interface ResultadoMes {
  /** `AAAA-MM`. */
  mes: string;
  /** Só as categorias com vendas no mês. */
  categorias: ResultadoCategoria[];
  /** Só os códigos com imposto. */
  darfs: Darf[];
  impostoEstimado: number;
}

export interface PrejuizoPorGrupo {
  /** Ações, ETFs e BDRs compensam entre si. */
  acoesEtfBdr: number;
  fii: number;
}

export interface Alerta {
  /** Ex: `POSSIVEL_DAY_TRADE`, `DARF_ABAIXO_DO_MINIMO`. */
  tipo: string;
  /** `AAAA-MM`. */
  mes: string;
  ticker: string | null;
  /** `AAAA-MM-DD`. */
  data: string | null;
  mensagem: string;
}

export interface ResultadosAno {
  ano: number;
  /** Sempre os 12 meses. */
  meses: ResultadoMes[];
  totalAno: {
    totalVendas: number;
    lucroBruto: number;
    prejuizoCompensado: number;
    baseCalculo: number;
    impostoEstimado: number;
  };
  prejuizoAcumulado: { inicioDoAno: PrejuizoPorGrupo; fimDoAno: PrejuizoPorGrupo };
  alertas: Alerta[];
}

export interface LimiteCategoria {
  limite: number;
  vendido: number;
  /** Nunca negativo. */
  disponivel: number;
  dentroDoLimite: boolean;
}

/** Quanto já foi vendido no mês em ações e cripto (`GET /api/resultados/limite-isencao?mes=`). */
export interface LimiteIsencao {
  /** `AAAA-MM`. */
  mes: string;
  /** Só vendas de ações (`STOCK`); ETF, BDR e FII não entram. */
  acoes: LimiteCategoria;
  /** Todas as criptomoedas somadas. */
  cripto: LimiteCategoria;
}
