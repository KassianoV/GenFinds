// test/setup.ts
import '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Caminho do diretório de teste
const testDir = path.join(__dirname, '..', 'temp-test');

// Configuração global para testes
beforeAll(() => {
  // Garantir que o diretório temporário existe
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
});

afterAll(() => {
  // Limpar diretório temporário após todos os testes
  if (fs.existsSync(testDir)) {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Erro ao limpar diretório de testes:', error);
    }
  }
});

// Limpar entre cada teste também
beforeEach(() => {
  // Garantir que o diretório existe antes de cada teste
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
});

afterEach(() => {
  // Limpar arquivos de banco de dados entre testes
  try {
    const dbFile = path.join(testDir, 'financas.db');
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
  } catch (error) {
    // Ignorar erros de limpeza
  }
});

// Mock do electron app
jest.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      return testDir;
    }
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn()
  }
}));

// Configurar timeout padrão
jest.setTimeout(10000);