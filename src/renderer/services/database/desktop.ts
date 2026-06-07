import type { ServiceResult } from '../../../types/database.types'
import type { DatabaseService } from './types'

async function ipc<T>(call: () => Promise<ServiceResult<T>>): Promise<ServiceResult<T>> {
  try {
    return await call()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro de comunicação com o processo principal'
    return { success: false, error: msg }
  }
}

export const desktopDatabaseService: DatabaseService = {
  auth: {
    checkUserExists: () => ipc(() => window.api.auth.checkUserExists()),
    register: (nome, senha) => ipc(() => window.api.auth.register(nome, senha)),
    login: (nome, senha) => ipc(() => window.api.auth.login(nome, senha)),
    changePassword: (usuarioId, senhaAtual, novaSenha) =>
      ipc(() => window.api.auth.changePassword(usuarioId, senhaAtual, novaSenha)),
    updateNome: (id, novoNome) => ipc(() => window.api.auth.updateNome(id, novoNome))
  },

  usuario: {
    create: (nome, email) => ipc(() => window.api.usuario.create(nome, email)),
    get: (id) => ipc(() => window.api.usuario.get(id)),
    getByEmail: (email) => ipc(() => window.api.usuario.getByEmail(email))
  },

  conta: {
    create: (conta) => ipc(() => window.api.conta.create(conta)),
    list: (usuarioId) => ipc(() => window.api.conta.list(usuarioId)),
    get: (id, usuarioId) => ipc(() => window.api.conta.get(id, usuarioId)),
    update: (id, usuarioId, updates) => ipc(() => window.api.conta.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.conta.delete(id, usuarioId))
  },

  categoria: {
    create: (categoria) => ipc(() => window.api.categoria.create(categoria)),
    list: (usuarioId, tipo) => ipc(() => window.api.categoria.list(usuarioId, tipo)),
    get: (id, usuarioId) => ipc(() => window.api.categoria.get(id, usuarioId)),
    update: (id, usuarioId, updates) =>
      ipc(() => window.api.categoria.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.categoria.delete(id, usuarioId))
  },

  orcamento: {
    create: (orcamento) => ipc(() => window.api.orcamento.create(orcamento)),
    list: (usuarioId, mes, ano) => ipc(() => window.api.orcamento.list(usuarioId, mes, ano)),
    get: (id, usuarioId) => ipc(() => window.api.orcamento.get(id, usuarioId)),
    update: (id, usuarioId, updates) =>
      ipc(() => window.api.orcamento.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.orcamento.delete(id, usuarioId))
  },

  cartao: {
    create: (cartao) => ipc(() => window.api.cartao.create(cartao)),
    list: (usuarioId) => ipc(() => window.api.cartao.list(usuarioId)),
    get: (id, usuarioId) => ipc(() => window.api.cartao.get(id, usuarioId)),
    update: (id, usuarioId, updates) => ipc(() => window.api.cartao.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.cartao.delete(id, usuarioId))
  },

  parcela: {
    create: (parcela) => ipc(() => window.api.parcela.create(parcela)),
    list: (usuarioId) => ipc(() => window.api.parcela.list(usuarioId)),
    get: (id, usuarioId) => ipc(() => window.api.parcela.get(id, usuarioId)),
    update: (id, usuarioId, updates) =>
      ipc(() => window.api.parcela.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.parcela.delete(id, usuarioId))
  },

  transacaoCartao: {
    create: (transacao) => ipc(() => window.api.transacaoCartao.create(transacao)),
    createParcelada: (transacao, numeroParcelas) =>
      ipc(() => window.api.transacaoCartao.createParcelada(transacao, numeroParcelas)),
    list: (usuarioId, cartaoId, mes, ano) =>
      ipc(() => window.api.transacaoCartao.list(usuarioId, cartaoId, mes, ano)),
    get: (id, usuarioId) => ipc(() => window.api.transacaoCartao.get(id, usuarioId)),
    update: (id, usuarioId, updates) =>
      ipc(() => window.api.transacaoCartao.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.transacaoCartao.delete(id, usuarioId))
  },

  transacao: {
    create: (transacao) => ipc(() => window.api.transacao.create(transacao)),
    list: (usuarioId, limit) => ipc(() => window.api.transacao.list(usuarioId, limit)),
    listPaginated: (usuarioId, page, pageSize) =>
      ipc(() => window.api.transacao.listPaginated(usuarioId, page, pageSize)),
    get: (id, usuarioId) => ipc(() => window.api.transacao.get(id, usuarioId)),
    update: (id, usuarioId, updates) =>
      ipc(() => window.api.transacao.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.transacao.delete(id, usuarioId))
  },

  nota: {
    create: (nota) => ipc(() => window.api.nota.create(nota)),
    list: (usuarioId) => ipc(() => window.api.nota.list(usuarioId)),
    update: (id, usuarioId, updates) => ipc(() => window.api.nota.update(id, usuarioId, updates)),
    delete: (id, usuarioId) => ipc(() => window.api.nota.delete(id, usuarioId))
  },

  relatorio: {
    getResumo: (usuarioId, dataInicio, dataFim) =>
      ipc(() => window.api.relatorio.getResumo(usuarioId, dataInicio, dataFim)),
    getGastosPorCategoria: (usuarioId, dataInicio, dataFim) =>
      ipc(() => window.api.relatorio.getGastosPorCategoria(usuarioId, dataInicio, dataFim)),
    getTopGastos: (usuarioId, dataInicio, dataFim, limite) =>
      ipc(() => window.api.relatorio.getTopGastos(usuarioId, dataInicio, dataFim, limite)),
    getEvolucaoMensal: (usuarioId, dataInicio, dataFim) =>
      ipc(() => window.api.relatorio.getEvolucaoMensal(usuarioId, dataInicio, dataFim))
  },

  database: {
    clear: () => ipc(() => window.api.database.clear())
  }
}
