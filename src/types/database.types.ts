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