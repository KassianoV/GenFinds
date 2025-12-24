// Hot Reload APENAS em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reloader')(module);
  } catch {}
}
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseManager } from '../database/database';
import {
  Conta,
  Categoria,
  Orcamento,
  Transacao
} from '../types/database.types';

let mainWindow: BrowserWindow | null = null;
let db: DatabaseManager;

function createWindow(): void {
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
    icon: path.join(__dirname, '../../assets/icon.ico')
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
  db = new DatabaseManager();
  await db.init();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error: any) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error: any) => {
  console.error('Unhandled Rejection:', error);
});

// ========== IPC HANDLERS - USUÁRIO ==========

ipcMain.handle('usuario:create', async (_, nome: string, email: string) => {
  try {
    return { success: true, data: db.createUsuario(nome, email) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('usuario:get', async (_, id: number) => {
  try {
    return { success: true, data: db.getUsuario(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('usuario:getByEmail', async (_, email: string) => {
  try {
    return { success: true, data: db.getUsuarioByEmail(email) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ========== IPC HANDLERS - CONTA ==========

ipcMain.handle('conta:create', async (_, conta: Omit<Conta, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    return { success: true, data: db.createConta(conta) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('conta:list', async (_, usuarioId: number) => {
  try {
    return { success: true, data: db.getContas(usuarioId) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('conta:get', async (_, id: number) => {
  try {
    return { success: true, data: db.getConta(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('conta:update', async (_, id: number, updates: Partial<Conta>) => {
  try {
    return { success: true, data: db.updateConta(id, updates) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('conta:delete', async (_, id: number) => {
  try {
    return { success: true, data: db.deleteConta(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ========== IPC HANDLERS - CATEGORIA ==========

ipcMain.handle('categoria:create', async (_, categoria: Omit<Categoria, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    return { success: true, data: db.createCategoria(categoria) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('categoria:list', async (_, usuarioId: number, tipo?: 'receita' | 'despesa') => {
  try {
    return { success: true, data: db.getCategorias(usuarioId, tipo) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('categoria:get', async (_, id: number) => {
  try {
    return { success: true, data: db.getCategoria(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('categoria:update', async (_, id: number, updates: Partial<Categoria>) => {
  try {
    return { success: true, data: db.updateCategoria(id, updates) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('categoria:delete', async (_, id: number) => {
  try {
    return { success: true, data: db.deleteCategoria(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ========== IPC HANDLERS - ORÇAMENTO ==========

ipcMain.handle('orcamento:create', async (_, orcamento: Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    return { success: true, data: db.createOrcamento(orcamento) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('orcamento:list', async (_, usuarioId: number, mes?: number, ano?: number) => {
  try {
    return { success: true, data: db.getOrcamentos(usuarioId, mes, ano) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('orcamento:get', async (_, id: number) => {
  try {
    return { success: true, data: db.getOrcamento(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('orcamento:update', async (_, id: number, updates: Partial<Orcamento>) => {
  try {
    return { success: true, data: db.updateOrcamento(id, updates) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('orcamento:delete', async (_, id: number) => {
  try {
    return { success: true, data: db.deleteOrcamento(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ========== IPC HANDLERS - TRANSAÇÃO ==========

ipcMain.handle('transacao:create', async (_, transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    return { success: true, data: db.createTransacao(transacao) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transacao:list', async (_, usuarioId: number, limit?: number) => {
  try {
    return { success: true, data: db.getTransacoes(usuarioId, limit) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transacao:get', async (_, id: number) => {
  try {
    return { success: true, data: db.getTransacao(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transacao:update', async (_, id: number, updates: Partial<Transacao>) => {
  try {
    return { success: true, data: db.updateTransacao(id, updates) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transacao:delete', async (_, id: number) => {
  try {
    return { success: true, data: db.deleteTransacao(id) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ========== IPC HANDLERS - RELATÓRIOS ==========

ipcMain.handle('relatorio:resumo', async (_, usuarioId: number, dataInicio?: string, dataFim?: string) => {
  try {
    return { success: true, data: db.getResumoFinanceiro(usuarioId, dataInicio, dataFim) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});