// electron/preload.ts

import { contextBridge, ipcRenderer } from 'electron'
import {
  Conta,
  Categoria,
  Orcamento,
  Cartao,
  Parcela,
  TransacaoCartao,
  Transacao,
  Nota
} from '../src/types/database.types'

const api = {
  usuario: {
    create: (nome: string, email: string) => ipcRenderer.invoke('usuario:create', nome, email),
    get: (id: number) => ipcRenderer.invoke('usuario:get', id),
    getByEmail: (email: string) => ipcRenderer.invoke('usuario:getByEmail', email)
  },

  conta: {
    create: (conta: Omit<Conta, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('conta:create', conta),
    list: (usuarioId: number) => ipcRenderer.invoke('conta:list', usuarioId),
    get: (id: number, usuarioId: number) => ipcRenderer.invoke('conta:get', id, usuarioId),
    update: (id: number, usuarioId: number, updates: Partial<Conta>) =>
      ipcRenderer.invoke('conta:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) => ipcRenderer.invoke('conta:delete', id, usuarioId)
  },

  categoria: {
    create: (categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('categoria:create', categoria),
    list: (usuarioId: number, tipo?: 'receita' | 'despesa') =>
      ipcRenderer.invoke('categoria:list', usuarioId, tipo),
    get: (id: number, usuarioId: number) => ipcRenderer.invoke('categoria:get', id, usuarioId),
    update: (id: number, usuarioId: number, updates: Partial<Categoria>) =>
      ipcRenderer.invoke('categoria:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) => ipcRenderer.invoke('categoria:delete', id, usuarioId)
  },

  orcamento: {
    create: (orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('orcamento:create', orcamento),
    list: (usuarioId: number, mes?: number, ano?: number) =>
      ipcRenderer.invoke('orcamento:list', usuarioId, mes, ano),
    get: (id: number, usuarioId: number) => ipcRenderer.invoke('orcamento:get', id, usuarioId),
    update: (id: number, usuarioId: number, updates: Partial<Orcamento>) =>
      ipcRenderer.invoke('orcamento:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) => ipcRenderer.invoke('orcamento:delete', id, usuarioId)
  },

  cartao: {
    create: (cartao: Omit<Cartao, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('cartao:create', cartao),
    list: (usuarioId: number) => ipcRenderer.invoke('cartao:list', usuarioId),
    get: (id: number, usuarioId: number) => ipcRenderer.invoke('cartao:get', id, usuarioId),
    update: (id: number, usuarioId: number, updates: Partial<Cartao>) =>
      ipcRenderer.invoke('cartao:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) => ipcRenderer.invoke('cartao:delete', id, usuarioId)
  },

  parcela: {
    create: (parcela: Omit<Parcela, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('parcela:create', parcela),
    list: (usuarioId: number) => ipcRenderer.invoke('parcela:list', usuarioId),
    get: (id: number, usuarioId: number) => ipcRenderer.invoke('parcela:get', id, usuarioId),
    update: (id: number, usuarioId: number, updates: Partial<Parcela>) =>
      ipcRenderer.invoke('parcela:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) => ipcRenderer.invoke('parcela:delete', id, usuarioId)
  },

  transacaoCartao: {
    create: (transacao: Omit<TransacaoCartao, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('transacao-cartao:create', transacao),
    createParcelada: (
      transacao: Omit<
        TransacaoCartao,
        'id' | 'created_at' | 'updated_at' | 'parcela_atual' | 'grupo_parcelamento'
      >,
      numeroParcelas: number
    ) => ipcRenderer.invoke('transacao-cartao:create-parcelada', transacao, numeroParcelas),
    list: (usuarioId: number, cartaoId?: number, mes?: number, ano?: number) =>
      ipcRenderer.invoke('transacao-cartao:list', usuarioId, cartaoId, mes, ano),
    get: (id: number, usuarioId: number) =>
      ipcRenderer.invoke('transacao-cartao:get', id, usuarioId),
    update: (id: number, usuarioId: number, updates: Partial<TransacaoCartao>) =>
      ipcRenderer.invoke('transacao-cartao:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) =>
      ipcRenderer.invoke('transacao-cartao:delete', id, usuarioId)
  },

  transacao: {
    create: (transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('transacao:create', transacao),
    list: (usuarioId: number, limit?: number) =>
      ipcRenderer.invoke('transacao:list', usuarioId, limit),
    listPaginated: (usuarioId: number, page?: number, pageSize?: number) =>
      ipcRenderer.invoke('transacao:list-paginated', usuarioId, page, pageSize),
    get: (id: number, usuarioId: number) => ipcRenderer.invoke('transacao:get', id, usuarioId),
    update: (id: number, usuarioId: number, updates: Partial<Transacao>) =>
      ipcRenderer.invoke('transacao:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) => ipcRenderer.invoke('transacao:delete', id, usuarioId)
  },

  nota: {
    create: (nota: Omit<Nota, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('nota:create', nota),
    list: (usuarioId: number) => ipcRenderer.invoke('nota:list', usuarioId),
    update: (
      id: number,
      usuarioId: number,
      updates: Partial<Pick<Nota, 'titulo' | 'conteudo' | 'data' | 'tipo'>>
    ) => ipcRenderer.invoke('nota:update', id, usuarioId, updates),
    delete: (id: number, usuarioId: number) => ipcRenderer.invoke('nota:delete', id, usuarioId)
  },

  relatorio: {
    getResumo: (usuarioId: number, dataInicio?: string, dataFim?: string) =>
      ipcRenderer.invoke('relatorio:resumo', usuarioId, dataInicio, dataFim),
    getGastosPorCategoria: (usuarioId: number, dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('relatorio:gastos-categoria', usuarioId, dataInicio, dataFim),
    getTopGastos: (usuarioId: number, dataInicio: string, dataFim: string, limite: number) =>
      ipcRenderer.invoke('relatorio:top-gastos', usuarioId, dataInicio, dataFim, limite),
    getEvolucaoMensal: (usuarioId: number, dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('relatorio:evolucao-mensal', usuarioId, dataInicio, dataFim)
  },

  database: {
    clear: () => ipcRenderer.invoke('database:clear')
  },

  ofx: {
    selectAndRead: (): Promise<{ success: boolean; data: string | null; error?: string }> =>
      ipcRenderer.invoke('ofx:select-and-read'),
    checkDuplicates: (usuarioId: number): Promise<{ success: boolean; data: string[]; error?: string }> =>
      ipcRenderer.invoke('ofx:check-duplicates', usuarioId),
  },

  csv: {
    export: (
      usuarioId: number,
      dataInicio: string,
      dataFim: string,
      filenameSuggestion: string
    ): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> =>
      ipcRenderer.invoke('csv:export', usuarioId, dataInicio, dataFim, filenameSuggestion),
  },

  auth: {
    checkUserExists: () => ipcRenderer.invoke('auth:check-user-exists'),
    register: (nome: string, senha: string) => ipcRenderer.invoke('auth:register', nome, senha),
    login: (nome: string, senha: string) => ipcRenderer.invoke('auth:login', nome, senha),
    changePassword: (usuarioId: number, senhaAtual: string, novaSenha: string) =>
      ipcRenderer.invoke('auth:change-password', usuarioId, senhaAtual, novaSenha),
    updateNome: (id: number, novoNome: string) =>
      ipcRenderer.invoke('auth:update-nome', id, novoNome)
  },

  app: {
    logError: (message: string, stack: string) =>
      ipcRenderer.invoke('app:logError', message, stack),
  },

  sync: {
    generateQR: () =>
      ipcRenderer.invoke('sync:generate-qr'),
    getDevices: () =>
      ipcRenderer.invoke('sync:get-devices'),
    revokeDevice: (deviceId: string) =>
      ipcRenderer.invoke('sync:revoke-device', deviceId),
    getStatus: () =>
      ipcRenderer.invoke('sync:get-status'),
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
