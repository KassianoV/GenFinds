// test-icon.js - Script para testar se o ícone está sendo carregado corretamente
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('\n=== Teste de Ícone do GenFins ===\n');

// Caminhos possíveis do ícone
const iconPaths = {
  development: path.join(__dirname, 'assets', 'icon.ico'),
  production: process.resourcesPath ? path.join(process.resourcesPath, 'assets', 'icon.ico') : 'N/A (não empacotado)',
  alternativePng: path.join(__dirname, 'assets', 'icon.png')
};

console.log('Ambiente:', process.env.NODE_ENV || 'development');
console.log('__dirname:', __dirname);
console.log('process.resourcesPath:', process.resourcesPath || 'N/A (modo desenvolvimento)');
console.log('\nVerificando caminhos de ícone:\n');

// Verificar cada caminho
for (const [name, iconPath] of Object.entries(iconPaths)) {
  if (iconPath === 'N/A (não empacotado)') {
    console.log(`⚠ ${name}:`);
    console.log(`   ${iconPath}`);
    console.log('');
    continue;
  }

  const exists = fs.existsSync(iconPath);
  const status = exists ? '✓' : '✗';
  console.log(`${status} ${name}:`);
  console.log(`   ${iconPath}`);

  if (exists) {
    const stats = fs.statSync(iconPath);
    console.log(`   Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
  }
  console.log('');
}

// Determinar qual ícone usar (mesma lógica do main.ts)
const iconPath = (process.env.NODE_ENV === 'production' && process.resourcesPath)
  ? path.join(process.resourcesPath, 'assets', 'icon.ico')
  : path.join(__dirname, 'assets', 'icon.ico');

console.log('Ícone selecionado para uso:');
console.log(`   ${iconPath}`);
console.log(`   Existe: ${fs.existsSync(iconPath) ? 'SIM' : 'NÃO'}\n`);

function createWindow() {
  console.log('Criando janela de teste com o ícone...\n');

  const win = new BrowserWindow({
    width: 400,
    height: 300,
    icon: iconPath,
    title: 'Teste de Ícone - GenFins',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Criar uma página HTML simples
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Teste de Ícone</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          h1 { margin: 0; font-size: 24px; }
          p { margin: 10px 0; font-size: 14px; }
          .info {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          .success { color: #4ade80; }
          .path {
            font-family: monospace;
            font-size: 11px;
            word-break: break-all;
            margin-top: 10px;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div class="info">
          <h1>🎨 Teste de Ícone</h1>
          <p class="success">✓ Janela criada com sucesso!</p>
          <p>Verifique se o ícone aparece:</p>
          <ul style="text-align: left; font-size: 13px;">
            <li>Na barra de título da janela</li>
            <li>Na barra de tarefas</li>
            <li>Ao Alt+Tab (Windows)</li>
          </ul>
          <p class="path">Caminho do ícone:<br>${iconPath}</p>
          <p class="path">Existe: ${fs.existsSync(iconPath) ? 'SIM ✓' : 'NÃO ✗'}</p>
        </div>
      </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Manter a janela aberta por 10 segundos
  setTimeout(() => {
    console.log('Fechando janela de teste...');
    app.quit();
  }, 10000);
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

console.log('Janela de teste será aberta por 10 segundos.');
console.log('Verifique se o ícone aparece corretamente.\n');
