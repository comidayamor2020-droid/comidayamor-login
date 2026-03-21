export const CLASSIFICACOES_ENTRADA = [
  { value: "receita_operacional", label: "Receita Operacional" },
  { value: "receita_nao_operacional", label: "Receita Não Operacional" },
] as const;

export const CLASSIFICACOES_SAIDA = [
  { value: "cpv", label: "CPV / Custos Diretos" },
  { value: "despesa_variavel", label: "Despesa Variável" },
  { value: "custo_fixo", label: "Custo Fixo" },
  { value: "imposto", label: "Imposto" },
] as const;

export const SUBCATEGORIAS: Record<string, { value: string; label: string }[]> = {
  receita_operacional: [
    { value: "loja_fisica", label: "Loja física" },
    { value: "b2b", label: "B2B" },
    { value: "ifood", label: "iFood" },
    { value: "whatsapp_delivery", label: "WhatsApp / Delivery" },
    { value: "assinaturas", label: "Assinaturas" },
    { value: "encomendas_eventos", label: "Encomendas / Eventos" },
    { value: "outras_receitas", label: "Outras receitas" },
  ],
  receita_nao_operacional: [
    { value: "rendimento_financeiro", label: "Rendimento financeiro" },
    { value: "estorno_positivo", label: "Estorno positivo" },
    { value: "outras_nao_operacionais", label: "Outras não operacionais" },
  ],
  cpv: [
    { value: "insumos", label: "Insumos" },
    { value: "materia_prima", label: "Matéria-prima" },
    { value: "embalagens_diretas", label: "Embalagens diretas" },
    { value: "expedicao_direta", label: "Expedição direta" },
  ],
  despesa_variavel: [
    { value: "taxa_cartao", label: "Taxa de cartão" },
    { value: "taxa_plataforma", label: "Taxa de plataforma" },
    { value: "frete_variavel", label: "Frete variável" },
    { value: "comissao", label: "Comissão" },
    { value: "desconto_promocional", label: "Desconto promocional" },
  ],
  custo_fixo: [
    { value: "aluguel", label: "Aluguel" },
    { value: "salarios", label: "Salários" },
    { value: "pro_labore", label: "Pró-labore" },
    { value: "energia", label: "Energia" },
    { value: "internet", label: "Internet" },
    { value: "sistema", label: "Sistema / Software" },
    { value: "contador", label: "Contador" },
    { value: "limpeza", label: "Limpeza" },
    { value: "marketing_fixo", label: "Marketing fixo" },
    { value: "administrativo", label: "Administrativo" },
  ],
  imposto: [
    { value: "das", label: "DAS" },
    { value: "icms", label: "ICMS" },
    { value: "outros_tributos", label: "Outros tributos" },
  ],
};

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
