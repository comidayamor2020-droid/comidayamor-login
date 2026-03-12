export const API_ENDPOINT = "https://comidayamor.app.n8n.cloud/webhook/fluxo-projetado";

export interface DreData {
  receita_total: number;
  cpv: number;
  cpv_percentual: number;
  margem_bruta: number;
  margem_bruta_percentual: number;
  despesas_variaveis: number;
  despesas_variaveis_percentual: number;
  margem_contribuicao: number;
  margem_contribuicao_percentual: number;
  custos_fixos: number;
  custos_fixos_percentual: number;
  ebitda: number;
  ebitda_percentual: number;
  impostos: number;
  impostos_percentual: number;
  lucro_liquido: number;
  lucro_liquido_percentual: number;
}

export const PLACEHOLDER_DATA: DreData = {
  receita_total: 150000,
  cpv: 60000,
  cpv_percentual: 40,
  margem_bruta: 90000,
  margem_bruta_percentual: 60,
  despesas_variaveis: 22500,
  despesas_variaveis_percentual: 15,
  margem_contribuicao: 67500,
  margem_contribuicao_percentual: 45,
  custos_fixos: 30000,
  custos_fixos_percentual: 20,
  ebitda: 37500,
  ebitda_percentual: 25,
  impostos: 7500,
  impostos_percentual: 5,
  lucro_liquido: 30000,
  lucro_liquido_percentual: 20,
};
