// ── DRE Constants ──
// Exact hierarchy matching the official CyA spreadsheet

export const CLASSIFICACOES_ENTRADA = [
  { value: "receita_operacional", label: "Receita Operacional" },
  { value: "receita_nao_operacional", label: "Receita Não Operacional" },
] as const;

export const CLASSIFICACOES_SAIDA = [
  { value: "cpv", label: "(-) Custos Diretos (CPV)" },
  { value: "despesa_variavel", label: "(-) Despesas Variáveis de Venda" },
  { value: "custo_fixo", label: "(-) Custos Fixos" },
  { value: "imposto", label: "(-) Impostos e Juros" },
] as const;

export const SUBCATEGORIAS: Record<string, { value: string; label: string }[]> = {
  receita_operacional: [
    { value: "vendas_balcao", label: "Vendas balcão / Presenciais" },
    { value: "vendas_delivery_wpp", label: "Vendas delivery / WhatsApp" },
    { value: "vendas_ifood", label: "Vendas iFood" },
    { value: "assinatura_kit_essencia", label: "Kit Essência" },
    { value: "assinatura_kit_premium", label: "Kit Premium" },
    { value: "assinatura_kit_personalizado", label: "Kit Personalizado / Corporativo" },
    { value: "vendas_b2b_revendas", label: "Revendas / Cafés parceiros" },
    { value: "vendas_b2b_kit_corporativo", label: "Kit Corporativo / Presentes" },
    { value: "encomendas_eventos", label: "Encomendas personalizadas (eventos)" },
  ],
  receita_nao_operacional: [
    { value: "juros_multas_recebidas", label: "Juros / Multas recebidas" },
    { value: "estornos_devolucoes", label: "Estornos positivos / Devoluções" },
    { value: "rendimentos_aplicacoes", label: "Rendimentos de aplicações financeiras" },
  ],
  cpv: [
    { value: "insumos_producao", label: "Insumos de produção" },
    { value: "embalagens_primarias", label: "Embalagens primárias" },
    { value: "materiais_expedicao", label: "Materiais de expedição / Uso interno" },
    { value: "frete_entregas", label: "Frete e entregas" },
  ],
  despesa_variavel: [
    { value: "taxas_cartao_asaas", label: "Taxas cartão / Asaas" },
    { value: "descontos_cupons", label: "Descontos e cupons promocionais" },
    { value: "eventos_acoes_promocionais", label: "Eventos / Ações promocionais" },
    { value: "taxas_ifood", label: "Taxas iFood" },
    { value: "embalagens_presente_brindes", label: "Embalagens de presente / Brindes" },
  ],
  custo_fixo: [
    { value: "aluguel_condominio", label: "Aluguel + Condomínio" },
    { value: "salarios", label: "Salários" },
    { value: "agua", label: "Água" },
    { value: "luz", label: "Luz" },
    { value: "contabilidade", label: "Contabilidade" },
    { value: "pro_labore", label: "Pró-labore" },
    { value: "internet_telefone", label: "Internet / Telefone" },
    { value: "marketing_divulgacao", label: "Marketing / Divulgação" },
    { value: "servicos_tecnicos", label: "Serviços técnicos / Desenvolvimento de produtos" },
    { value: "software_sistema", label: "Software / Sistema de gestão" },
  ],
  imposto: [
    { value: "impostos_receita_das", label: "Impostos Receita / DAS" },
  ],
};

// ── Block groupings for DRE hierarchy ──
// Maps each DRE block to which subcategoria_dre values belong to it

export interface DreBlock {
  id: string;
  label: string;
  classificacao: string;
  subcategorias: string[];
}

export const RECEITA_BLOCKS: DreBlock[] = [
  {
    id: "2.1",
    label: "Loja Física",
    classificacao: "receita_operacional",
    subcategorias: ["vendas_balcao", "vendas_delivery_wpp", "vendas_ifood"],
  },
  {
    id: "2.2",
    label: "Assinaturas",
    classificacao: "receita_operacional",
    subcategorias: ["assinatura_kit_essencia", "assinatura_kit_premium", "assinatura_kit_personalizado"],
  },
  {
    id: "2.3",
    label: "Vendas B2B",
    classificacao: "receita_operacional",
    subcategorias: ["vendas_b2b_revendas", "vendas_b2b_kit_corporativo"],
  },
  {
    id: "2.4",
    label: "Outras Receitas Operacionais",
    classificacao: "receita_operacional",
    subcategorias: ["encomendas_eventos"],
  },
  {
    id: "2.5",
    label: "Receitas Não Operacionais",
    classificacao: "receita_nao_operacional",
    subcategorias: ["juros_multas_recebidas", "estornos_devolucoes", "rendimentos_aplicacoes"],
  },
];

export const DESPESA_BLOCKS: DreBlock[] = [
  {
    id: "1.1",
    label: "Custos Diretos (CPV)",
    classificacao: "cpv",
    subcategorias: ["insumos_producao", "embalagens_primarias", "materiais_expedicao", "frete_entregas"],
  },
  {
    id: "1.2",
    label: "Despesas Variáveis de Venda",
    classificacao: "despesa_variavel",
    subcategorias: ["taxas_cartao_asaas", "descontos_cupons", "eventos_acoes_promocionais", "taxas_ifood", "embalagens_presente_brindes"],
  },
  {
    id: "1.3",
    label: "Custos Fixos",
    classificacao: "custo_fixo",
    subcategorias: ["aluguel_condominio", "salarios", "agua", "luz", "contabilidade", "pro_labore", "internet_telefone", "marketing_divulgacao", "servicos_tecnicos", "software_sistema"],
  },
  {
    id: "1.4",
    label: "Impostos e Juros",
    classificacao: "imposto",
    subcategorias: ["impostos_receita_das"],
  },
];

// ── Legacy compat: also accept old subcategoria values ──
// Maps old values → new values for backward compatibility in DRE aggregation
export const LEGACY_SUBCATEGORIA_MAP: Record<string, string> = {
  // Old receita_operacional
  loja_fisica: "vendas_balcao",
  b2b: "vendas_b2b_revendas",
  ifood: "vendas_ifood",
  whatsapp_delivery: "vendas_delivery_wpp",
  assinaturas: "assinatura_kit_essencia",
  outras_receitas: "encomendas_eventos",
  // Old receita_nao_operacional
  rendimento_financeiro: "rendimentos_aplicacoes",
  estorno_positivo: "estornos_devolucoes",
  outras_nao_operacionais: "estornos_devolucoes",
  // Old cpv
  insumos: "insumos_producao",
  materia_prima: "insumos_producao",
  embalagens_diretas: "embalagens_primarias",
  expedicao_direta: "materiais_expedicao",
  // Old despesa_variavel
  taxa_cartao: "taxas_cartao_asaas",
  taxa_plataforma: "taxas_ifood",
  frete_variavel: "frete_entregas",
  comissao: "taxas_cartao_asaas",
  desconto_promocional: "descontos_cupons",
  // Old custo_fixo
  aluguel: "aluguel_condominio",
  salarios: "salarios",
  pro_labore: "pro_labore",
  energia: "luz",
  internet: "internet_telefone",
  sistema: "software_sistema",
  contador: "contabilidade",
  limpeza: "aluguel_condominio",
  marketing_fixo: "marketing_divulgacao",
  administrativo: "software_sistema",
  // Old imposto
  das: "impostos_receita_das",
  icms: "impostos_receita_das",
  outros_tributos: "impostos_receita_das",
};

export function normalizeSubcategoria(value: string | null | undefined): string {
  if (!value) return "outros";
  return LEGACY_SUBCATEGORIA_MAP[value] ?? value;
}

export function getSubcategoriaLabel(classificacao: string, subcategoria: string): string {
  const subs = SUBCATEGORIAS[classificacao];
  if (!subs) return subcategoria;
  const found = subs.find((s) => s.value === subcategoria);
  return found?.label ?? subcategoria;
}

export function getClassificacaoLabel(value: string): string {
  const all = [...CLASSIFICACOES_ENTRADA, ...CLASSIFICACOES_SAIDA];
  return all.find((c) => c.value === value)?.label ?? value;
}
