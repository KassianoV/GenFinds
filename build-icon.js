// build-icon.js - Script para gerar ícones em múltiplas resoluções
const sharp = require('sharp');
const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const inputImage = path.join(__dirname, 'assets', 'icon.png');
  const outputDir = path.join(__dirname, 'assets', 'icons');
  const assetsDir = path.join(__dirname, 'assets');

  // Criar diretório se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 Gerando ícones em múltiplas resoluções...\n');

  // Verificar se a imagem de origem existe
  if (!fs.existsSync(inputImage)) {
    console.error(`❌ Erro: Arquivo ${inputImage} não encontrado!`);
    console.log('   Certifique-se de que existe um arquivo icon.png na pasta assets/');
    process.exit(1);
  }

  // Gerar PNGs em diferentes tamanhos
  const pngFiles = [];
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(inputImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(outputPath);
    pngFiles.push(outputPath);
    console.log(`✓ Gerado: icon-${size}x${size}.png`);
  }

  // Gerar icon.png (256x256) na raiz de assets
  const iconPngPath = path.join(assetsDir, 'icon.png');
  await sharp(inputImage)
    .resize(256, 256, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(iconPngPath);
  console.log(`✓ Gerado: icon.png (256x256)`);

  console.log('\n🔄 Gerando arquivo .ico com múltiplas resoluções...\n');

  try {
    // Converter PNGs para um único arquivo .ico
    const icoBuffer = await pngToIco(pngFiles);
    const icoPath = path.join(assetsDir, 'icon.ico');

    fs.writeFileSync(icoPath, icoBuffer);

    // Verificar tamanho do arquivo gerado
    const stats = fs.statSync(icoPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`✓ Arquivo .ico gerado com sucesso!`);
    console.log(`  Caminho: ${icoPath}`);
    console.log(`  Tamanho: ${sizeKB} KB`);
    console.log(`  Resoluções: ${sizes.join('x, ')}x`);

    console.log('\n✅ Todos os ícones foram gerados com sucesso!');
    console.log('   Você já pode fazer o build da aplicação.');

  } catch (error) {
    console.error('\n❌ Erro ao gerar arquivo .ico:', error.message);
    console.log('\n⚠️  Os PNGs foram gerados, mas o .ico falhou.');
    console.log('   Use uma ferramenta online para converter:');
    console.log('   - https://www.icoconverter.com/');
    console.log('   - https://convertio.co/png-ico/');
    process.exit(1);
  }
}

generateIcons().catch(error => {
  console.error('\n❌ Erro:', error.message);
  console.error(error);
  process.exit(1);
});