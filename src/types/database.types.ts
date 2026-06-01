export interface Usuario {
  id: number
  nome: string
  email: string
  senha_hash: string
  criado_em: string
}

export interface Conta {
  id: number
  usuario_id: number
  nome: string
  tipo: 'corrente' | 'poupanca' | 'carteira'
  saldo_inicial: string
  criado_em: string
}

export interface Categoria {
  id: number
  usuario_id: number
  nome: string
  tipo: 'receita' | 'despesa'
  icone: string
  cor: string
}

export interface Transacao {
  id: number
  usuario_id: number
  conta_id: number
  categoria_id: number
  tipo: 'receita' | 'despesa'
  descricao: string
  valor: string
  data: string
  observacao?: string
  criado_em: string
}

export interface Cartao {
  id: number
  usuario_id: number
  nome: string
  limite: string
  dia_fechamento: number
  dia_vencimento: number
  bandeira?: string
}

export interface TransacaoCartao {
  id: number
  cartao_id: number
  usuario_id: number
  descricao: string
  valor: string
  data: string
  categoria_id: number
  parcela_atual?: number
  total_parcelas?: number
  grupo_parcela_id?: string
}

export interface Orcamento {
  id: number
  usuario_id: number
  categoria_id: number
  valor: string
  mes: number
  ano: number
}

export interface Nota {
  id: number
  usuario_id: number
  texto: string
  criado_em: string
}

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}
