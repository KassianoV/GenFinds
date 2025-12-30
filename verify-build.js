// verify-build.js - Script para verificar se o build foi gerado corretamente
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✓' : '✗';
  const color = exists ? 'green' : 'red';
  log(`${status} ${description}: ${filePath}`, color);
  return exists;
}

function checkFileSize(filePath, description) {
  if (!fs.existsSync(filePath)) {
    log(`✗ ${description} não encontrado: ${filePath}`, 'red');
    return false;
  }

  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  log(`✓ ${description}: ${filePath} (${sizeKB} KB)`, 'green');
  return true;
}

async function verifyBuild() {
  log('\n=== Verificação do Build do GenFins ===\n', 'blue');

  let allChecksPass = true;

  // 1. Verificar estrutura de diretórios
  log('1. Verificando estrutura de diretórios:', 'yellow');
  allChecksPass &= checkExists(path.join(__dirname, 'dist'), 'Diretório dist');
  allChecksPass &= checkExists(path.join(__dirname, 'dist', 'main'), 'Diretório dist/main');
  allChecksPass &= checkExists(path.join(__dirname, 'dist', 'database'), 'Diretório dist/database');
  allChecksPass &= checkExists(path.join(__dirname, 'dist', 'preload'), 'Diretório dist/preload');
  allChecksPass &= checkExists(path.join(__dirname, 'assets'), 'Diretório assets');

  // 2. Verificar arquivos JavaScript compilados
  log('\n2. Verificando arquivos compilados:', 'yellow');
  allChecksPass &= checkFileSize(path.join(__dirname, 'dist', 'main', 'main.js'), 'Main process');
  allChecksPass &= checkFileSize(path.join(__dirname, 'dist', 'database', 'database.js'), 'Database manager');
  allChecksPass &= checkFileSize(path.join(__dirname, 'dist', 'preload', 'preload.js'), 'Preload script');

  // 3. Verificar arquivos de ícone
  log('\n3. Verificando ícones:', 'yellow');
  allChecksPass &= checkFileSize(path.join(__dirname, 'assets', 'icon.ico'), 'Ícone principal (.ico)');
  allChecksPass &= checkFileSize(path.join(__dirname, 'assets', 'icon.png'), 'Ícone PNG');

  // Verificar ícones em múltiplas resoluções
  const iconSizes = [16, 32, 48, 64, 128, 256];
  const iconsDir = path.join(__dirname, 'assets', 'icons');

  if (fs.existsSync(iconsDir)) {
    log('\n   Verificando ícones em múltiplas resoluções:', 'yellow');
    for (const size of iconSizes) {
      const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      allChecksPass &= checkExists(iconPath, `   Ícone ${size}x${size}`);
    }
  } else {
    log('✗ Diretório assets/icons não encontrado', 'red');
    log('   Execute: npm run generate-icons', 'yellow');
    allChecksPass = false;
  }

  // 4. Verificar arquivos do renderer
  log('\n4. Verificando arquivos do renderer:', 'yellow');
  allChecksPass &= checkExists(path.join(__dirname, 'src', 'renderer', 'index.html'), 'HTML principal');
  allChecksPass &= checkExists(path.join(__dirname, 'src', 'renderer', 'styles'), 'Diretório styles');
  allChecksPass &= checkExists(path.join(__dirname, 'src', 'renderer', 'scripts'), 'Diretório scripts');

  // Verificar alguns arquivos CSS principais
  const mainCss = path.join(__dirname, 'src', 'renderer', 'styles', 'main.css');
  if (fs.existsSync(mainCss)) {
    log('✓ Arquivo CSS principal encontrado', 'green');
  }

  // 5. Verificar package.json
  log('\n5. Verificando configuração:', 'yellow');
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (checkExists(packageJsonPath, 'package.json')) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (packageJson.main === 'dist/main/main.js') {
      log('✓ Entry point correto: dist/main/main.js', 'green');
    } else {
      log(`✗ Entry point incorreto: ${packageJson.main}`, 'red');
      log('   Deveria ser: dist/main/main.js', 'yellow');
      allChecksPass = false;
    }

    if (packageJson.build && packageJson.build.win && packageJson.build.win.icon) {
      log(`✓ Ícone configurado no build: ${packageJson.build.win.icon}`, 'green');

      // Verificar se o arquivo de ícone configurado existe
      const configuredIconPath = path.join(__dirname, packageJson.build.win.icon);
      if (fs.existsSync(configuredIconPath)) {
        log('✓ Arquivo de ícone configurado existe', 'green');
      } else {
        log('✗ Arquivo de ícone configurado NÃO existe', 'red');
        allChecksPass = false;
      }
    } else {
      log('✗ Ícone não configurado no electron-builder', 'red');
      allChecksPass = false;
    }
  }

  // 6. Verificar tamanho do ícone .ico
  log('\n6. Verificando detalhes do ícone .ico:', 'yellow');
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  if (fs.existsSync(icoPath)) {
    const stats = fs.statSync(icoPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    if (stats.size > 0) {
      log(`✓ Tamanho do icon.ico: ${sizeKB} KB`, 'green');

      // Verificar se o tamanho é razoável (arquivos .ico válidos geralmente têm pelo menos 1KB)
      if (stats.size < 1024) {
        log('⚠ AVISO: Arquivo .ico muito pequeno. Pode estar corrompido.', 'yellow');
        log('   Recomendação: Regenere o ícone usando uma ferramenta adequada', 'yellow');
      }
    } else {
      log('✗ Arquivo icon.ico está vazio!', 'red');
      allChecksPass = false;
    }
  }

  // Resultado final
  log('\n=== Resultado da Verificação ===\n', 'blue');

  if (allChecksPass) {
    log('✓ SUCESSO: Todas as verificações passaram!', 'green');
    log('O build está pronto para ser empacotado.\n', 'green');
    process.exit(0);
  } else {
    log('✗ FALHA: Algumas verificações falharam.', 'red');
    log('\nAções recomendadas:', 'yellow');
    log('1. Execute: npm run build', 'yellow');
    log('2. Execute: npm run generate-icons', 'yellow');
    log('3. Verifique se o arquivo assets/icon.ico é válido', 'yellow');
    log('4. Se necessário, converta assets/icon.png para .ico usando:');
    log('   https://www.icoconverter.com/ ou https://convertio.co/png-ico/\n', 'yellow');
    process.exit(1);
  }
}

verifyBuild().catch(error => {
  log(`\n✗ ERRO: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
