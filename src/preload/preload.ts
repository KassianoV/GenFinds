// src/preload/preload.ts

import { contextBridge, ipcRenderer } from 'electron';
import { Conta, Categoria, Orcamento, Cartao, Parcela, TransacaoCartao, Transacao } from '../types/database.types';

const api = {
  usuario: {
    create: (nome: string, email: string) => ipcRenderer.invoke('usuario:create', nome, email),
    get: (id: number) => ipcRenderer.invoke('usuario:get', id),
    getByEmail: (email: string) => ipcRenderer.invoke('usuario:getByEmail', email),
  },

  conta: {
    create: (conta: Omit<Conta, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('conta:create', conta),
    list: (usuarioId: number) => ipcRenderer.invoke('conta:list', usuarioId),
    get: (id: number) => ipcRenderer.invoke('conta:get', id),
    update: (id: number, updates: Partial<Conta>) =>
      ipcRenderer.invoke('conta:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('conta:delete', id),
  },

  categoria: {
    create: (categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('categoria:create', categoria),
    list: (usuarioId: number, tipo?: 'receita' | 'despesa') =>
      ipcRenderer.invoke('categoria:list', usuarioId, tipo),
    get: (id: number) => ipcRenderer.invoke('categoria:get', id),
    update: (id: number, updates: Partial<Categoria>) =>
      ipcRenderer.invoke('categoria:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('categoria:delete', id),
  },

  orcamento: {
    create: (orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('orcamento:create', orcamento),
    list: (usuarioId: number, mes?: number, ano?: number) =>
      ipcRenderer.invoke('orcamento:list', usuarioId, mes, ano),
    get: (id: number) => ipcRenderer.invoke('orcamento:get', id),
    update: (id: number, updates: Partial<Orcamento>) =>
      ipcRenderer.invoke('orcamento:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('orcamento:delete', id),
  },

  cartao: {
    create: (cartao: Omit<Cartao, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('cartao:create', cartao),
    list: (usuarioId: number) => ipcRenderer.invoke('cartao:list', usuarioId),
    get: (id: number) => ipcRenderer.invoke('cartao:get', id),
    update: (id: number, updates: Partial<Cartao>) =>
      ipcRenderer.invoke('cartao:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('cartao:delete', id),
  },

  parcela: {
    create: (parcela: Omit<Parcela, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('parcela:create', parcela),
    list: (usuarioId: number) => ipcRenderer.invoke('parcela:list', usuarioId),
    get: (id: number) => ipcRenderer.invoke('parcela:get', id),
    update: (id: number, updates: Partial<Parcela>) =>
      ipcRenderer.invoke('parcela:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('parcela:delete', id),
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
    get: (id: number) => ipcRenderer.invoke('transacao-cartao:get', id),
    update: (id: number, updates: Partial<TransacaoCartao>) =>
      ipcRenderer.invoke('transacao-cartao:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('transacao-cartao:delete', id),
  },

  transacao: {
    create: (transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('transacao:create', transacao),
    list: (usuarioId: number, limit?: number) =>
      ipcRenderer.invoke('transacao:list', usuarioId, limit),
    listPaginated: (usuarioId: number, page?: number, pageSize?: number) =>
      ipcRenderer.invoke('transacao:list-paginated', usuarioId, page, pageSize),
    get: (id: number) => ipcRenderer.invoke('transacao:get', id),
    update: (id: number, updates: Partial<Transacao>) =>
      ipcRenderer.invoke('transacao:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('transacao:delete', id),
  },

  relatorio: {
    getResumo: (usuarioId: number, dataInicio?: string, dataFim?: string) =>
      ipcRenderer.invoke('relatorio:resumo', usuarioId, dataInicio, dataFim),
  },
};

contextBridge.exposeInMainWorld('api', api);

declare global {
  interface Window {
    api: typeof api;
  }
}
