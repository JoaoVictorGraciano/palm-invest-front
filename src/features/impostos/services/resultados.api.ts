import { httpClient } from '@/services';
import { ASSET_CLASS } from '@/types';
import type { AssetClass } from '@/types';
import type {
  Alerta,
  LimiteCategoria,
  LimiteIsencao,
  PrejuizoPorGrupo,
  ResultadoCategoria,
  ResultadoMes,
  ResultadosAno,
} from '@/features/impostos/types';

/**
 * Resultados e estimativa de imposto de renda pela palm-invest-api
 * (`/api/resultados`). Tudo é calculado pela API a partir das transações;
 * aqui só se converte o formato.
 */

const RESULTADOS_PATH = '/api/resultados';

type Decimal = number | string | null | undefined;

function toNumber(value: Decimal): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

const KNOWN_CLASSES = new Set<string>(Object.values(ASSET_CLASS));

interface CategoriaDto {
  categoria?: string;
  totalVendas?: Decimal;
  lucroBruto?: Decimal;
  prejuizoCompensado?: Decimal;
  baseCalculo?: Decimal;
  isento?: boolean;
  aliquota?: Decimal;
  impostoEstimado?: Decimal;
  codigoDarf?: string | null;
  vencimentoDarf?: string | null;
}

interface ResultadosDto {
  ano?: number;
  meses?: Array<{
    mes?: string;
    categorias?: CategoriaDto[];
    darfs?: Array<{ codigoDarf?: string | null; impostoEstimado?: Decimal; vencimento?: string | null }>;
    impostoEstimado?: Decimal;
  }>;
  totalAno?: Partial<Record<keyof ResultadosAno['totalAno'], Decimal>>;
  prejuizoAcumulado?: {
    inicioDoAno?: { acoesEtfBdr?: Decimal; fii?: Decimal };
    fimDoAno?: { acoesEtfBdr?: Decimal; fii?: Decimal };
  };
  alertas?: Array<{
    tipo?: string;
    mes?: string;
    assetSymbol?: string | null;
    data?: string | null;
    mensagem?: string | null;
  }>;
}

interface LimiteDto {
  mes?: string;
  acoes?: Partial<Record<keyof LimiteCategoria, Decimal | boolean>>;
  cripto?: Partial<Record<keyof LimiteCategoria, Decimal | boolean>>;
}

function toCategoria(dto: CategoriaDto): ResultadoCategoria[] {
  if (!KNOWN_CLASSES.has(dto.categoria ?? '')) return [];
  return [
    {
      categoria: dto.categoria as AssetClass,
      totalVendas: toNumber(dto.totalVendas),
      lucroBruto: toNumber(dto.lucroBruto),
      prejuizoCompensado: toNumber(dto.prejuizoCompensado),
      baseCalculo: toNumber(dto.baseCalculo),
      isento: dto.isento === true,
      aliquota: toNumber(dto.aliquota),
      impostoEstimado: toNumber(dto.impostoEstimado),
      codigoDarf: dto.codigoDarf ?? '',
      vencimentoDarf: dto.vencimentoDarf ?? '',
    },
  ];
}

function toPrejuizo(dto: { acoesEtfBdr?: Decimal; fii?: Decimal } | undefined): PrejuizoPorGrupo {
  return { acoesEtfBdr: toNumber(dto?.acoesEtfBdr), fii: toNumber(dto?.fii) };
}

/** `AAAA-MM` de cada mês do ano, de janeiro a dezembro. */
function monthsOf(ano: number): string[] {
  return Array.from({ length: 12 }, (_, index) => `${ano}-${String(index + 1).padStart(2, '0')}`);
}

export function toResultados(dto: ResultadosDto | undefined, ano: number): ResultadosAno {
  const mesesDto = dto?.meses ?? [];
  const meses: ResultadoMes[] = monthsOf(ano).map((mes) => {
    const item = mesesDto.find((candidate) => candidate.mes === mes);
    return {
      mes,
      categorias: (item?.categorias ?? []).flatMap(toCategoria),
      darfs: (item?.darfs ?? []).map((darf) => ({
        codigoDarf: darf.codigoDarf ?? '',
        impostoEstimado: toNumber(darf.impostoEstimado),
        vencimento: darf.vencimento ?? '',
      })),
      impostoEstimado: toNumber(item?.impostoEstimado),
    };
  });

  const total = dto?.totalAno ?? {};
  const alertas: Alerta[] = (dto?.alertas ?? []).map((alerta) => ({
    tipo: alerta.tipo ?? '',
    mes: alerta.mes ?? '',
    ticker: alerta.assetSymbol ?? null,
    data: alerta.data ?? null,
    mensagem: alerta.mensagem?.trim() ?? '',
  }));

  return {
    ano: dto?.ano ?? ano,
    meses,
    totalAno: {
      totalVendas: toNumber(total.totalVendas),
      lucroBruto: toNumber(total.lucroBruto),
      prejuizoCompensado: toNumber(total.prejuizoCompensado),
      baseCalculo: toNumber(total.baseCalculo),
      impostoEstimado: toNumber(total.impostoEstimado),
    },
    prejuizoAcumulado: {
      inicioDoAno: toPrejuizo(dto?.prejuizoAcumulado?.inicioDoAno),
      fimDoAno: toPrejuizo(dto?.prejuizoAcumulado?.fimDoAno),
    },
    alertas,
  };
}

function toLimiteCategoria(dto: LimiteDto['acoes'], limitePadrao: number): LimiteCategoria {
  const limite = dto?.limite == null ? limitePadrao : toNumber(dto.limite as Decimal);
  const vendido = toNumber(dto?.vendido as Decimal);
  return {
    limite,
    vendido,
    disponivel: dto?.disponivel == null ? Math.max(0, limite - vendido) : toNumber(dto.disponivel as Decimal),
    dentroDoLimite: typeof dto?.dentroDoLimite === 'boolean' ? dto.dentroDoLimite : vendido <= limite,
  };
}

/** Limites de isenção mensal (padrão, se a API não informar): ações R$ 20 mil, cripto R$ 35 mil. */
export const LIMITE_ACOES = 20_000;
export const LIMITE_CRIPTO = 35_000;

export function toLimiteIsencao(dto: LimiteDto | undefined, mes: string): LimiteIsencao {
  return {
    mes: dto?.mes ?? mes,
    acoes: toLimiteCategoria(dto?.acoes, LIMITE_ACOES),
    cripto: toLimiteCategoria(dto?.cripto, LIMITE_CRIPTO),
  };
}

/** Resultado mês a mês, total do ano, prejuízo acumulado e alertas. */
export async function getResultados(ano: number): Promise<ResultadosAno> {
  const response = await httpClient.get<ResultadosDto | undefined>(`${RESULTADOS_PATH}?ano=${ano}`);
  return toResultados(response, ano);
}

/** Quanto já foi vendido no mês (`AAAA-MM`) em ações e cripto e quanto ainda cabe na isenção. */
export async function getLimiteIsencao(mes: string): Promise<LimiteIsencao> {
  const response = await httpClient.get<LimiteDto | undefined>(
    `${RESULTADOS_PATH}/limite-isencao?mes=${encodeURIComponent(mes)}`,
  );
  return toLimiteIsencao(response, mes);
}
