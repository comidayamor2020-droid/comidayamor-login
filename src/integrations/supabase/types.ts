export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          message_content: string
          message_role: string
          user_id: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          message_content: string
          message_role: string
          user_id?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          message_content?: string
          message_role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_companies: {
        Row: {
          city: string | null
          cnpj: string | null
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          instagram: string | null
          notes: string | null
          pedido_minimo_valor: number | null
          phone: string | null
          score: number | null
          state: string | null
          status: string | null
          trade_name: string | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          notes?: string | null
          pedido_minimo_valor?: number | null
          phone?: string | null
          score?: number | null
          state?: string | null
          status?: string | null
          trade_name?: string | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          notes?: string | null
          pedido_minimo_valor?: number | null
          phone?: string | null
          score?: number | null
          state?: string | null
          status?: string | null
          trade_name?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      b2b_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "b2b_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "b2b_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_orders: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string | null
          delivered_at: string | null
          delivery_date: string | null
          estimated_delivery_date: string | null
          estimated_delivery_end: string | null
          estimated_delivery_start: string | null
          id: string
          last_status_email_sent_at: string | null
          notes: string | null
          order_date: string | null
          production_started_at: string | null
          ready_at: string | null
          status: string
          total_amount: number
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          estimated_delivery_date?: string | null
          estimated_delivery_end?: string | null
          estimated_delivery_start?: string | null
          id?: string
          last_status_email_sent_at?: string | null
          notes?: string | null
          order_date?: string | null
          production_started_at?: string | null
          ready_at?: string | null
          status?: string
          total_amount?: number
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          estimated_delivery_date?: string | null
          estimated_delivery_end?: string | null
          estimated_delivery_start?: string | null
          id?: string
          last_status_email_sent_at?: string | null
          notes?: string | null
          order_date?: string | null
          production_started_at?: string | null
          ready_at?: string | null
          status?: string
          total_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "b2b_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      Clientes: {
        Row: {
          data_criacao: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
          tipo_cliente: string | null
        }
        Insert: {
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tipo_cliente?: string | null
        }
        Update: {
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tipo_cliente?: string | null
        }
        Relationships: []
      }
      compras: {
        Row: {
          data_compra: string | null
          data_criacao: string | null
          forma_pagamento: string | null
          fornecedor_id: string
          id: string
          observacoes: string | null
          prazo_entrega: string | null
          status: string | null
          valor_total: number | null
        }
        Insert: {
          data_compra?: string | null
          data_criacao?: string | null
          forma_pagamento?: string | null
          fornecedor_id: string
          id?: string
          observacoes?: string | null
          prazo_entrega?: string | null
          status?: string | null
          valor_total?: number | null
        }
        Update: {
          data_compra?: string | null
          data_criacao?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string
          id?: string
          observacoes?: string | null
          prazo_entrega?: string | null
          status?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria: string | null
          centro_custo: string | null
          data_criacao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          observacoes: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          centro_custo?: string | null
          data_criacao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          centro_custo?: string | null
          data_criacao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      contas_receber: {
        Row: {
          categoria: string | null
          cliente: string | null
          data_criacao: string | null
          data_recebimento: string | null
          data_vencimento: string | null
          descricao: string
          forma_recebimento: string | null
          id: string
          observacoes: string | null
          origem: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          cliente?: string | null
          data_criacao?: string | null
          data_recebimento?: string | null
          data_vencimento?: string | null
          descricao: string
          forma_recebimento?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          cliente?: string | null
          data_criacao?: string | null
          data_recebimento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_recebimento?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          categoria_fornecimento: string | null
          cidade: string | null
          condicoes_pagamento: string | null
          contato: string | null
          data_criacao: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          prazo_entrega: number | null
          telefone: string | null
        }
        Insert: {
          categoria_fornecimento?: string | null
          cidade?: string | null
          condicoes_pagamento?: string | null
          contato?: string | null
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          prazo_entrega?: number | null
          telefone?: string | null
        }
        Update: {
          categoria_fornecimento?: string | null
          cidade?: string | null
          condicoes_pagamento?: string | null
          contato?: string | null
          data_criacao?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          prazo_entrega?: number | null
          telefone?: string | null
        }
        Relationships: []
      }
      insumos: {
        Row: {
          categoria: string | null
          custo_unitario: number | null
          data_criacao: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fornecedor_principal: string | null
          id: string
          lead_time: number | null
          nome: string
          observacoes: string | null
          unidade_medida: string | null
        }
        Insert: {
          categoria?: string | null
          custo_unitario?: number | null
          data_criacao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor_principal?: string | null
          id?: string
          lead_time?: number | null
          nome: string
          observacoes?: string | null
          unidade_medida?: string | null
        }
        Update: {
          categoria?: string | null
          custo_unitario?: number | null
          data_criacao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor_principal?: string | null
          id?: string
          lead_time?: number | null
          nome?: string
          observacoes?: string | null
          unidade_medida?: string | null
        }
        Relationships: []
      }
      itens_compra: {
        Row: {
          compra_id: string
          data_criacao: string | null
          id: string
          insumo_id: string | null
          preco_unitario: number | null
          quantidade: number | null
          valor_total: number | null
        }
        Insert: {
          compra_id: string
          data_criacao?: string | null
          id?: string
          insumo_id?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
          valor_total?: number | null
        }
        Update: {
          compra_id?: string
          data_criacao?: string | null
          id?: string
          insumo_id?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
          valor_total?: number | null
        }
        Relationships: []
      }
      itens_venda: {
        Row: {
          id: string
          preco_unitario: number | null
          produto_id: string | null
          quantidade: number | null
          total_item: number | null
          venda_id: string
        }
        Insert: {
          id?: string
          preco_unitario?: number | null
          produto_id?: string | null
          quantidade?: number | null
          total_item?: number | null
          venda_id: string
        }
        Update: {
          id?: string
          preco_unitario?: number | null
          produto_id?: string | null
          quantidade?: number | null
          total_item?: number | null
          venda_id?: string
        }
        Relationships: []
      }
      movimentacao_estoque: {
        Row: {
          data_movimentacao: string | null
          id: string
          insumo_id: string
          observacoes: string | null
          origem: string | null
          quantidade: number | null
          referencia_id: string | null
          tipo_movimento: string | null
        }
        Insert: {
          data_movimentacao?: string | null
          id?: string
          insumo_id: string
          observacoes?: string | null
          origem?: string | null
          quantidade?: number | null
          referencia_id?: string | null
          tipo_movimento?: string | null
        }
        Update: {
          data_movimentacao?: string | null
          id?: string
          insumo_id?: string
          observacoes?: string | null
          origem?: string | null
          quantidade?: number | null
          referencia_id?: string | null
          tipo_movimento?: string | null
        }
        Relationships: []
      }
      producao: {
        Row: {
          data_criacao: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          observacoes: string | null
          produto_id: string
          quantidade_planejada: number | null
          quantidade_produzida: number | null
          status: string | null
        }
        Insert: {
          data_criacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacoes?: string | null
          produto_id: string
          quantidade_planejada?: number | null
          quantidade_produzida?: number | null
          status?: string | null
        }
        Update: {
          data_criacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          observacoes?: string | null
          produto_id?: string
          quantidade_planejada?: number | null
          quantidade_produzida?: number | null
          status?: string | null
        }
        Relationships: []
      }
      production_order_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          production_order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          production_order_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          production_order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          production_date: string | null
          source_id: string | null
          source_type: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          production_date?: string | null
          source_id?: string | null
          source_type: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          production_date?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          b2b_price: number | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          sku: string | null
          unit_price: number
        }
        Insert: {
          active?: boolean
          b2b_price?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          sku?: string | null
          unit_price?: number
        }
        Update: {
          active?: boolean
          b2b_price?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sku?: string | null
          unit_price?: number
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          custo_estimado: number | null
          data_criacao: string | null
          id: string
          imagem_url: string | null
          nome: string
          pedido_minimo: number
          preco_venda: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          custo_estimado?: number | null
          data_criacao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          pedido_minimo?: number
          preco_venda?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          custo_estimado?: number | null
          data_criacao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          pedido_minimo?: number
          preco_venda?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          role: string
        }
        Insert: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          role: string
        }
        Update: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "b2b_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          canal: string | null
          cliente_id: string | null
          data_venda: string
          desconto: number | null
          forma_pagamento: string | null
          id: string
          valor_bruto: number | null
          valor_liquido: number | null
        }
        Insert: {
          canal?: string | null
          cliente_id?: string | null
          data_venda?: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Update: {
          canal?: string | null
          cliente_id?: string | null
          data_venda?: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_is_active: { Args: never; Returns: boolean }
      current_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
