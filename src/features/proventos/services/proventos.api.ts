import { httpClient } from '@/services';
import { ASSET_CLASS } from '@/types';
import type { AssetClass } from '@/types';
import { TIPO_PROVENTO, TIPO_PROVENTO_ORDER } from '@/features/proventos/types';
import type { Provento, ProventoInput, ProventosResumo, TipoProvento } from '@/features/proventos/types';

/**
 * Acesso aos proventos na palm-invest-api (`/api/proventos`). É o único lugar
 * que conhece o formato da API: o resto da aplicação trabalha com `Provento`.
 */

const PROVENTOS_PATH = '/api/proventos';

type Decimal = number | string | null | undefined;

/** Provento como a API devolve. */
export interface ProventoDto {
  id: number | string;
  assetSymbol: string;
  assetClass: AssetClass;
  tipo: TipoProvento;
  dataPagamento: string;
  valorBruto: Decimal;
  irRetido?: Decimal;
  valorLiquido?: Decimal;
  observacao?: string | null;
}

/** Corpo aceito pela API em POST e PUT (sem `id` e sem `assetClass`). */
export interface ProventoPayload {
  assetSymbol: string;
  tipo: TipoProvento;
  dataPagamento: string;
  valorBruto: number;
  irRetido: number;
  observacao: string;
}

interface ResumoDto {
  ano?: number;
  totalBruto?: Decimal;
  totalIrRetido?: Decimal;
  totalLiquido?: Decimal;
  porMes?: Array<{ mes?: number; totalLiquido?: Decimal }>;
  porAtivo?: Array<{ assetSymbol?: string; assetClass?: string; totalLiquido?: Decimal }>;
  porTipo?: Array<{ tipo?: string; totalLiquido?: Decimal }>;
}

function toNumber(value: Decimal): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTicker(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

const KNOWN_CLASSES = new Set<string>(Object.values(ASSET_CLASS));
const KNOWN_TIPOS = new Set<string>(Object.values(TIPO_PROVENTO));

export function toProvento(dto: ProventoDto): Provento {
  const valorBruto = toNumber(dto.valorBruto);
  const irRetido = toNumber(dto.irRetido);

  return {
    id: String(dto.id),
    ticker: normalizeTicker(dto.assetSymbol),
    assetClass: dto.assetClass,
    tipo: dto.tipo,
    dataPagamento: (dto.dataPagamento ?? '').slice(0, 10),
    valorBruto,
    irRetido,
    valorLiquido: dto.valorLiquido == null ? valorBruto - irRetido : toNumber(dto.valorLiquido),
    observacao: dto.observacao ?? '',
  };
}

export function toPayload(input: ProventoInput): ProventoPayload {
  return {
    assetSymbol: normalizeTicker(input.ticker),
    tipo: input.tipo,
    dataPagamento: input.dataPagamento,
    valorBruto: input.valorBruto,
    irRetido: input.irRetido,
    observacao: input.observacao.trim().toUpperCase(),
  };
}

export function toResumo(dto: ResumoDto | undefined, ano: number): ProventosResumo {
  const porMesDto = dto?.porMes ?? [];
  const porTipoDto = dto?.porTipo ?? [];

  return {
    ano: dto?.ano ?? ano,
    totalBruto: toNumber(dto?.totalBruto),
    totalIrRetido: toNumber(dto?.totalIrRetido),
    totalLiquido: toNumber(dto?.totalLiquido),
    // Sempre os 12 meses, mesmo que a API omita algum.
    porMes: Array.from({ length: 12 }, (_, index) => ({
      mes: index + 1,
      totalLiquido: toNumber(porMesDto.find((item) => item.mes === index + 1)?.totalLiquido),
    })),
    porAtivo: (dto?.porAtivo ?? []).flatMap((item) => {
      const ticker = normalizeTicker(item.assetSymbol);
      if (ticker === '' || !KNOWN_CLASSES.has(item.assetClass ?? '')) return [];
      return [{ ticker, assetClass: item.assetClass as AssetClass, totalLiquido: toNumber(item.totalLiquido) }];
    }),
    // Sempre os 4 tipos, na ordem de exibição.
    porTipo: TIPO_PROVENTO_ORDER.map((tipo) => ({
      tipo,
      totalLiquido: toNumber(porTipoDto.find((item) => item.tipo === tipo && KNOWN_TIPOS.has(tipo))?.totalLiquido),
    })),
  };
}

export interface ProventosFilter {
  ano?: number;
  ticker?: string;
}

/** Lista os proventos do usuário, do pagamento mais recente para o mais antigo. */
export async function listProventos(filter: ProventosFilter = {}): Promise<Provento[]> {
  const params = new URLSearchParams();
  if (filter.ano !== undefined) params.set('ano', String(filter.ano));
  if (filter.ticker) params.set('assetSymbol', normalizeTicker(filter.ticker));
  const query = params.size > 0 ? `?${params}` : '';

  const response = await httpClient.get<ProventoDto[] | undefined>(`${PROVENTOS_PATH}${query}`);
  return (response ?? []).map(toProvento);
}

export async function createProvento(input: ProventoInput): Promise<Provento> {
  return toProvento(await httpClient.post<ProventoDto>(PROVENTOS_PATH, toPayload(input)));
}

export async function updateProvento(id: string, input: ProventoInput): Promise<Provento> {
  return toProvento(
    await httpClient.put<ProventoDto>(`${PROVENTOS_PATH}/${encodeURIComponent(id)}`, toPayload(input)),
  );
}

export async function deleteProvento(id: string): Promise<void> {
  await httpClient.delete(`${PROVENTOS_PATH}/${encodeURIComponent(id)}`);
}

/** Totais líquidos do ano: por mês, por ativo e por tipo. */
export async function getProventosResumo(ano: number): Promise<ProventosResumo> {
  const response = await httpClient.get<ResumoDto | undefined>(`${PROVENTOS_PATH}/resumo?ano=${ano}`);
  return toResumo(response, ano);
}
