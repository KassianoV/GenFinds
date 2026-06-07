import type {
  Usuario,
  Conta,
  Categoria,
  Orcamento,
  Cartao,
  Parcela,
  TransacaoCartao,
  TransacaoCartaoCompleta,
  Transacao,
  TransacaoCompleta,
  ResumoFinanceiro,
  PaginatedResult,
  Nota,
  ServiceResult
} from '../../../types/database.types'

export interface DatabaseService {
  auth: {
    checkUserExists(): Promise<ServiceResult<boolean>>
    register(nome: string, senha: string): Promise<ServiceResult<Usuario>>
    login(nome: string, senha: string): Promise<ServiceResult<Usuario>>
    changePassword(
      usuarioId: number,
      senhaAtual: string,
      novaSenha: string
    ): Promise<ServiceResult<void>>
    updateNome(id: number, novoNome: string): Promise<ServiceResult<Usuario>>
  }

  usuario: {
    create(nome: string, email: string): Promise<ServiceResult<Usuario>>
    get(id: number): Promise<ServiceResult<Usuario | undefined>>
    getByEmail(email: string): Promise<ServiceResult<Usuario | undefined>>
  }

  conta: {
    create(conta: Omit<Conta, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<Conta>>
    list(usuarioId: number): Promise<ServiceResult<Conta[]>>
    get(id: number, usuarioId: number): Promise<ServiceResult<Conta | undefined>>
    update(id: number, usuarioId: number, updates: Partial<Conta>): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  categoria: {
    create(
      categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ServiceResult<Categoria>>
    list(usuarioId: number, tipo?: 'receita' | 'despesa'): Promise<ServiceResult<Categoria[]>>
    get(id: number, usuarioId: number): Promise<ServiceResult<Categoria | undefined>>
    update(
      id: number,
      usuarioId: number,
      updates: Partial<Categoria>
    ): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  orcamento: {
    create(
      orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ServiceResult<Orcamento>>
    list(usuarioId: number, mes?: number, ano?: number): Promise<ServiceResult<Orcamento[]>>
    get(id: number, usuarioId: number): Promise<ServiceResult<Orcamento | undefined>>
    update(
      id: number,
      usuarioId: number,
      updates: Partial<Orcamento>
    ): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  cartao: {
    create(cartao: Omit<Cartao, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<Cartao>>
    list(usuarioId: number): Promise<ServiceResult<Cartao[]>>
    get(id: number, usuarioId: number): Promise<ServiceResult<Cartao | undefined>>
    update(id: number, usuarioId: number, updates: Partial<Cartao>): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  parcela: {
    create(
      parcela: Omit<Parcela, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ServiceResult<Parcela>>
    list(usuarioId: number): Promise<ServiceResult<Parcela[]>>
    get(id: number, usuarioId: number): Promise<ServiceResult<Parcela | undefined>>
    update(
      id: number,
      usuarioId: number,
      updates: Partial<Parcela>
    ): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  transacaoCartao: {
    create(
      transacao: Omit<TransacaoCartao, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ServiceResult<TransacaoCartao>>
    createParcelada(
      transacao: Omit<
        TransacaoCartao,
        'id' | 'created_at' | 'updated_at' | 'parcela_atual' | 'grupo_parcelamento'
      >,
      numeroParcelas: number
    ): Promise<ServiceResult<TransacaoCartao[]>>
    list(
      usuarioId: number,
      cartaoId?: number,
      mes?: number,
      ano?: number
    ): Promise<ServiceResult<TransacaoCartaoCompleta[]>>
    get(id: number, usuarioId: number): Promise<ServiceResult<TransacaoCartao | undefined>>
    update(
      id: number,
      usuarioId: number,
      updates: Partial<TransacaoCartao>
    ): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  transacao: {
    create(
      transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ServiceResult<Transacao>>
    list(usuarioId: number, limit?: number): Promise<ServiceResult<TransacaoCompleta[]>>
    listPaginated(
      usuarioId: number,
      page?: number,
      pageSize?: number
    ): Promise<ServiceResult<PaginatedResult<TransacaoCompleta>>>
    get(id: number, usuarioId: number): Promise<ServiceResult<Transacao | undefined>>
    update(
      id: number,
      usuarioId: number,
      updates: Partial<Transacao>
    ): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  nota: {
    create(nota: Omit<Nota, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<Nota>>
    list(usuarioId: number): Promise<ServiceResult<Nota[]>>
    update(
      id: number,
      usuarioId: number,
      updates: Partial<Pick<Nota, 'titulo' | 'conteudo' | 'data' | 'tipo'>>
    ): Promise<ServiceResult<boolean>>
    delete(id: number, usuarioId: number): Promise<ServiceResult<boolean>>
  }

  relatorio: {
    getResumo(
      usuarioId: number,
      dataInicio?: string,
      dataFim?: string
    ): Promise<ServiceResult<ResumoFinanceiro>>
  }

  database: {
    clear(): Promise<ServiceResult<void>>
  }
}
