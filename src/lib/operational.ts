export const DAY_FIELDS = [
  "estoque_ideal_dom",
  "estoque_ideal_seg",
  "estoque_ideal_ter",
  "estoque_ideal_qua",
  "estoque_ideal_qui",
  "estoque_ideal_sex",
  "estoque_ideal_sab",
] as const;

export type DayField = (typeof DAY_FIELDS)[number];

export const OPERATIONAL_CONFIG_SELECT = [
  "produto_id",
  "ativo",
  "unidade",
  "validade_dias",
  "estoque_minimo",
  "estoque_ideal_seg",
  "estoque_ideal_ter",
  "estoque_ideal_qua",
  "estoque_ideal_qui",
  "estoque_ideal_sex",
  "estoque_ideal_sab",
  "estoque_ideal_dom",
  "updated_at",
].join(", ");

type OperationalConfigInput = Record<string, unknown> | null | undefined;

export type NormalizedOperationalConfig = {
  ativo: boolean;
  unidade: string | null;
  validade_dias: number;
  estoque_minimo: number;
  estoque_ideal_seg: number;
  estoque_ideal_ter: number;
  estoque_ideal_qua: number;
  estoque_ideal_qui: number;
  estoque_ideal_sex: number;
  estoque_ideal_sab: number;
  estoque_ideal_dom: number;
  idealByDay: Record<DayField, number>;
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function getLocalDateString(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getIdealField(date: Date = new Date()): DayField {
  return DAY_FIELDS[date.getDay()];
}

export function normalizeOperationalConfig(config: OperationalConfigInput): NormalizedOperationalConfig {
  const normalized = {
    ativo: config?.ativo === true,
    unidade: typeof config?.unidade === "string" && config.unidade.trim() ? config.unidade.trim() : "un",
    validade_dias: toFiniteNumber(config?.validade_dias),
    estoque_minimo: toFiniteNumber(config?.estoque_minimo),
    estoque_ideal_seg: toFiniteNumber(config?.estoque_ideal_seg),
    estoque_ideal_ter: toFiniteNumber(config?.estoque_ideal_ter),
    estoque_ideal_qua: toFiniteNumber(config?.estoque_ideal_qua),
    estoque_ideal_qui: toFiniteNumber(config?.estoque_ideal_qui),
    estoque_ideal_sex: toFiniteNumber(config?.estoque_ideal_sex),
    estoque_ideal_sab: toFiniteNumber(config?.estoque_ideal_sab),
    estoque_ideal_dom: toFiniteNumber(config?.estoque_ideal_dom),
  };

  return {
    ...normalized,
    idealByDay: {
      estoque_ideal_dom: normalized.estoque_ideal_dom,
      estoque_ideal_seg: normalized.estoque_ideal_seg,
      estoque_ideal_ter: normalized.estoque_ideal_ter,
      estoque_ideal_qua: normalized.estoque_ideal_qua,
      estoque_ideal_qui: normalized.estoque_ideal_qui,
      estoque_ideal_sex: normalized.estoque_ideal_sex,
      estoque_ideal_sab: normalized.estoque_ideal_sab,
    },
  };
}

export function buildOperationalConfigPayload(config: OperationalConfigInput) {
  const normalized = normalizeOperationalConfig(config);
  return {
    ativo: normalized.ativo,
    unidade: normalized.unidade,
    validade_dias: normalized.validade_dias,
    estoque_minimo: normalized.estoque_minimo,
    estoque_ideal_seg: normalized.estoque_ideal_seg,
    estoque_ideal_ter: normalized.estoque_ideal_ter,
    estoque_ideal_qua: normalized.estoque_ideal_qua,
    estoque_ideal_qui: normalized.estoque_ideal_qui,
    estoque_ideal_sex: normalized.estoque_ideal_sex,
    estoque_ideal_sab: normalized.estoque_ideal_sab,
    estoque_ideal_dom: normalized.estoque_ideal_dom,
  };
}

export function getIdealForToday(config: OperationalConfigInput, date: Date = new Date()) {
  const normalized = normalizeOperationalConfig(config);
  return normalized.idealByDay[getIdealField(date)];
}
