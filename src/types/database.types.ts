// src/types/database.types.ts

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Conta {
  id: number;
  nome: string;
  saldo: number;
  tipo: 'corrente' | 'poupanca' | 'investimento' | 'carteira';
  ativa: boolean;
  usuario_id: number;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: number;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor?: string;
  icone?: string;
  usuario_id: number;
  created_at: string;
  updated_at: string;
}

export interface Orcamento {
  id: number;
  categoria_id: number;
  valor_planejado: number;
  mes: number;
  ano: number;
  usuario_id: number;
  created_at: string;
  updated_at: string;
}

export interface Cartao {
  id: number;
  nome: string;
  valor: number;
  vencimento: number;
  status: 'aberta' | 'fechada' | 'paga' | 'pendente';
  usuario_id: number;
  created_at: string;
  updated_at: string;
}

export interface Parcela {
  id: number;
  descricao: string;
  dia: number;
  cartao_id: number;
  valor_parcela: number;
  quantidade_parcelas: number;
  total: number;
  usuario_id: number;
  created_at: string;
  updated_at: string;
}

export interface TransacaoCartao {
  id: number;
  descricao: string;
  valor: number;
  data: string;
  cartao_id: number;
  categoria_id?: number;
  parcelas: number;
  parcela_atual: number;
  grupo_parcelamento?: string;
  observacoes?: string;
  usuario_id: number;
  created_at: string;
  updated_at: string;
}

export interface TransacaoCartaoCompleta extends TransacaoCartao {
  cartao_nome: string;
  cartao_vencimento: number;
  categoria_nome?: string;
  categoria_cor?: string;
}

export interface Transacao {
  id: number;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data: string;
  conta_id: number;
  categoria_id: number;
  usuario_id: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumoFinanceiro {
  receita: number;
  despesa: number;
  saldo: number;
}

export interface TransacaoCompleta extends Transacao {
  conta_nome: string;
  categoria_nome: string;
  categoria_cor?: string;
}

// Interfaces de Paginação
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
