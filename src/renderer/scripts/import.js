// src/renderer/scripts/import.js - Lógica de Importação de Extrato Bancário

const ImportManager = {
  currentFile: null,
  parsedData: [],
  contaSelecionada: null,

  // Regras de categorização automática
  categorizationRules: {
    // Alimentação
    alimentacao: [
      'mercado',
      'supermercado',
      'padaria',
      'restaurante',
      'lanche',
      'ifood',
      'uber eats',
      'rappi',
      'mc donald',
      'burger king',
      'subway',
      'pizza',
    ],

    // Transporte
    transporte: [
      'uber',
      '99',
      'taxi',
      'combustivel',
      'gasolina',
      'posto',
      'estacionamento',
      'pedágio',
      'metrô',
      'onibus',
    ],

    // Saúde
    saude: [
      'farmacia',
      'drogaria',
      'hospital',
      'clinica',
      'medico',
      'laboratorio',
      'exame',
      'consulta',
      'plano de saude',
    ],

    // Lazer/Entretenimento
    lazer: [
      'cinema',
      'netflix',
      'spotify',
      'amazon prime',
      'bar',
      'balada',
      'show',
      'teatro',
      'parque',
      'viagem',
    ],

    // Casa/Moradia
    moradia: [
      'aluguel',
      'condominio',
      'agua',
      'luz',
      'energia',
      'gas',
      'internet',
      'telefone',
      'limpeza',
      'manutencao',
    ],

    // Educação
    educacao: ['escola', 'faculdade', 'curso', 'livro', 'material escolar', 'mensalidade'],

    // Vestuário
    vestuario: ['roupa', 'sapato', 'calcado', 'loja', 'shopping', 'zara', 'renner', 'c&a'],

    // Salário
    salario: ['salario', 'vencimento', 'pagamento', 'remuneracao', 'pix recebido'],

    // Investimentos
    investimento: ['aplicacao', 'investimento', 'poupanca', 'cdb', 'tesouro', 'acao'],

    // Outros
    outros: ['saque', 'transferencia', 'ted', 'doc', 'pix'],
  },

  init() {
    this.attachEventListeners();
  },

  attachEventListeners() {
    // Botão de importar na página de transações
    const btnImportarOriginal = document.getElementById('btnImportar');
    if (btnImportarOriginal) {
      btnImportarOriginal.removeEventListener('click', this.openModal);
      btnImportarOriginal.addEventListener('click', () => this.openModal());
    }

    // Fechar modal
    const btnClose = document.getElementById('closeModalImportar');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeModal());
    }

    const btnCancel = document.getElementById('cancelImport');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => this.closeModal());
    }

    // Upload de arquivo
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('importFile');

    fileUploadArea.addEventListener('click', () => {
      if (
        !document.getElementById('fileInfo').style.display ||
        document.getElementById('fileInfo').style.display === 'none'
      ) {
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.querySelector('.upload-placeholder').classList.add('drag-over');
    });

    fileUploadArea.addEventListener('dragleave', () => {
      document.querySelector('.upload-placeholder').classList.remove('drag-over');
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      document.querySelector('.upload-placeholder').classList.remove('drag-over');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processFile(files[0]);
      }
    });

    // Remover arquivo
    const btnRemoveFile = document.getElementById('removeFile');
    if (btnRemoveFile) {
      btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFile();
      });
    }

    // Processar arquivo
    const btnProcessar = document.getElementById('btnProcessarImport');
    if (btnProcessar) {
      btnProcessar.addEventListener('click', () => this.processImport());
    }

    // Voltar
    const btnVoltar = document.getElementById('btnVoltarImport');
    if (btnVoltar) {
      btnVoltar.addEventListener('click', () => this.showStep(1));
    }

    // Confirmar importação
    const btnConfirmar = document.getElementById('btnConfirmarImport');
    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', () => this.confirmImport());
    }

    // Fechar resultado
    const btnFecharResultado = document.getElementById('btnFecharResultado');
    if (btnFecharResultado) {
      btnFecharResultado.addEventListener('click', () => this.closeModal());
    }
  },

  openModal() {
    const modal = document.getElementById('modalImportarExtrato');
    if (!modal) {
      Utils.showError('Modal de importação não encontrado');
      return;
    }

    // Resetar estado
    this.currentFile = null;
    this.parsedData = [];
    this.showStep(1);
    this.removeFile();

    // Atualizar contas
    this.updateContasSelect();

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('modalImportarExtrato');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  updateContasSelect() {
    const select = document.getElementById('importConta');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma conta</option>';

    AppState.contas.forEach((conta) => {
      const option = document.createElement('option');
      option.value = conta.id;
      option.textContent = `${conta.nome} - ${Utils.formatCurrency(conta.saldo)}`;
      select.appendChild(option);
    });
  },

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.processFile(file);
    }
  },

  processFile(file) {
    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      Utils.showError('Arquivo muito grande. Tamanho máximo: 5MB');
      return;
    }

    // Validar extensão
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'ofx') {
      Utils.showError('Formato não suportado. Use apenas arquivos OFX');
      return;
    }

    this.currentFile = file;

    // Atualizar UI
    document.querySelector('.upload-placeholder').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'flex';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = this.formatFileSize(file.size);

    // Habilitar botão de processar
    const contaSelect = document.getElementById('importConta');
    if (contaSelect.value) {
      document.getElementById('btnProcessarImport').disabled = false;
    }

    // Listener para mudança de conta
    contaSelect.addEventListener('change', () => {
      if (contaSelect.value && this.currentFile) {
        document.getElementById('btnProcessarImport').disabled = false;
      } else {
        document.getElementById('btnProcessarImport').disabled = true;
      }
    });
  },

  removeFile() {
    this.currentFile = null;
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('importFile').value = '';
    document.getElementById('btnProcessarImport').disabled = true;
  },

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  async processImport() {
    if (!this.currentFile) {
      Utils.showError('Nenhum arquivo selecionado');
      return;
    }

    const contaId = parseInt(document.getElementById('importConta').value);
    if (!contaId) {
      Utils.showError('Selecione uma conta');
      return;
    }

    this.contaSelecionada = AppState.contas.find((c) => c.id === contaId);

    try {
      console.log('🔄 Iniciando processamento do arquivo:', this.currentFile.name);

      const content = await this.readFile(this.currentFile);
      console.log('✅ Arquivo lido com sucesso');

      console.log('💼 Processando OFX...');
      this.parsedData = this.parseOFX(content);

      console.log(`📋 ${this.parsedData.length} registros extraídos`);

      if (this.parsedData.length === 0) {
        Utils.showWarning('Nenhum registro encontrado no arquivo');
        return;
      }

      // Categorizar automaticamente
      console.log('🤖 Iniciando categorização automática...');
      this.parsedData = this.parsedData.map((item) => {
        const categoria = this.autoCategorize(item.descricao, item.tipo);
        return {
          ...item,
          categoria: categoria,
          autoCategorized: !!categoria,
        };
      });

      const categorizados = this.parsedData.filter((item) => item.categoria).length;
      console.log(
        `✅ ${categorizados} de ${this.parsedData.length} transações categorizadas automaticamente`
      );

      this.showPreview();
      this.showStep(2);
    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      Utils.showError('Erro ao processar arquivo: ' + error.message);
    }
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file);
    });
  },

  parseOFX(content) {
    const data = [];

    // Regex para encontrar transações
    const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = stmttrnRegex.exec(content)) !== null) {
      const transaction = match[1];

      // Extrair campos
      const dateMatch = transaction.match(/<DTPOSTED>(\d{8})/);
      const amountMatch = transaction.match(/<TRNAMT>([-\d.]+)/);
      const memoMatch = transaction.match(/<MEMO>(.*?)</);
      const nameMatch = transaction.match(/<NAME>(.*?)</);

      if (dateMatch && amountMatch) {
        const date = dateMatch[1];
        const amount = parseFloat(amountMatch[1]);
        const description =
          (memoMatch ? memoMatch[1] : '') || (nameMatch ? nameMatch[1] : 'Sem descrição');

        data.push({
          data: `${date.substr(0, 4)}-${date.substr(4, 2)}-${date.substr(6, 2)}`,
          descricao: description.trim(),
          valor: Math.abs(amount),
          tipo: amount >= 0 ? 'receita' : 'despesa',
        });
      }
    }

    return data;
  },

  autoCategorize(description, tipo) {
    if (!description || !tipo) {
      return null;
    }

    const desc = description.toLowerCase();

    // Buscar correspondência nas regras
    for (const [categoriaChave, keywords] of Object.entries(this.categorizationRules)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword.toLowerCase())) {
          // Encontrar categoria no AppState
          // Primeiro tenta match exato com a chave
          let categoriaObj = AppState.categorias.find(
            (c) => c.nome.toLowerCase() === categoriaChave && c.tipo === tipo
          );

          // Se não encontrar, tenta match parcial
          if (!categoriaObj) {
            categoriaObj = AppState.categorias.find(
              (c) => c.nome.toLowerCase().includes(categoriaChave) && c.tipo === tipo
            );
          }

          // Se ainda não encontrar, tenta o inverso
          if (!categoriaObj) {
            categoriaObj = AppState.categorias.find(
              (c) => categoriaChave.includes(c.nome.toLowerCase()) && c.tipo === tipo
            );
          }

          if (categoriaObj) {
            console.log(`✓ Categorizado: "${description}" → ${categoriaObj.nome}`);
            return categoriaObj;
          }
        }
      }
    }

    console.log(`⚠ Sem categoria: "${description}"`);
    return null;
  },

  showPreview() {
    // Atualizar estatísticas
    const total = this.parsedData.length;
    const categorizados = this.parsedData.filter((item) => item.categoria).length;
    const semCategoria = total - categorizados;

    document.getElementById('totalRegistros').textContent = total;
    document.getElementById('totalCategorizados').textContent = categorizados;
    document.getElementById('totalSemCategoria').textContent = semCategoria;

    // Atualizar tabela
    const tbody = document.getElementById('previewTableBody');
    tbody.innerHTML = '';

    // Mostrar apenas primeiros 10 registros
    const preview = this.parsedData.slice(0, 10);

    preview.forEach((item) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
                <td>${Utils.formatDate(item.data)}</td>
                <td>${item.descricao}</td>
                <td>
                    <span class="tipo-badge ${item.tipo}">
                        ${item.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                </td>
                <td style="font-weight: 600; color: ${item.tipo === 'receita' ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${Utils.formatCurrency(item.valor)}
                </td>
                <td>
                    ${
                      item.categoria
                        ? `<span class="categoria-tag auto">${item.categoria.nome} ✓</span>`
                        : `<span class="categoria-tag sem-categoria">Sem categoria</span>`
                    }
                </td>
            `;

      tbody.appendChild(tr);
    });

    if (this.parsedData.length > 10) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
                <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 15px;">
                    ... e mais ${this.parsedData.length - 10} registros
                </td>
            `;
      tbody.appendChild(tr);
    }
  },

  async confirmImport() {
    this.showStep(3);

    let importados = 0;
    let categorizados = 0;
    let ignorados = 0;

    try {
      console.log(`🚀 Iniciando importação de ${this.parsedData.length} transações...`);

      for (let i = 0; i < this.parsedData.length; i++) {
        const item = this.parsedData[i];

        // Atualizar progresso
        const progress = ((i + 1) / this.parsedData.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${Math.round(progress)}%`;

        // Criar transação
        const transacao = {
          descricao: item.descricao,
          valor: item.valor,
          tipo: item.tipo,
          data: item.data,
          conta_id: this.contaSelecionada.id,
          categoria_id: item.categoria ? item.categoria.id : null,
          usuario_id: AppState.currentUser.id,
          observacoes: 'Importado via arquivo ' + this.currentFile.name,
        };

        // Se não tem categoria, usar primeira categoria do tipo correspondente
        if (!transacao.categoria_id) {
          const categoriaDefault = AppState.categorias.find((c) => c.tipo === item.tipo);
          if (categoriaDefault) {
            transacao.categoria_id = categoriaDefault.id;
            console.log(
              `📌 Usando categoria padrão "${categoriaDefault.nome}" para: ${item.descricao}`
            );
          }
        }

        // Importar mesmo sem categoria (se não encontrar nenhuma categoria do tipo)
        if (transacao.categoria_id) {
          const response = await window.api.transacao.create(transacao);

          if (response.success) {
            importados++;
            if (item.categoria) {
              categorizados++;
            }
          } else {
            console.error('❌ Erro ao importar:', response.error);
          }
        } else {
          console.warn('⚠ Transação ignorada - nenhuma categoria disponível:', item.descricao);
          ignorados++;
        }

        // Pequeno delay para não sobrecarregar
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log(`✅ Importação concluída: ${importados} importadas, ${ignorados} ignoradas`);

      // Recarregar dados
      await DataManager.loadAll();

      // Mostrar resultado
      document.getElementById('importadosCount').textContent = importados;
      document.getElementById('categorizadosCount').textContent = categorizados;

      if (ignorados > 0) {
        Utils.showWarning(
          `${ignorados} transações foram ignoradas por falta de categoria do tipo correspondente. Crie categorias de Receita/Despesa e tente novamente.`
        );
      }

      this.showStep(4);

      // Atualizar páginas
      if (typeof TransacoesPage !== 'undefined') {
        TransacoesPage.render();
      }
      if (typeof DashboardPage !== 'undefined') {
        DashboardPage.render();
      }
    } catch (error) {
      console.error('❌ Erro ao importar:', error);

      document.getElementById('resultIcon').classList.remove('success');
      document.getElementById('resultIcon').classList.add('error');
      document.getElementById('resultIcon').textContent = '✕';
      document.getElementById('resultTitle').textContent = 'Erro na importação';
      document.getElementById('importadosCount').textContent = importados;
      document.getElementById('categorizadosCount').textContent = categorizados;

      this.showStep(4);

      Utils.showError('Erro durante a importação: ' + error.message);
    }
  },

  showStep(step) {
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`step${i}`);
      if (stepEl) {
        stepEl.style.display = i === step ? 'block' : 'none';
      }
    }
  },
};

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ImportManager.init());
} else {
  ImportManager.init();
}
