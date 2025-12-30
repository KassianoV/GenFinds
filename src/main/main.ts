// Hot Reload APENAS em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reloader')(module);
  } catch {}
}
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseManager } from '../database/database';
import {
  Conta,
  Categoria,
  Orcamento,
  Transacao,
  PaginationParams
} from '../types/database.types';
import {
  UsuarioCreateSchema,
  ContaCreateSchema,
  ContaUpdateSchema,
  CategoriaCreateSchema,
  CategoriaUpdateSchema,
  OrcamentoCreateSchema,
  OrcamentoUpdateSchema,
  TransacaoCreateSchema,
  TransacaoUpdateSchema,
  IdSchema,
  EmailSchema,
  LimitSchema,
  TipoCategoriaSchema,
  MesSchema,
  AnoSchema,
  DataSchema,
  PaginationSchema,
  validateData,
  validateParams,
  sanitizeError
} from './validation';
import { logger, logError, logInfo, logIpcHandler } from './logger';

let mainWindow: BrowserWindow | null = null;
let db: DatabaseManager;

function createWindow(): void {
  // ========== CORREÇÃO DO ÍCONE ==========
  // Determinar caminho do ícone baseado no ambiente
  const iconPath = process.env.NODE_ENV === 'production'
    ? path.join(process.resourcesPath, 'assets', 'icon.ico')
    : path.join(__dirname, '../../assets/icon.ico');

  // Log para debug (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    logInfo('Icon configuration', { 
      iconPath, 
      exists: fs.existsSync(iconPath),
      environment: process.env.NODE_ENV 
    });
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    frame: true,
    autoHideMenuBar: true,
    icon: iconPath,
    title: 'GenFins - Gerenciador Financeiro'
  });

  mainWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

  // DevTools APENAS em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicialização
app.whenReady().then(async () => {
  logInfo('Application starting', { version: app.getVersion(), env: process.env.NODE_ENV });

  db = new DatabaseManager();
  await db.init();
  logInfo('Database initialized successfully');

  createWindow();
  logInfo('Main window created');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logInfo('All windows closed, shutting down');
    db.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    logInfo('Application quitting, closing database');
    db.close();
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error: any) => {
  logError('Uncaught Exception', error);
});

process.on('unhandledRejection', (error: any) => {
  logError('Unhandled Rejection', error);
});

// ========== IPC HANDLERS - USUÁRIO ==========

ipcMain.handle('usuario:create', async (_, nome: string, email: string) => {
  try {
    // Validação de entrada
    const validation = validateData(UsuarioCreateSchema, { nome, email });
    if (!validation.success) {
      logIpcHandler('usuario:create', false, undefined, { reason: 'validation_failed', error: validation.error });
      return { success: false, error: validation.error };
    }

    const data = db.createUsuario(validation.data.nome, validation.data.email);
    logIpcHandler('usuario:create', true, data.id, { email: validation.data.email });
    return { success: true, data };
  } catch (error: any) {
    logError('usuario:create failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('usuario:get', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.getUsuario(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('usuario:get failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('usuario:getByEmail', async (_, email: string) => {
  try {
    // Validação de entrada
    const validation = validateData(EmailSchema, email);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.getUsuarioByEmail(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('usuario:getByEmail failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

// ========== IPC HANDLERS - CONTA ==========

ipcMain.handle('conta:create', async (_, conta: Omit<Conta, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // Validação de entrada
    const validation = validateData(ContaCreateSchema, conta);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // O Zod garante que saldo e ativa terão valores padrão (0 e true)
    const data = db.createConta(validation.data as Omit<Conta, 'id' | 'created_at' | 'updated_at'>);
    return { success: true, data };
  } catch (error: any) {
    logError('conta:create failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('conta:list', async (_, usuarioId: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, usuarioId);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.getContas(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('conta:list failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('conta:get', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.getConta(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('conta:get failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('conta:update', async (_, id: number, updates: Partial<Conta>) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, id);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const updateValidation = validateData(ContaUpdateSchema, updates);
    if (!updateValidation.success) {
      return { success: false, error: updateValidation.error };
    }

    const data = db.updateConta(idValidation.data, updateValidation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('conta:update failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('conta:delete', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.deleteConta(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('conta:delete failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

// ========== IPC HANDLERS - CATEGORIA ==========

ipcMain.handle('categoria:create', async (_, categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // Validação de entrada
    const validation = validateData(CategoriaCreateSchema, categoria);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.createCategoria(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('categoria:create failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('categoria:list', async (_, usuarioId: number, tipo?: 'receita' | 'despesa') => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, usuarioId);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const tipoValidation = validateData(TipoCategoriaSchema, tipo);
    if (!tipoValidation.success) {
      return { success: false, error: tipoValidation.error };
    }

    const data = db.getCategorias(idValidation.data, tipoValidation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('categoria:list failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('categoria:get', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.getCategoria(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('categoria:get failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('categoria:update', async (_, id: number, updates: Partial<Categoria>) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, id);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const updateValidation = validateData(CategoriaUpdateSchema, updates);
    if (!updateValidation.success) {
      return { success: false, error: updateValidation.error };
    }

    const data = db.updateCategoria(idValidation.data, updateValidation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('categoria:update failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('categoria:delete', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.deleteCategoria(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('categoria:delete failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

// ========== IPC HANDLERS - ORÇAMENTO ==========

ipcMain.handle('orcamento:create', async (_, orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // Validação de entrada
    const validation = validateData(OrcamentoCreateSchema, orcamento);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.createOrcamento(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('orcamento:create failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('orcamento:list', async (_, usuarioId: number, mes?: number, ano?: number) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, usuarioId);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const mesValidation = validateData(MesSchema, mes);
    if (!mesValidation.success) {
      return { success: false, error: mesValidation.error };
    }

    const anoValidation = validateData(AnoSchema, ano);
    if (!anoValidation.success) {
      return { success: false, error: anoValidation.error };
    }

    const data = db.getOrcamentos(idValidation.data, mesValidation.data, anoValidation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('orcamento:list failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('orcamento:get', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.getOrcamento(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('orcamento:get failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('orcamento:update', async (_, id: number, updates: Partial<Orcamento>) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, id);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const updateValidation = validateData(OrcamentoUpdateSchema, updates);
    if (!updateValidation.success) {
      return { success: false, error: updateValidation.error };
    }

    const data = db.updateOrcamento(idValidation.data, updateValidation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('orcamento:update failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('orcamento:delete', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.deleteOrcamento(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('orcamento:delete failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

// ========== IPC HANDLERS - TRANSAÇÃO ==========

ipcMain.handle('transacao:create', async (_, transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // Validação de entrada
    const validation = validateData(TransacaoCreateSchema, transacao);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.createTransacao(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('transacao:create failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('transacao:list', async (_, usuarioId: number, limit?: number) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, usuarioId);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const limitValidation = validateData(LimitSchema, limit);
    if (!limitValidation.success) {
      return { success: false, error: limitValidation.error };
    }

    const data = db.getTransacoes(idValidation.data, limitValidation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('transacao:list failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

// ✅ CORRIGIDO: Handler com paginação - valores padrão definidos antes da validação
ipcMain.handle('transacao:list-paginated', async (_, usuarioId: number, page?: number, pageSize?: number) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, usuarioId);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    // ✅ CORREÇÃO: Garantir valores não-undefined antes da validação
    const paginationParams = {
      page: page ?? 1,      // Usar nullish coalescing para garantir número
      pageSize: pageSize ?? 50
    };

    const paginationValidation = validateData(PaginationSchema, paginationParams);
    if (!paginationValidation.success) {
      return { success: false, error: paginationValidation.error };
    }

    // O Zod garante que page e pageSize terão valores padrão (1 e 50)
    const data = db.getTransacoesPaginated(idValidation.data, paginationValidation.data as PaginationParams);
    return { success: true, data };
  } catch (error: any) {
    logError('transacao:list-paginated failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('transacao:get', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.getTransacao(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('transacao:get failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('transacao:update', async (_, id: number, updates: Partial<Transacao>) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, id);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const updateValidation = validateData(TransacaoUpdateSchema, updates);
    if (!updateValidation.success) {
      return { success: false, error: updateValidation.error };
    }

    const data = db.updateTransacao(idValidation.data, updateValidation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('transacao:update failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

ipcMain.handle('transacao:delete', async (_, id: number) => {
  try {
    // Validação de entrada
    const validation = validateData(IdSchema, id);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const data = db.deleteTransacao(validation.data);
    return { success: true, data };
  } catch (error: any) {
    logError('transacao:delete failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});

// ========== IPC HANDLERS - RELATÓRIOS ==========

ipcMain.handle('relatorio:resumo', async (_, usuarioId: number, dataInicio?: string, dataFim?: string) => {
  try {
    // Validação de entrada
    const idValidation = validateData(IdSchema, usuarioId);
    if (!idValidation.success) {
      return { success: false, error: idValidation.error };
    }

    const dataInicioValidation = validateData(DataSchema, dataInicio);
    if (!dataInicioValidation.success) {
      return { success: false, error: dataInicioValidation.error };
    }

    const dataFimValidation = validateData(DataSchema, dataFim);
    if (!dataFimValidation.success) {
      return { success: false, error: dataFimValidation.error };
    }

    const data = db.getResumoFinanceiro(
      idValidation.data,
      dataInicioValidation.data,
      dataFimValidation.data
    );
    return { success: true, data };
  } catch (error: any) {
    logError('relatorio:resumo failed', error);
    return { success: false, error: sanitizeError(error) };
  }
});