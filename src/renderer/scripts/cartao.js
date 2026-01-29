// src/renderer/scripts/cartao.js

const CartaoPage = {
  currentTab: 'fatura',
  cartoes: [],
  currentEditId: null,
  currentEditCompraId: null,
  faturaAtual: null,
  parcelas: [],
  transacoesCartao: [],
  // Variáveis para importação de fatura
  currentFileFatura: null,
  parsedDataFatura: [],
  cartaoSelecionadoFatura: null,
  // Flag para evitar duplicação de event listeners
  _initialized: false,
  // Paginação da fatura
  faturaPaginaAtual: 1,
  faturaItensPorPagina: 10,
  // Paginação das parcelas
  parcelasPaginaAtual: 1,
  parcelasItensPorPagina: 10,
  // Filtro de parcelas por cartão
  parcelasFiltroCartao: null,

  init() {
    // Evitar duplicação de event listeners
    if (this._initialized) {
      // Apenas recarregar dados se já inicializado
      this.loadCartoes();
      return;
    }

    this.attachEventListeners();
    this.attachImportFaturaEventListeners();
    this.loadCartoes();
    this.initFaturaTab();
    this.initParcelaTab();

    // Marcar como inicializado
    this._initialized = true;
  },

  attachEventListeners() {
    // Tabs
    const tabBtns = document.querySelectorAll('.cartao-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Formulário de Lançamento À Vista (Fatura)
    const formFaturaCompra = document.getElementById('formFaturaCompra');
    if (formFaturaCompra) {
      formFaturaCompra.addEventListener('submit', (e) => this.handleFaturaCompraSubmit(e));
    }

    // Formulário de Lançamento Parcelado (Parcelas)
    const formParcelaCompra = document.getElementById('formParcelaCompra');
    if (formParcelaCompra) {
      formParcelaCompra.addEventListener('submit', (e) => this.handleParcelaCompraSubmit(e));
    }

    // Calcular valor da parcela automaticamente
    const parcelaCompraParcelas = document.getElementById('parcelaCompraParcelas');
    const parcelaCompraValor = document.getElementById('parcelaCompraValor');
    const parcelaCompraValorParcela = document.getElementById('parcelaCompraValorParcela');

    if (parcelaCompraParcelas && parcelaCompraValor && parcelaCompraValorParcela) {
      const calcularValorParcela = () => {
        const valor = parseFloat(parcelaCompraValor.value) || 0;
        const parcelas = parseInt(parcelaCompraParcelas.value) || 1;
        const valorParcela = valor / parcelas;
        parcelaCompraValorParcela.value = valorParcela > 0 ? Utils.formatCurrency(valorParcela) : '';
      };

      parcelaCompraParcelas.addEventListener('change', calcularValorParcela);
      parcelaCompraValor.addEventListener('input', calcularValorParcela);
    }

    // Botão Consultar Fatura
    const btnConsultarFatura = document.getElementById('btnConsultarFatura');
    if (btnConsultarFatura) {
      btnConsultarFatura.addEventListener('click', () => this.consultarFatura());
    }

    // Event listeners para filtros de mês e ano na aba Fatura
    const faturaMesSelect = document.getElementById('faturaMesSelect');
    const faturaAnoSelect = document.getElementById('faturaAnoSelect');

    if (faturaMesSelect) {
      faturaMesSelect.addEventListener('change', () => {
        const mes = parseInt(faturaMesSelect.value);
        const ano = faturaAnoSelect ? parseInt(faturaAnoSelect.value) : null;
        this.renderFaturaCartoes(mes, ano);
      });
    }

    if (faturaAnoSelect) {
      faturaAnoSelect.addEventListener('change', () => {
        const mes = faturaMesSelect ? parseInt(faturaMesSelect.value) : null;
        const ano = parseInt(faturaAnoSelect.value);
        this.renderFaturaCartoes(mes, ano);
      });
    }

    // Removido: formulário de adicionar parcela (agora só exibe compras parceladas existentes)
  },

  switchTab(tabName) {
    // Remover active de todos os botões e conteúdos
    document.querySelectorAll('.cartao-tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.cartao-tab-content').forEach((content) => {
      content.classList.remove('active');
    });

    // Adicionar active ao botão e conteúdo selecionado
    const selectedBtn = document.querySelector(`.cartao-tab-btn[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`tab-cartao-${tabName}`);

    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');

    this.currentTab = tabName;

    // Recarregar dados da aba selecionada
    if (tabName === 'parcela') {
      this.loadParcelas();
    } else if (tabName === 'fatura') {
      // Pegar valores atuais dos filtros
      const mesSelect = document.getElementById('faturaMesSelect');
      const anoSelect = document.getElementById('faturaAnoSelect');
      const mes = mesSelect ? parseInt(mesSelect.value) : null;
      const ano = anoSelect ? parseInt(anoSelect.value) : null;
      this.renderFaturaCartoes(mes, ano);
    }
  },

  async handleCartaoSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const nome = document.getElementById('cartaoNome').value.trim();
    const valor = parseFloat(document.getElementById('cartaoValor').value) || 0;
    const vencimento = parseInt(document.getElementById('cartaoVencimento').value);

    // Validações
    if (!nome) {
      Utils.showWarning('Por favor, preencha o nome do cartão');
      return;
    }

    if (vencimento < 1 || vencimento > 31) {
      Utils.showWarning('Data de vencimento deve ser entre 1 e 31');
      return;
    }

    try {
      const cartao = {
        usuario_id: AppState.currentUser.id,
        nome,
        valor,
        vencimento,
        status: 'aberta', // Status padrão
      };

      const result = await window.api.cartao.create(cartao);

      if (result.success) {
        Utils.showSuccess('Cartão adicionado com sucesso!');
        document.getElementById('formCartao').reset();
        this.loadCartoes();
      } else {
        Utils.showError(result.error || 'Erro ao adicionar cartão');
      }
    } catch (error) {
      console.error('Erro ao adicionar cartão:', error);
      Utils.showError('Erro ao adicionar cartão');
    }
  },

  // Lançar Compra À Vista (Fatura)
  async handleFaturaCompraSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const descricao = document.getElementById('faturaCompraDescricao').value.trim();
    const valor = parseFloat(document.getElementById('faturaCompraValor').value);
    const data = document.getElementById('faturaCompraData').value;
    const cartaoId = parseInt(document.getElementById('faturaCompraCartao').value);
    const categoriaId = document.getElementById('faturaCompraCategoria').value;

    // Validações
    if (!descricao) {
      Utils.showWarning('Por favor, preencha a descrição');
      return;
    }

    if (!valor || valor <= 0) {
      Utils.showWarning('Por favor, preencha um valor válido');
      return;
    }

    if (!data) {
      Utils.showWarning('Por favor, selecione a data');
      return;
    }

    if (!cartaoId) {
      Utils.showWarning('Por favor, selecione um cartão');
      return;
    }

    try {
      const transacao = {
        usuario_id: AppState.currentUser.id,
        descricao,
        valor,
        data,
        cartao_id: cartaoId,
        categoria_id: categoriaId || null,
        parcelas: 1, // À VISTA
        parcela_atual: 1,
        grupo_parcelamento: null,
        observacoes: null
      };

      const result = await window.api.transacaoCartao.create(transacao);

      if (result.success) {
        Utils.showSuccess('Compra lançada com sucesso!');
        document.getElementById('formFaturaCompra').reset();
        this.loadCartoes();
      } else {
        Utils.showError(result.error || 'Erro ao lançar compra');
      }
    } catch (error) {
      console.error('Erro ao lançar compra:', error);
      Utils.showError('Erro ao lançar compra');
    }
  },

  // Lançar Compra Parcelada (Parcelas)
  async handleParcelaCompraSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const descricao = document.getElementById('parcelaCompraDescricao').value.trim();
    const valor = parseFloat(document.getElementById('parcelaCompraValor').value);
    const data = document.getElementById('parcelaCompraData').value;
    const cartaoId = parseInt(document.getElementById('parcelaCompraCartao').value);
    const categoriaId = document.getElementById('parcelaCompraCategoria').value;
    const parcelas = parseInt(document.getElementById('parcelaCompraParcelas').value);

    // Validações
    if (!descricao) {
      Utils.showWarning('Por favor, preencha a descrição');
      return;
    }

    if (!valor || valor <= 0) {
      Utils.showWarning('Por favor, preencha um valor válido');
      return;
    }

    if (!data) {
      Utils.showWarning('Por favor, selecione a data');
      return;
    }

    if (!cartaoId) {
      Utils.showWarning('Por favor, selecione um cartão');
      return;
    }

    if (!parcelas || parcelas < 2) {
      Utils.showWarning('Por favor, selecione o número de parcelas (mínimo 2x)');
      return;
    }

    try {
      const transacao = {
        usuario_id: AppState.currentUser.id,
        descricao,
        valor,
        data,
        cartao_id: cartaoId,
        categoria_id: categoriaId || null,
        parcelas: 1, // Vai ser sobrescrito pela API
        observacoes: null
      };

      const result = await window.api.transacaoCartao.createParcelada(transacao, parcelas);

      if (result.success) {
        Utils.showSuccess(`Compra parcelada em ${parcelas}x lançada com sucesso!`);
        document.getElementById('formParcelaCompra').reset();
        document.getElementById('parcelaCompraValorParcela').value = '';
        this.loadCartoes();
        this.loadParcelas();
      } else {
        Utils.showError(result.error || 'Erro ao lançar compra parcelada');
      }
    } catch (error) {
      console.error('Erro ao lançar compra parcelada:', error);
      Utils.showError('Erro ao lançar compra parcelada');
    }
  },

  async loadCartoes() {
    if (!AppState.currentUser) return;

    try {
      const result = await window.api.cartao.list(AppState.currentUser.id);

      if (result.success) {
        this.cartoes = result.data || [];
        this.renderCartoes();
        this.populateCartaoDropdown();
        this.renderFaturaCartoes();

        // Recarregar parcelas se estiver na aba de parcelas
        if (this.currentTab === 'parcela') {
          this.loadParcelas();
        }
      } else {
        console.error('Erro ao carregar cartões:', result.error);
        Utils.showError('Erro ao carregar cartões');
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
      Utils.showError('Erro ao carregar cartões');
    }
  },

  async renderCartoes() {
    // A lista de cartões cadastrados agora é renderizada em ConfigurarPage
    // Esta função agora apenas dispara um evento para atualizar a lista em Configurar
    if (typeof ConfigurarPage !== 'undefined' && ConfigurarPage.renderCartoes) {
      ConfigurarPage.renderCartoes();
    }
  },

  // Função legada mantida para compatibilidade interna
  async renderCartoesInterno() {
    const emptyState = document.getElementById('cartoesEmpty');
    const cartoesList = document.getElementById('cartoesList');

    // Verificar se os elementos existem (podem estar em Configurar agora)
    if (!emptyState || !cartoesList) return;

    if (this.cartoes.length === 0) {
      emptyState.style.display = 'block';
      cartoesList.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    cartoesList.style.display = 'block';

    // Calcular valores mensais e status para cada cartão
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1; // 1-12
    const anoAtual = hoje.getFullYear();

    const cartoesComValorMensal = await Promise.all(
      this.cartoes.map(async (cartao) => {
        const valoresDetalhados = await this.calcularValorFaturaMesDetalhado(cartao.id, mesAtual, anoAtual);
        const statusAtualizado = this.calcularStatusAutomatico(cartao);
        return {
          ...cartao,
          valorMesAtual: valoresDetalhados.total,
          valorAVista: valoresDetalhados.aVista,
          valorParcelado: valoresDetalhados.parcelado,
          statusAtualizado,
        };
      })
    );

    cartoesList.innerHTML = cartoesComValorMensal
      .map((cartao) => this.createCartaoCard(cartao))
      .join('');

    // Anexar event listeners aos botões de ação
    this.attachCartaoActionListeners();
  },

  createCartaoCard(cartao) {
    // Exibir apenas o valor da fatura do mês atual (faturas à vista + parcelas do mês)
    const valorExibir = cartao.valorMesAtual || 0;
    const valorFormatado = this.formatCurrency(valorExibir);

    // Valores detalhados
    const valorAVista = cartao.valorAVista || 0;
    const valorParcelado = cartao.valorParcelado || 0;

    // Usar statusAtualizado se disponível, senão usar status padrão
    const statusClass = cartao.statusAtualizado || cartao.status || 'aberta';
    const statusText = this.getStatusText(statusClass);

    // Obter nome do mês atual para exibição
    const hoje = new Date();
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mesAtualNome = meses[hoje.getMonth()];

    // Criar detalhamento se houver valores
    let detalhamento = '';
    if (cartao.valorMesAtual !== undefined && (valorAVista > 0 || valorParcelado > 0)) {
      detalhamento = `<span style="font-size: 0.75em; color: var(--text-secondary); display: block; margin-top: 4px;">Fatura de ${mesAtualNome}</span>`;
      detalhamento += `<span style="font-size: 0.7em; color: var(--text-secondary); display: block; margin-top: 2px;">À vista: ${this.formatCurrency(valorAVista)} | Parcelado: ${this.formatCurrency(valorParcelado)}</span>`;
    }

    return `
      <div class="cartao-card" data-id="${cartao.id}">
        <div class="cartao-info">
          <div class="cartao-nome">
            <span class="icon">💳</span>
            ${cartao.nome}
          </div>
          <div class="cartao-valor ${statusClass}">
            ${valorFormatado}
            ${detalhamento}
          </div>
          <div class="cartao-vencimento">
            Vence dia: ${cartao.vencimento} de cada mês
          </div>
          <div class="cartao-status ${statusClass}">
            <span class="cartao-status-dot"></span>
            ${statusText}
          </div>
        </div>
        <div class="cartao-actions">
          <button class="btn-cartao-action btn-cartao-edit" data-id="${cartao.id}">
            ✏️ Editar
          </button>
          <button class="btn-cartao-action btn-cartao-delete" data-id="${cartao.id}">
            🗑️ Remover
          </button>
        </div>
      </div>
    `;
  },

  attachCartaoActionListeners() {
    // Botões de Editar
    document.querySelectorAll('.btn-cartao-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.editCartao(id);
      });
    });

    // Botões de Remover
    document.querySelectorAll('.btn-cartao-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.deleteCartao(id);
      });
    });
  },

  async editCartao(id) {
    const cartao = this.cartoes.find((c) => c.id === id);
    if (!cartao) {
      Utils.showError('Cartão não encontrado');
      return;
    }

    this.currentEditId = id;

    // Preencher o formulário de edição
    document.getElementById('editCartaoId').value = cartao.id;
    document.getElementById('editCartaoNome').value = cartao.nome;
    document.getElementById('editCartaoValor').value = cartao.valor;
    document.getElementById('editCartaoVencimento').value = cartao.vencimento;
    document.getElementById('editCartaoStatus').value = cartao.status;

    // Abrir o modal
    this.openEditModal();
  },

  openEditModal() {
    const modal = document.getElementById('modalEditarCartao');
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeEditModal() {
    const modal = document.getElementById('modalEditarCartao');
    if (modal) {
      modal.classList.remove('active');
    }
    this.currentEditId = null;
    document.getElementById('formEditarCartao').reset();
  },

  async handleEditSubmit(e) {
    e.preventDefault();

    if (!this.currentEditId) {
      Utils.showError('Erro ao identificar cartão');
      return;
    }

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const nome = document.getElementById('editCartaoNome').value.trim();
    const valor = parseFloat(document.getElementById('editCartaoValor').value);
    const vencimento = parseInt(document.getElementById('editCartaoVencimento').value);
    const status = document.getElementById('editCartaoStatus').value;

    // Validações
    if (!nome) {
      Utils.showWarning('Por favor, preencha o nome do cartão');
      return;
    }

    if (vencimento < 1 || vencimento > 31) {
      Utils.showWarning('Data de vencimento deve ser entre 1 e 31');
      return;
    }

    try {
      const updates = {
        nome,
        valor,
        vencimento,
        status,
      };

      const result = await window.api.cartao.update(this.currentEditId, AppState.currentUser.id, updates);

      if (result.success) {
        Utils.showSuccess('Cartão atualizado com sucesso!');
        this.closeEditModal();
        this.loadCartoes();
      } else {
        Utils.showError(result.error || 'Erro ao atualizar cartão');
      }
    } catch (error) {
      console.error('Erro ao editar cartão:', error);
      Utils.showError('Erro ao editar cartão');
    }
  },

  async deleteCartao(id) {
    const cartao = this.cartoes.find((c) => c.id === id);
    if (!cartao) return;

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    if (!Utils.confirm(`Tem certeza que deseja remover o cartão "${cartao.nome}"? Todas as transações deste cartão também serão removidas.`)) {
      return;
    }

    try {
      // Primeiro, buscar todas as transações do cartão
      const transacoesResult = await window.api.transacaoCartao.list(AppState.currentUser.id);

      if (transacoesResult.success) {
        const transacoesDoCartao = (transacoesResult.data || []).filter(t => t.cartao_id === id);

        // Deletar todas as transações do cartão
        for (const transacao of transacoesDoCartao) {
          await window.api.transacaoCartao.delete(transacao.id, AppState.currentUser.id);
        }
      }

      // Depois, deletar o cartão
      const result = await window.api.cartao.delete(id, AppState.currentUser.id);

      if (result.success) {
        Utils.showSuccess('Cartão e suas transações removidos com sucesso!');
        this.loadCartoes();
        // Recarregar parcelas se estiver na aba de parcelas
        if (this.currentTab === 'parcela') {
          this.loadParcelas();
        }
        // Recarregar fatura se estiver na aba de fatura
        if (this.currentTab === 'fatura') {
          this.faturaAtual = null;
          this.renderFatura();
        }
      } else {
        Utils.showError(result.error || 'Erro ao remover cartão');
      }
    } catch (error) {
      console.error('Erro ao remover cartão:', error);
      Utils.showError('Erro ao remover cartão');
    }
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  },

  getStatusText(status) {
    const statusMap = {
      aberta: 'Aberta',
      fechada: 'Fechada',
      paga: 'Paga',
      pendente: 'Pendente',
    };
    return statusMap[status] || 'Aberta';
  },

  /**
   * Calcula o status automático do cartão baseado na data atual e vencimento
   * @param {Object} cartao - Objeto do cartão
   * @returns {string} - Status calculado ('aberta', 'fechada', 'pendente')
   */
  calcularStatusAutomatico(cartao) {
    // Se já está paga, mantém como paga
    if (cartao.status === 'paga') {
      return 'paga';
    }

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesAtual = hoje.getMonth() + 1; // 1-12
    const anoAtual = hoje.getFullYear();

    const diaVencimento = cartao.vencimento;

    // Calcular data de fechamento (6 dias antes do vencimento)
    const diaFechamento = diaVencimento - 6;

    // Se o dia de fechamento for negativo, ajustar para mês anterior
    let diaFechamentoAjustado = diaFechamento;
    if (diaFechamento <= 0) {
      // Fechamento está no mês anterior
      const ultimoDiaMesAnterior = new Date(anoAtual, mesAtual - 1, 0).getDate();
      diaFechamentoAjustado = ultimoDiaMesAnterior + diaFechamento;
    }

    // Determinar status
    if (diaHoje >= diaFechamentoAjustado && diaHoje < diaVencimento) {
      // Entre fechamento e vencimento → Fechada
      return 'fechada';
    } else if (diaHoje >= diaVencimento) {
      // Passou do vencimento → Pendente (se não foi paga)
      return 'pendente';
    } else {
      // Antes do fechamento → Aberta
      return 'aberta';
    }
  },

  /**
   * Calcula o valor da fatura do cartão para um mês específico
   * @param {number} cartaoId - ID do cartão
   * @param {number} mes - Mês (1-12)
   * @param {number} ano - Ano
   * @returns {Promise<number>} - Valor total da fatura
   */
  async calcularValorFaturaMes(cartaoId, mes, ano) {
    if (!AppState.currentUser) return 0;
    try {
      const result = await window.api.transacaoCartao.list(AppState.currentUser.id, cartaoId,
        mes,
        ano
      );

      if (result.success) {
        const transacoes = result.data || [];
        return transacoes.reduce((total, t) => total + t.valor, 0);
      }
      return 0;
    } catch (error) {
      console.error('Erro ao calcular valor da fatura:', error);
      return 0;
    }
  },

  /**
   * Calcula o valor da fatura detalhado (à vista e parcelado) para um mês específico
   * @param {number} cartaoId - ID do cartão
   * @param {number} mes - Mês (1-12)
   * @param {number} ano - Ano
   * @returns {Promise<{total: number, aVista: number, parcelado: number}>} - Valores detalhados
   */
  async calcularValorFaturaMesDetalhado(cartaoId, mes, ano) {
    if (!AppState.currentUser) return { total: 0, aVista: 0, parcelado: 0 };
    try {
      const result = await window.api.transacaoCartao.list(AppState.currentUser.id, cartaoId,
        mes,
        ano
      );

      if (result.success) {
        const transacoes = result.data || [];
        let aVista = 0;
        let parcelado = 0;

        transacoes.forEach(t => {
          if (t.parcelas === 1) {
            // Compra à vista
            aVista += t.valor;
          } else {
            // Compra parcelada
            parcelado += t.valor;
          }
        });

        return {
          total: aVista + parcelado,
          aVista,
          parcelado
        };
      }
      return { total: 0, aVista: 0, parcelado: 0 };
    } catch (error) {
      console.error('Erro ao calcular valor detalhado da fatura:', error);
      return { total: 0, aVista: 0, parcelado: 0 };
    }
  },

  // ========== FATURA TAB ==========

  initFaturaTab() {
    this.populateYearDropdown();
    this.populateMonthDropdown();
    this.renderFaturaCartoes();
    this.attachFaturaSearchListener();
  },

  populateYearDropdown() {
    const yearSelect = document.getElementById('faturaAnoSelect');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const years = [
      currentYear - 1, // Ano anterior
      currentYear,     // Ano atual
      currentYear + 1  // Próximo ano
    ];

    yearSelect.innerHTML = '';

    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === currentYear) {
        option.selected = true;
      }
      yearSelect.appendChild(option);
    });
  },

  async renderFaturaCartoes(mesFiltro = null, anoFiltro = null) {
    const grid = document.getElementById('faturaCartoesGrid');
    if (!grid) return;

    if (this.cartoes.length === 0) {
      grid.innerHTML = '<p class="empty-message">Nenhum cartão cadastrado</p>';
      return;
    }

    // Se não especificou filtro, usar mês/ano atual
    const hoje = new Date();
    const mes = mesFiltro || hoje.getMonth() + 1; // 1-12
    const ano = anoFiltro || hoje.getFullYear();

    // Calcular valores para o mês filtrado
    const cartoesComValorMensal = await Promise.all(
      this.cartoes.map(async (cartao) => {
        const valoresDetalhados = await this.calcularValorFaturaMesDetalhado(cartao.id, mes, ano);
        return {
          ...cartao,
          valorMensal: valoresDetalhados.total,
          valorAVista: valoresDetalhados.aVista,
          valorParcelado: valoresDetalhados.parcelado,
        };
      })
    );

    // Obter nome do mês para exibição
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mesNome = meses[mes - 1];

    grid.innerHTML = cartoesComValorMensal
      .map((cartao) => {
        // Usar apenas o valor da fatura do mês (faturas à vista + parcelas do mês)
        const valorTotal = cartao.valorMensal || 0;
        const valorAVista = cartao.valorAVista || 0;
        const valorParcelado = cartao.valorParcelado || 0;

        // Criar detalhamento
        let detalhamento = '';
        if (valorAVista > 0 || valorParcelado > 0) {
          detalhamento = `<span style="font-size: 0.65em; color: var(--text-secondary); display: block; margin-top: 2px;">À vista: ${this.formatCurrency(valorAVista)} | Parcelado: ${this.formatCurrency(valorParcelado)}</span>`;
        }

        return `
        <div class="fatura-cartao-card" data-cartao-id="${cartao.id}" data-cartao-nome="${cartao.nome.toLowerCase()}">
          <div class="fatura-cartao-icon">💳</div>
          <div class="fatura-cartao-info">
            <h4>${cartao.nome}</h4>
            <p>Vence dia: ${cartao.vencimento}</p>
            <span class="fatura-cartao-valor">${this.formatCurrency(valorTotal)}</span>
            <span style="font-size: 0.7em; color: var(--text-secondary); display: block; margin-top: 4px;">${mesNome}/${ano}</span>
            ${detalhamento}
          </div>
        </div>
      `;
      })
      .join('');

    // Adicionar event listeners para selecionar cartão ao clicar e consultar fatura
    document.querySelectorAll('.fatura-cartao-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const cartaoId = e.currentTarget.dataset.cartaoId;

        // Selecionar o cartão no dropdown
        const select = document.getElementById('faturaCartaoSelect');
        if (select) {
          select.value = cartaoId;
        }

        // Definir mês e ano do filtro nos selects
        const mesSelect = document.getElementById('faturaMesSelect');
        const anoSelect = document.getElementById('faturaAnoSelect');

        if (mesSelect) {
          mesSelect.value = mes;
        }
        if (anoSelect) {
          anoSelect.value = ano;
        }

        // Consultar fatura automaticamente
        this.consultarFatura();

        // Visual feedback: destacar o card selecionado
        document.querySelectorAll('.fatura-cartao-card').forEach(c => {
          c.classList.remove('selected');
        });
        e.currentTarget.classList.add('selected');
      });
    });
  },

  attachFaturaSearchListener() {
    const searchInput = document.getElementById('faturaSearchCartao');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const cards = document.querySelectorAll('.fatura-cartao-card');

      cards.forEach((card) => {
        const cartaoNome = card.dataset.cartaoNome;
        if (cartaoNome.includes(searchTerm)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  },

  populateMonthDropdown() {
    const monthSelect = document.getElementById('faturaMesSelect');
    if (!monthSelect) return;

    const currentMonth = new Date().getMonth() + 1;
    monthSelect.value = currentMonth;
  },

  populateCartaoDropdown() {
    // Dropdown da consulta de fatura
    const faturaCartaoSelect = document.getElementById('faturaCartaoSelect');
    if (faturaCartaoSelect) {
      faturaCartaoSelect.innerHTML = '<option value="">Selecione um cartão</option>';
      this.cartoes.forEach((cartao) => {
        const option = document.createElement('option');
        option.value = cartao.id;
        option.textContent = cartao.nome;
        faturaCartaoSelect.appendChild(option);
      });
    }

    // Dropdown do formulário de lançamento À VISTA (Fatura)
    const faturaCompraCartao = document.getElementById('faturaCompraCartao');
    if (faturaCompraCartao) {
      faturaCompraCartao.innerHTML = '<option value="">Selecione um cartão</option>';
      this.cartoes.forEach((cartao) => {
        const option = document.createElement('option');
        option.value = cartao.id;
        option.textContent = cartao.nome;
        faturaCompraCartao.appendChild(option);
      });
    }

    // Dropdown do formulário de lançamento PARCELADO (Parcelas)
    const parcelaCompraCartao = document.getElementById('parcelaCompraCartao');
    if (parcelaCompraCartao) {
      parcelaCompraCartao.innerHTML = '<option value="">Selecione um cartão</option>';
      this.cartoes.forEach((cartao) => {
        const option = document.createElement('option');
        option.value = cartao.id;
        option.textContent = cartao.nome;
        parcelaCompraCartao.appendChild(option);
      });
    }

    // Popular categorias também
    this.populateCategoriaDropdowns();
  },

  async populateCategoriaDropdowns() {
    if (!AppState.currentUser) return;

    try {
      // Buscar apenas categorias de despesa para cartões de crédito
      const result = await window.api.categoria.list(AppState.currentUser.id, 'despesa');

      if (result.success) {
        const categorias = result.data || [];

        // Dropdown do formulário de fatura
        const faturaCompraCategoria = document.getElementById('faturaCompraCategoria');
        if (faturaCompraCategoria) {
          faturaCompraCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
          categorias.forEach((cat) => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nome;
            faturaCompraCategoria.appendChild(option);
          });
        }

        // Dropdown do formulário de parcelas
        const parcelaCompraCategoria = document.getElementById('parcelaCompraCategoria');
        if (parcelaCompraCategoria) {
          parcelaCompraCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
          categorias.forEach((cat) => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nome;
            parcelaCompraCategoria.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  },

  async consultarFatura() {
    console.log('[Fatura] Iniciando consulta de fatura...');

    // Resetar paginação ao fazer nova consulta
    this.faturaPaginaAtual = 1;

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const cartaoId = document.getElementById('faturaCartaoSelect').value;
    const mes = parseInt(document.getElementById('faturaMesSelect').value);
    const ano = parseInt(document.getElementById('faturaAnoSelect').value);

    console.log('[Fatura] Parâmetros:', { cartaoId, mes, ano });

    if (!cartaoId) {
      Utils.showWarning('Por favor, selecione um cartão');
      return;
    }

    try {
      // Buscar transações reais do cartão no período
      // IMPORTANTE: O sistema considera o dia de fechamento do cartão (6 dias antes do vencimento)
      // - Compras feitas ANTES do fechamento aparecem na fatura do MÊS ATUAL
      // - Compras feitas DEPOIS do fechamento aparecem na fatura do PRÓXIMO MÊS
      // - Compras parceladas já têm a data ajustada automaticamente no momento do lançamento
      const result = await window.api.transacaoCartao.list(AppState.currentUser.id, parseInt(cartaoId),
        mes,
        ano
      );

      console.log('[Fatura] Resultado da busca:', result);

      if (!result.success) {
        Utils.showError(result.error || 'Erro ao buscar transações');
        return;
      }

      const todasTransacoes = result.data || [];

      // FILTRAR APENAS TRANSAÇÕES À VISTA (parcelas === 1)
      const transacoes = todasTransacoes.filter(t => t.parcelas === 1);

      const cartao = this.cartoes.find((c) => c.id === parseInt(cartaoId));

      console.log('[Fatura] Total de transações:', todasTransacoes.length);
      console.log('[Fatura] Transações à vista (filtradas):', transacoes.length);
      console.log('[Fatura] Cartão:', cartao);

      if (!cartao) {
        Utils.showError('Cartão não encontrado');
        return;
      }

      // Calcular valor total das transações À VISTA do período
      const valorTotal = transacoes.reduce((sum, t) => sum + t.valor, 0);

      // Montar objeto de fatura
      this.faturaAtual = {
        cartao: cartao,
        mes: mes,
        ano: ano,
        valor: valorTotal,
        status: cartao.status,
        lancamentos: transacoes,
      };

      console.log('[Fatura] Fatura montada:', this.faturaAtual);
      console.log('[Fatura] Chamando renderFatura()...');

      this.renderFatura();

      console.log('[Fatura] Consulta concluída com sucesso');
    } catch (error) {
      console.error('[Fatura] Erro ao consultar fatura:', error);
      Utils.showError('Erro ao consultar fatura');
    }
  },

  renderFatura() {
    console.log('[Fatura] Iniciando renderFatura()...');
    console.log('[Fatura] faturaAtual:', this.faturaAtual);

    const resumoSection = document.getElementById('faturaResumo');
    const lancamentosSection = document.getElementById('faturaLancamentos');
    const emptyState = document.getElementById('faturaEmpty');
    const noDataState = document.getElementById('faturaNoData');

    console.log('[Fatura] Elementos encontrados:', {
      resumoSection: !!resumoSection,
      lancamentosSection: !!lancamentosSection,
      emptyState: !!emptyState,
      noDataState: !!noDataState
    });

    if (!this.faturaAtual) {
      console.log('[Fatura] Nenhuma fatura para renderizar');
      // Mostrar empty state
      if (emptyState) emptyState.style.display = 'block';
      if (noDataState) noDataState.style.display = 'none';
      if (resumoSection) resumoSection.style.display = 'none';
      if (lancamentosSection) lancamentosSection.style.display = 'none';
      return;
    }

    console.log('[Fatura] Escondendo empty state...');
    // Esconder empty state
    if (emptyState) emptyState.style.display = 'none';

    console.log('[Fatura] Renderizando resumo...');
    // Renderizar resumo
    this.renderFaturaResumo();

    console.log('[Fatura] Verificando lançamentos:', this.faturaAtual.lancamentos.length);
    // Renderizar lançamentos
    if (this.faturaAtual.lancamentos.length === 0) {
      console.log('[Fatura] Nenhum lançamento encontrado, mostrando estado vazio');
      if (noDataState) noDataState.style.display = 'block';
      if (lancamentosSection) lancamentosSection.style.display = 'none';
    } else {
      console.log('[Fatura] Renderizando', this.faturaAtual.lancamentos.length, 'lançamentos...');
      if (noDataState) noDataState.style.display = 'none';
      if (lancamentosSection) lancamentosSection.style.display = 'block';
      this.renderFaturaLancamentos();
    }

    console.log('[Fatura] renderFatura() concluído');
  },

  renderFaturaResumo() {
    const resumoSection = document.getElementById('faturaResumo');
    if (!resumoSection || !this.faturaAtual) return;

    resumoSection.style.display = 'block';

    const { cartao, mes, ano, valor, status } = this.faturaAtual;
    const valorFormatado = this.formatCurrency(valor);
    const mesNome = this.getMonthName(mes);
    const statusClass = status === 'paga' ? 'paga' : 'pendente';
    const statusText = status === 'paga' ? 'Paga' : 'Pendente';

    resumoSection.innerHTML = `
      <div class="fatura-resumo-card">
        <div class="fatura-resumo-icon">💳</div>
        <div class="fatura-resumo-content">
          <p class="fatura-resumo-title">${cartao.nome} - ${mesNome}/${ano}</p>
          <h2 class="fatura-resumo-valor">${valorFormatado}</h2>
          <div class="fatura-resumo-info">
            <span class="fatura-status ${statusClass}">
              <span class="status-dot"></span>
              ${statusText}
            </span>
            <span>Vence dia: ${cartao.vencimento}</span>
          </div>
        </div>
      </div>
    `;
  },

  renderFaturaLancamentos() {
    const lancamentosList = document.getElementById('faturaLancamentosList');
    if (!lancamentosList || !this.faturaAtual) return;

    // Calcular paginação
    const totalItens = this.faturaAtual.lancamentos.length;
    const totalPaginas = Math.ceil(totalItens / this.faturaItensPorPagina);
    const inicio = (this.faturaPaginaAtual - 1) * this.faturaItensPorPagina;
    const fim = inicio + this.faturaItensPorPagina;
    const lancamentosPaginados = this.faturaAtual.lancamentos.slice(inicio, fim);

    // Criar estrutura de tabela
    const tabelaHTML = `
      <table class="fatura-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Parcelas</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${lancamentosPaginados
            .map((lancamento) => {
              const valorFormatado = this.formatCurrency(lancamento.valor);
              const dataFormatada = this.formatDate(lancamento.data);

              // Informação de parcelamento
              const parcelamentoTexto =
                lancamento.parcelas > 1
                  ? `${lancamento.parcela_atual}/${lancamento.parcelas}`
                  : 'À vista';

              // Categoria
              const categoriaTexto = lancamento.categoria_nome || 'Sem categoria';
              const categoriaStyle = lancamento.categoria_cor
                ? `background-color: ${lancamento.categoria_cor}22; color: ${lancamento.categoria_cor}; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;`
                : 'color: var(--text-secondary); font-size: 0.85em;';

              // Remover o "(X/Y)" da descrição se existir para exibição mais limpa
              const descricaoLimpa = lancamento.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '');

              return `
                <tr>
                  <td style="white-space: nowrap;">${dataFormatada}</td>
                  <td><strong>${descricaoLimpa}</strong></td>
                  <td><span style="${categoriaStyle}">${categoriaTexto}</span></td>
                  <td style="text-align: center;">
                    ${
                      lancamento.parcelas > 1
                        ? `<span class="parcela-badge">${parcelamentoTexto}</span>`
                        : parcelamentoTexto
                    }
                  </td>
                  <td style="text-align: right; font-weight: 600; color: var(--danger-color);">${valorFormatado}</td>
                  <td style="text-align: center; white-space: nowrap;">
                    <button class="btn-fatura-action btn-fatura-edit" data-id="${lancamento.id}" title="Editar compra">
                      ✏️
                    </button>
                    <button class="btn-fatura-action btn-fatura-delete" data-id="${lancamento.id}" title="Excluir compra">
                      🗑️
                    </button>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    lancamentosList.innerHTML = tabelaHTML;

    // Renderizar controles de paginação
    this.renderFaturaPaginacao(totalItens, totalPaginas);

    // Adicionar event listeners aos botões
    this.attachFaturaLancamentoListeners();
  },

  renderFaturaPaginacao(totalItens, totalPaginas) {
    const paginacaoContainer = document.getElementById('faturaPaginacao');
    if (!paginacaoContainer) return;

    if (totalPaginas <= 1) {
      paginacaoContainer.innerHTML = '';
      return;
    }

    const inicio = (this.faturaPaginaAtual - 1) * this.faturaItensPorPagina + 1;
    const fim = Math.min(this.faturaPaginaAtual * this.faturaItensPorPagina, totalItens);

    let paginasHTML = '';

    // Lógica para mostrar páginas (máximo 5 botões de página)
    let inicioPagina = Math.max(1, this.faturaPaginaAtual - 2);
    let fimPagina = Math.min(totalPaginas, inicioPagina + 4);

    if (fimPagina - inicioPagina < 4) {
      inicioPagina = Math.max(1, fimPagina - 4);
    }

    for (let i = inicioPagina; i <= fimPagina; i++) {
      paginasHTML += `
        <button
          class="pagination-btn ${i === this.faturaPaginaAtual ? 'active' : ''}"
          data-page="${i}"
        >
          ${i}
        </button>
      `;
    }

    paginacaoContainer.innerHTML = `
      <div class="pagination-info">
        Mostrando ${inicio} - ${fim} de ${totalItens} lançamentos
      </div>
      <div class="pagination-controls">
        <button
          class="pagination-btn"
          data-action="first"
          ${this.faturaPaginaAtual === 1 ? 'disabled' : ''}
        >
          «
        </button>
        <button
          class="pagination-btn"
          data-action="prev"
          ${this.faturaPaginaAtual === 1 ? 'disabled' : ''}
        >
          ‹
        </button>
        ${paginasHTML}
        <button
          class="pagination-btn"
          data-action="next"
          ${this.faturaPaginaAtual === totalPaginas ? 'disabled' : ''}
        >
          ›
        </button>
        <button
          class="pagination-btn"
          data-action="last"
          ${this.faturaPaginaAtual === totalPaginas ? 'disabled' : ''}
        >
          »
        </button>
      </div>
    `;

    // Adicionar event listeners aos botões de paginação
    paginacaoContainer.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const page = e.target.dataset.page;

        if (action === 'first') {
          this.faturaPaginaAtual = 1;
        } else if (action === 'prev') {
          this.faturaPaginaAtual = Math.max(1, this.faturaPaginaAtual - 1);
        } else if (action === 'next') {
          this.faturaPaginaAtual = Math.min(totalPaginas, this.faturaPaginaAtual + 1);
        } else if (action === 'last') {
          this.faturaPaginaAtual = totalPaginas;
        } else if (page) {
          this.faturaPaginaAtual = parseInt(page);
        }

        this.renderFaturaLancamentos();
      });
    });
  },

  attachFaturaLancamentoListeners() {
    // Botões de editar
    document.querySelectorAll('.btn-fatura-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.editarCompraFatura(id);
      });
    });

    // Botões de excluir
    document.querySelectorAll('.btn-fatura-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.excluirCompraFatura(id);
      });
    });
  },

  async editarCompraFatura(id) {
    const lancamento = this.faturaAtual.lancamentos.find((l) => l.id === id);
    if (!lancamento) {
      Utils.showError('Compra não encontrada');
      return;
    }

    // Preencher modal de lançar compra com os dados atuais
    document.getElementById('compraDescricao').value = lancamento.descricao;
    document.getElementById('compraValor').value = lancamento.valor;
    document.getElementById('compraData').value = lancamento.data;
    document.getElementById('compraCartao').value = lancamento.cartao_id;
    if (lancamento.categoria_id) {
      document.getElementById('compraCategoria').value = lancamento.categoria_id;
    }
    document.getElementById('compraParcelas').value = lancamento.parcelas;
    if (lancamento.observacoes) {
      document.getElementById('compraObservacoes').value = lancamento.observacoes;
    }

    // Armazenar ID para edição
    this.currentEditCompraId = id;

    // Abrir modal
    this.openLancarCompraModal();
  },

  async excluirCompraFatura(id) {
    const lancamento = this.faturaAtual.lancamentos.find((l) => l.id === id);
    if (!lancamento) {
      Utils.showError('Compra não encontrada');
      return;
    }

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    if (!Utils.confirm(`Tem certeza que deseja excluir a compra "${lancamento.descricao}"?`)) {
      return;
    }

    try {
      const result = await window.api.transacaoCartao.delete(id, AppState.currentUser.id);

      if (result.success) {
        Utils.showSuccess('Compra excluída com sucesso!');
        this.loadCartoes();
        this.consultarFatura();
      } else {
        Utils.showError(result.error || 'Erro ao excluir compra');
      }
    } catch (error) {
      console.error('Erro ao excluir compra:', error);
      Utils.showError('Erro ao excluir compra');
    }
  },

  // ========== MODAL LANÇAR COMPRA ==========

  openLancarCompraModal() {
    const modal = document.getElementById('modalLancarCompra');
    if (!modal) {
      Utils.showError('Modal de lançar compra não encontrado');
      return;
    }

    // Resetar formulário apenas se não estiver editando
    if (!this.currentEditCompraId) {
      document.getElementById('formLancarCompra').reset();

      // Definir data padrão como hoje
      const hoje = new Date().toISOString().split('T')[0];
      document.getElementById('compraData').value = hoje;
    }

    // Preencher dropdowns
    this.populateCompraCartaoDropdown();
    this.populateCompraCategoriaDropdown();

    // Atualizar informação de parcela
    this.updateParcelaInfo();

    modal.classList.add('active');
  },

  closeLancarCompraModal() {
    const modal = document.getElementById('modalLancarCompra');
    if (modal) {
      modal.classList.remove('active');
    }
    document.getElementById('formLancarCompra').reset();
    this.currentEditCompraId = null;
  },

  populateCompraCartaoDropdown() {
    const select = document.getElementById('compraCartao');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um cartão</option>';

    this.cartoes.forEach((cartao) => {
      const option = document.createElement('option');
      option.value = cartao.id;
      option.textContent = cartao.nome;
      select.appendChild(option);
    });
  },

  populateCompraCategoriaDropdown() {
    const select = document.getElementById('compraCategoria');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma categoria</option>';

    // Filtrar apenas categorias de despesa
    const categoriasDespesa = AppState.categorias.filter((c) => c.tipo === 'despesa');

    categoriasDespesa.forEach((categoria) => {
      const option = document.createElement('option');
      option.value = categoria.id;
      option.textContent = categoria.nome;
      select.appendChild(option);
    });
  },

  updateParcelaInfo() {
    const valorInput = document.getElementById('compraValor');
    const parcelasSelect = document.getElementById('compraParcelas');
    const infoDiv = document.getElementById('parcelaInfo');
    const infoTexto = document.getElementById('parcelaInfoTexto');
    const infoDetalhes = document.getElementById('parcelaInfoDetalhes');

    const valor = parseFloat(valorInput.value) || 0;
    const parcelas = parseInt(parcelasSelect.value) || 1;

    if (valor > 0 && parcelas > 1) {
      const valorParcela = valor / parcelas;
      infoTexto.textContent = `${parcelas}x de ${this.formatCurrency(valorParcela)}`;

      const dataCompra = new Date(document.getElementById('compraData').value || Date.now());
      const mesInicio = dataCompra.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      });

      const dataFim = new Date(dataCompra);
      dataFim.setMonth(dataFim.getMonth() + parcelas - 1);
      const mesFim = dataFim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      infoDetalhes.textContent = `Primeira parcela em ${mesInicio}, última em ${mesFim}`;
      infoDiv.style.display = 'flex';
    } else {
      infoDiv.style.display = 'none';
    }
  },

  async handleLancarCompraSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const descricao = document.getElementById('compraDescricao').value.trim();
    const valor = parseFloat(document.getElementById('compraValor').value);
    const data = document.getElementById('compraData').value;
    const cartao_id = parseInt(document.getElementById('compraCartao').value);
    const categoria_id = document.getElementById('compraCategoria').value
      ? parseInt(document.getElementById('compraCategoria').value)
      : null;
    const parcelas = parseInt(document.getElementById('compraParcelas').value);
    const observacoes = document.getElementById('compraObservacoes').value.trim();

    // Validações
    if (!descricao) {
      Utils.showWarning('Por favor, preencha a descrição');
      return;
    }

    if (valor <= 0) {
      Utils.showWarning('Valor deve ser maior que zero');
      return;
    }

    if (!cartao_id) {
      Utils.showWarning('Por favor, selecione um cartão');
      return;
    }

    if (!data) {
      Utils.showWarning('Por favor, selecione uma data');
      return;
    }

    try {
      // Verificar se está editando
      if (this.currentEditCompraId) {
        // EDITAR compra existente
        const updates = {
          descricao,
          valor,
          data,
          cartao_id,
          categoria_id,
          observacoes,
        };

        const result = await window.api.transacaoCartao.update(this.currentEditCompraId, AppState.currentUser.id, updates);

        if (result.success) {
          Utils.showSuccess('Compra atualizada com sucesso!');
          this.closeLancarCompraModal();
          this.loadCartoes();

          // Se estiver na aba fatura, recarregar
          if (this.currentTab === 'fatura' && this.faturaAtual) {
            this.consultarFatura();
          }
        } else {
          Utils.showError(result.error || 'Erro ao atualizar compra');
        }
      } else if (parcelas > 1) {
        // CRIAR compra parcelada - criar múltiplas transações
        const transacao = {
          usuario_id: AppState.currentUser.id,
          descricao,
          valor,
          data,
          cartao_id,
          categoria_id,
          parcelas,
          observacoes
        };

        const result = await window.api.transacaoCartao.createParcelada(transacao, parcelas);

        if (result.success) {
          Utils.showSuccess(`Compra parcelada em ${parcelas}x lançada com sucesso!`);
          this.closeLancarCompraModal();
          this.loadCartoes(); // Atualizar valores dos cartões

          // Se estiver na aba fatura, recarregar
          if (this.currentTab === 'fatura' && this.faturaAtual) {
            this.consultarFatura();
          }

          // Se estiver na aba parcela, recarregar
          if (this.currentTab === 'parcela') {
            this.loadParcelas();
          }
        } else {
          Utils.showError(result.error || 'Erro ao lançar compra parcelada');
        }
      } else {
        // CRIAR compra à vista - criar transação única
        const transacao = {
          usuario_id: AppState.currentUser.id,
          descricao,
          valor,
          data,
          cartao_id,
          categoria_id,
          parcelas: 1,
          parcela_atual: 1,
          observacoes
        };

        const result = await window.api.transacaoCartao.create(transacao);

        if (result.success) {
          Utils.showSuccess('Compra lançada com sucesso!');
          this.closeLancarCompraModal();
          this.loadCartoes(); // Atualizar valores dos cartões

          // Se estiver na aba fatura, recarregar
          if (this.currentTab === 'fatura' && this.faturaAtual) {
            this.consultarFatura();
          }
        } else {
          Utils.showError(result.error || 'Erro ao lançar compra');
        }
      }
    } catch (error) {
      console.error('Erro ao lançar compra:', error);
      Utils.showError('Erro ao lançar compra');
    }
  },

  // ========== IMPORTAR FATURA OFX ==========

  importarFatura() {
    const modal = document.getElementById('modalImportarFatura');
    if (!modal) {
      Utils.showError('Modal de importação não encontrado');
      return;
    }

    // Resetar estado
    this.currentFileFatura = null;
    this.parsedDataFatura = [];
    this.showStepFatura(1);
    this.removeFileFatura();

    // Atualizar dropdown de cartões
    this.updateCartoesSelectFatura();

    modal.classList.add('active');
  },

  attachImportFaturaEventListeners() {
    // Fechar modal
    const btnClose = document.getElementById('closeModalImportarFaturaCartao');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeImportFaturaModal());
    }

    const btnCancel = document.getElementById('cancelImportFatura');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => this.closeImportFaturaModal());
    }

    // Upload de arquivo
    const fileUploadArea = document.getElementById('fileUploadAreaFatura');
    const fileInput = document.getElementById('importFileFatura');

    if (fileUploadArea && fileInput) {
      fileUploadArea.addEventListener('click', () => {
        const fileInfo = document.getElementById('fileInfoFatura');
        if (!fileInfo || !fileInfo.style.display || fileInfo.style.display === 'none') {
          fileInput.click();
        }
      });

      fileInput.addEventListener('change', (e) => this.handleFileSelectFatura(e));

      // Drag and drop
      fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        const placeholder = fileUploadArea.querySelector('.upload-placeholder');
        if (placeholder) placeholder.classList.add('drag-over');
      });

      fileUploadArea.addEventListener('dragleave', () => {
        const placeholder = fileUploadArea.querySelector('.upload-placeholder');
        if (placeholder) placeholder.classList.remove('drag-over');
      });

      fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const placeholder = fileUploadArea.querySelector('.upload-placeholder');
        if (placeholder) placeholder.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.processFileFatura(files[0]);
        }
      });
    }

    // Remover arquivo
    const btnRemoveFile = document.getElementById('removeFileFatura');
    if (btnRemoveFile) {
      btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFileFatura();
      });
    }

    // Processar arquivo
    const btnProcessar = document.getElementById('btnProcessarImportFatura');
    if (btnProcessar) {
      btnProcessar.addEventListener('click', () => this.processImportFatura());
    }

    // Voltar
    const btnVoltar = document.getElementById('btnVoltarImportFatura');
    if (btnVoltar) {
      btnVoltar.addEventListener('click', () => this.showStepFatura(1));
    }

    // Confirmar importação
    const btnConfirmar = document.getElementById('btnConfirmarImportFatura');
    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', () => this.confirmImportFatura());
    }

    // Fechar resultado
    const btnFecharResultado = document.getElementById('btnFecharResultadoFatura');
    if (btnFecharResultado) {
      btnFecharResultado.addEventListener('click', () => this.closeImportFaturaModal());
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('modalImportarFatura');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeImportFaturaModal();
        }
      });
    }

    // Listener para mudança de cartão
    const cartaoSelect = document.getElementById('importFaturaCartao');
    if (cartaoSelect) {
      cartaoSelect.addEventListener('change', () => {
        const btnProcessar = document.getElementById('btnProcessarImportFatura');
        if (btnProcessar) {
          btnProcessar.disabled = !(cartaoSelect.value && this.currentFileFatura);
        }
      });
    }
  },

  closeImportFaturaModal() {
    const modal = document.getElementById('modalImportarFatura');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  updateCartoesSelectFatura() {
    const select = document.getElementById('importFaturaCartao');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um cartão</option>';

    this.cartoes.forEach((cartao) => {
      const option = document.createElement('option');
      option.value = cartao.id;
      option.textContent = `${cartao.nome} - Vence dia ${cartao.vencimento}`;
      select.appendChild(option);
    });
  },

  handleFileSelectFatura(e) {
    const file = e.target.files[0];
    if (file) {
      this.processFileFatura(file);
    }
  },

  processFileFatura(file) {
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

    this.currentFileFatura = file;

    // Atualizar UI
    const uploadPlaceholder = document.querySelector('#fileUploadAreaFatura .upload-placeholder');
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';

    const fileInfo = document.getElementById('fileInfoFatura');
    if (fileInfo) fileInfo.style.display = 'flex';

    const fileName = document.getElementById('fileNameFatura');
    if (fileName) fileName.textContent = file.name;

    const fileSize = document.getElementById('fileSizeFatura');
    if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

    // Habilitar botão de processar se cartão estiver selecionado
    const cartaoSelect = document.getElementById('importFaturaCartao');
    const btnProcessar = document.getElementById('btnProcessarImportFatura');
    if (cartaoSelect && btnProcessar) {
      btnProcessar.disabled = !cartaoSelect.value;
    }
  },

  removeFileFatura() {
    this.currentFileFatura = null;
    const uploadPlaceholder = document.querySelector('#fileUploadAreaFatura .upload-placeholder');
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';

    const fileInfo = document.getElementById('fileInfoFatura');
    if (fileInfo) fileInfo.style.display = 'none';

    const fileInput = document.getElementById('importFileFatura');
    if (fileInput) fileInput.value = '';

    const btnProcessar = document.getElementById('btnProcessarImportFatura');
    if (btnProcessar) btnProcessar.disabled = true;
  },

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  async processImportFatura() {
    if (!this.currentFileFatura) {
      Utils.showError('Nenhum arquivo selecionado');
      return;
    }

    const cartaoId = parseInt(document.getElementById('importFaturaCartao').value);
    if (!cartaoId) {
      Utils.showError('Selecione um cartão');
      return;
    }

    this.cartaoSelecionadoFatura = this.cartoes.find((c) => c.id === cartaoId);

    try {
      console.log('🔄 Iniciando processamento do arquivo de fatura:', this.currentFileFatura.name);

      const content = await this.readFileFatura(this.currentFileFatura);
      console.log('✅ Arquivo lido com sucesso');

      console.log('💼 Processando OFX...');
      this.parsedDataFatura = this.parseOFXFatura(content);

      console.log(`📋 ${this.parsedDataFatura.length} registros extraídos`);

      if (this.parsedDataFatura.length === 0) {
        Utils.showWarning('Nenhum registro encontrado no arquivo');
        return;
      }

      // Categorizar automaticamente
      console.log('🤖 Iniciando categorização automática...');
      this.parsedDataFatura = this.parsedDataFatura.map((item) => {
        const categoria = this.autoCategorize(item.descricao);
        return {
          ...item,
          categoria: categoria,
          autoCategorized: !!categoria,
        };
      });

      const categorizados = this.parsedDataFatura.filter((item) => item.categoria).length;
      console.log(
        `✅ ${categorizados} de ${this.parsedDataFatura.length} transações categorizadas automaticamente`
      );

      this.showPreviewFatura();
      this.showStepFatura(2);
    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      Utils.showError('Erro ao processar arquivo: ' + error.message);
    }
  },

  readFileFatura(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file);
    });
  },

  parseOFXFatura(content) {
    const data = [];

    // Regex para encontrar transações (mesmo do import.js)
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

        // Faturas de cartão são sempre despesas (valores positivos no OFX)
        data.push({
          data: `${date.substr(0, 4)}-${date.substr(4, 2)}-${date.substr(6, 2)}`,
          descricao: description.trim(),
          valor: Math.abs(amount),
        });
      }
    }

    return data;
  },

  autoCategorize(description) {
    if (!description) {
      return null;
    }

    const desc = description.toLowerCase();

    // Regras de categorização (reutilizar do ImportManager)
    const categorizationRules = {
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
      educacao: ['escola', 'faculdade', 'curso', 'livro', 'material escolar', 'mensalidade'],
      vestuario: ['roupa', 'sapato', 'calcado', 'loja', 'shopping', 'zara', 'renner', 'c&a'],
    };

    // Buscar correspondência nas regras
    for (const [categoriaChave, keywords] of Object.entries(categorizationRules)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword.toLowerCase())) {
          // Encontrar categoria no AppState (apenas despesas)
          let categoriaObj = AppState.categorias.find(
            (c) => c.nome.toLowerCase() === categoriaChave && c.tipo === 'despesa'
          );

          if (!categoriaObj) {
            categoriaObj = AppState.categorias.find(
              (c) => c.nome.toLowerCase().includes(categoriaChave) && c.tipo === 'despesa'
            );
          }

          if (!categoriaObj) {
            categoriaObj = AppState.categorias.find(
              (c) => categoriaChave.includes(c.nome.toLowerCase()) && c.tipo === 'despesa'
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

  showPreviewFatura() {
    // Atualizar estatísticas
    const total = this.parsedDataFatura.length;
    const categorizados = this.parsedDataFatura.filter((item) => item.categoria).length;
    const semCategoria = total - categorizados;

    const totalEl = document.getElementById('totalRegistrosFatura');
    if (totalEl) totalEl.textContent = total;

    const categorizadosEl = document.getElementById('totalCategorizadosFatura');
    if (categorizadosEl) categorizadosEl.textContent = categorizados;

    const semCategoriaEl = document.getElementById('totalSemCategoriaFatura');
    if (semCategoriaEl) semCategoriaEl.textContent = semCategoria;

    // Atualizar tabela
    const tbody = document.getElementById('previewTableBodyFatura');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Mostrar apenas primeiros 10 registros
    const preview = this.parsedDataFatura.slice(0, 10);

    preview.forEach((item) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${this.formatDate(item.data)}</td>
        <td>${item.descricao}</td>
        <td style="font-weight: 600; color: var(--danger-color);">
          ${this.formatCurrency(item.valor)}
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

    if (this.parsedDataFatura.length > 10) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 15px;">
          ... e mais ${this.parsedDataFatura.length - 10} registros
        </td>
      `;
      tbody.appendChild(tr);
    }
  },

  async confirmImportFatura() {
    this.showStepFatura(3);

    let importados = 0;
    let categorizados = 0;
    let ignorados = 0;

    try {
      console.log(`🚀 Iniciando importação de ${this.parsedDataFatura.length} transações...`);

      for (let i = 0; i < this.parsedDataFatura.length; i++) {
        const item = this.parsedDataFatura[i];

        // Atualizar progresso
        const progress = ((i + 1) / this.parsedDataFatura.length) * 100;
        const progressFill = document.getElementById('progressFillFatura');
        if (progressFill) progressFill.style.width = `${progress}%`;

        const progressText = document.getElementById('progressTextFatura');
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;

        // Criar transação de cartão
        const transacao = {
          usuario_id: AppState.currentUser.id,
          descricao: item.descricao,
          valor: item.valor,
          data: item.data,
          cartao_id: this.cartaoSelecionadoFatura.id,
          categoria_id: item.categoria ? item.categoria.id : null,
          parcelas: 1,
          parcela_atual: 1,
          observacoes: 'Importado via arquivo OFX - ' + this.currentFileFatura.name
        };

        // Se não tem categoria, usar primeira categoria de despesa
        if (!transacao.categoria_id) {
          const categoriaDefault = AppState.categorias.find((c) => c.tipo === 'despesa');
          if (categoriaDefault) {
            transacao.categoria_id = categoriaDefault.id;
            console.log(
              `📌 Usando categoria padrão "${categoriaDefault.nome}" para: ${item.descricao}`
            );
          }
        }

        // Importar
        if (transacao.categoria_id) {
          const response = await window.api.transacaoCartao.create(transacao);

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
      this.loadCartoes();

      // Mostrar resultado
      const importadosCount = document.getElementById('importadosCountFatura');
      if (importadosCount) importadosCount.textContent = importados;

      const categorizadosCount = document.getElementById('categorizadosCountFatura');
      if (categorizadosCount) categorizadosCount.textContent = categorizados;

      if (ignorados > 0) {
        Utils.showWarning(
          `${ignorados} transações foram ignoradas por falta de categoria de Despesa. Crie categorias e tente novamente.`
        );
      }

      this.showStepFatura(4);

      // Atualizar aba fatura se estiver ativa
      if (this.currentTab === 'fatura' && this.faturaAtual) {
        this.consultarFatura();
      }
    } catch (error) {
      console.error('❌ Erro ao importar:', error);

      const resultIcon = document.getElementById('resultIconFatura');
      if (resultIcon) {
        resultIcon.classList.remove('success');
        resultIcon.classList.add('error');
        resultIcon.textContent = '✕';
      }

      const resultTitle = document.getElementById('resultTitleFatura');
      if (resultTitle) resultTitle.textContent = 'Erro na importação';

      const importadosCount = document.getElementById('importadosCountFatura');
      if (importadosCount) importadosCount.textContent = importados;

      const categorizadosCount = document.getElementById('categorizadosCountFatura');
      if (categorizadosCount) categorizadosCount.textContent = categorizados;

      this.showStepFatura(4);

      Utils.showError('Erro durante a importação: ' + error.message);
    }
  },

  showStepFatura(step) {
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`stepFatura${i}`);
      if (stepEl) {
        stepEl.style.display = i === step ? 'block' : 'none';
      }
    }
  },

  getMonthName(month) {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1] || '';
  },

  formatDate(dateString) {
    // Parse da data como LOCAL para evitar problemas de timezone
    // Se vier no formato YYYY-MM-DD, fazer parse manual
    if (dateString.includes('-')) {
      const [ano, mes, dia] = dateString.split('-').map(Number);
      const date = new Date(ano, mes - 1, dia); // mes - 1 porque JS usa 0-11
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    // Fallback para outros formatos
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  // ========== PARCELA TAB ==========

  initParcelaTab() {
    this.loadParcelas();
  },

  async loadParcelas() {
    if (!AppState.currentUser) return;

    // Resetar paginação ao carregar novos dados
    this.parcelasPaginaAtual = 1;

    try {
      // Buscar todas as transações de cartão do usuário que sejam parceladas
      const result = await window.api.transacaoCartao.list(AppState.currentUser.id);

      if (result.success) {
        const transacoesParceladas = (result.data || []).filter((t) => t.parcelas > 1);

        // Agrupar por grupo_parcelamento
        const grupos = new Map();
        transacoesParceladas.forEach((t) => {
          const grupoId = t.grupo_parcelamento || `single-${t.id}`;
          if (!grupos.has(grupoId)) {
            grupos.set(grupoId, []);
          }
          grupos.get(grupoId).push(t);
        });

        // Para cada grupo, encontrar a parcela correspondente ao mês atual
        const hoje = new Date();
        const mesAtual = hoje.getMonth(); // 0-11
        const anoAtual = hoje.getFullYear();

        this.parcelas = [];

        grupos.forEach((parcelas, grupoId) => {
          // Ordenar parcelas por parcela_atual
          parcelas.sort((a, b) => a.parcela_atual - b.parcela_atual);

          // Buscar a parcela cuja data corresponde ao mês atual
          // Cada parcela já tem a data correta considerando o dia de fechamento do cartão
          const parcelaDoMesAtual = parcelas.find((p) => {
            const dataParcela = new Date(p.data);
            return dataParcela.getMonth() === mesAtual && dataParcela.getFullYear() === anoAtual;
          });

          if (parcelaDoMesAtual) {
            // Encontrou a parcela do mês atual
            this.parcelas.push(parcelaDoMesAtual);
          } else {
            // Se não encontrou parcela para o mês atual, verificar se já passou ou ainda vai começar
            const primeiraParcela = parcelas[0];
            const ultimaParcela = parcelas[parcelas.length - 1];

            const dataPrimeira = new Date(primeiraParcela.data);
            const dataUltima = new Date(ultimaParcela.data);

            const dataAtual = new Date(anoAtual, mesAtual, 1);

            if (dataAtual < new Date(dataPrimeira.getFullYear(), dataPrimeira.getMonth(), 1)) {
              // Ainda não começou - mostrar a primeira parcela
              this.parcelas.push(primeiraParcela);
            } else if (dataAtual > new Date(dataUltima.getFullYear(), dataUltima.getMonth(), 1)) {
              // Já terminou - mostrar a última parcela
              this.parcelas.push(ultimaParcela);
            }
          }
        });

        // Ordenar por data (mais recente primeiro)
        this.parcelas.sort((a, b) => new Date(b.data) - new Date(a.data));

        // Renderizar cards dos cartões e parcelas
        this.renderParcelasCartoes();
        this.renderParcelas();
        this.renderParcelasResumo();
      } else {
        console.error('Erro ao carregar compras parceladas:', result.error);
        Utils.showError('Erro ao carregar compras parceladas');
      }
    } catch (error) {
      console.error('Erro ao carregar compras parceladas:', error);
      Utils.showError('Erro ao carregar compras parceladas');
    }
  },

  // Renderizar Cards dos Cartões com Parcelas
  renderParcelasCartoes() {
    const grid = document.getElementById('parcelasCartoesGrid');
    if (!grid) return;

    if (this.cartoes.length === 0) {
      grid.innerHTML = '<p class="empty-message">Nenhum cartão cadastrado</p>';
      return;
    }

    // Calcular valor de parcelas por cartão
    const parcelasPorCartao = {};
    this.parcelas.forEach((p) => {
      if (!parcelasPorCartao[p.cartao_id]) {
        parcelasPorCartao[p.cartao_id] = {
          valor: 0,
          quantidade: 0,
        };
      }
      parcelasPorCartao[p.cartao_id].valor += p.valor;
      parcelasPorCartao[p.cartao_id].quantidade++;
    });

    grid.innerHTML = this.cartoes
      .map((cartao) => {
        const parcelas = parcelasPorCartao[cartao.id] || { valor: 0, quantidade: 0 };
        const valorFormatado = this.formatCurrency(parcelas.valor);
        const infoText = parcelas.quantidade === 1
          ? '1 parcela'
          : `${parcelas.quantidade} parcelas`;

        return `
          <div class="parcelas-cartao-card" data-cartao-id="${cartao.id}" data-cartao-nome="${cartao.nome.toLowerCase()}">
            <div class="parcelas-cartao-nome">${cartao.nome}</div>
            <div class="parcelas-cartao-valor">${valorFormatado}</div>
            <div class="parcelas-cartao-info">${infoText} no mês</div>
          </div>
        `;
      })
      .join('');

    // Adicionar event listeners
    grid.querySelectorAll('.parcelas-cartao-card').forEach((card) => {
      card.addEventListener('click', () => {
        const cartaoId = parseInt(card.dataset.cartaoId);
        this.filterParcelasByCartao(cartaoId);

        // Marcar como selecionado
        grid.querySelectorAll('.parcelas-cartao-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // Busca de cartões
    const searchInput = document.getElementById('parcelasSearchCartao');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        grid.querySelectorAll('.parcelas-cartao-card').forEach((card) => {
          const cartaoNome = card.dataset.cartaoNome;
          card.style.display = cartaoNome.includes(searchTerm) ? 'block' : 'none';
        });
      });
    }
  },

  // Filtrar parcelas por cartão
  filterParcelasByCartao(cartaoId) {
    // Se clicar no mesmo cartão, desmarcar (mostrar todos)
    if (this.parcelasFiltroCartao === cartaoId) {
      this.parcelasFiltroCartao = null;
      this.parcelasPaginaAtual = 1; // Resetar paginação
      this.renderParcelas();
      return;
    }

    this.parcelasFiltroCartao = cartaoId;
    this.parcelasPaginaAtual = 1; // Resetar paginação ao mudar filtro
    this.renderParcelas();
  },

  // Renderizar Card de Resumo
  renderParcelasResumo() {
    const valorEl = document.getElementById('parcelasResumoValor');
    const infoEl = document.getElementById('parcelasResumoInfo');

    if (!valorEl || !infoEl) return;

    const valorTotal = this.parcelas.reduce((sum, p) => sum + p.valor, 0);
    const quantidade = this.parcelas.length;

    valorEl.textContent = this.formatCurrency(valorTotal);
    infoEl.textContent = quantidade === 1 ? '1 parcela' : `${quantidade} parcelas`;
  },

  renderParcelas() {
    const emptyState = document.getElementById('parcelasEmpty');
    const tableWrapper = document.getElementById('parcelasTableWrapper');
    const tableBody = document.getElementById('parcelasTableBody');

    // Aplicar filtro por cartão se estiver ativo
    let parcelasFiltradas = this.parcelas;
    if (this.parcelasFiltroCartao) {
      parcelasFiltradas = this.parcelas.filter(p => p.cartao_id === this.parcelasFiltroCartao);
    }

    if (parcelasFiltradas.length === 0) {
      emptyState.style.display = 'block';
      tableWrapper.style.display = 'none';
      // Limpar paginação quando não há dados
      const paginacaoContainer = document.getElementById('parcelasPaginacao');
      if (paginacaoContainer) paginacaoContainer.innerHTML = '';
      return;
    }

    emptyState.style.display = 'none';
    tableWrapper.style.display = 'block';

    // Calcular paginação
    const totalItens = parcelasFiltradas.length;
    const totalPaginas = Math.ceil(totalItens / this.parcelasItensPorPagina);

    // Garantir que a página atual é válida
    if (this.parcelasPaginaAtual > totalPaginas) {
      this.parcelasPaginaAtual = totalPaginas;
    }
    if (this.parcelasPaginaAtual < 1) {
      this.parcelasPaginaAtual = 1;
    }

    const inicio = (this.parcelasPaginaAtual - 1) * this.parcelasItensPorPagina;
    const fim = inicio + this.parcelasItensPorPagina;
    const parcelasPaginadas = parcelasFiltradas.slice(inicio, fim);

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    tableBody.innerHTML = parcelasPaginadas
      .map((transacao) => {
        // Formatar valores
        const valorFormatado = this.formatCurrency(transacao.valor);
        const dataFormatada = this.formatDate(transacao.data);

        // Verificar se é a parcela do mês atual
        const dataParcela = new Date(transacao.data);
        const mesParcela = dataParcela.getMonth();
        const anoParcela = dataParcela.getFullYear();
        const isParcelaAtual = mesParcela === mesAtual && anoParcela === anoAtual;

        // Mostrar informação de categoria se houver
        const categoriaInfo = transacao.categoria_nome
          ? transacao.categoria_nome
          : 'Sem categoria';

        // Remover o "(X/Y)" da descrição se existir para exibição mais limpa
        const descricaoLimpa = transacao.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '');

        // Destacar linha se for parcela do mês atual
        const rowStyle = isParcelaAtual ? 'style="background-color: rgba(74, 144, 226, 0.1);"' : '';

        return `
          <tr ${rowStyle}>
            <td>${descricaoLimpa}</td>
            <td>
              ${dataFormatada}
              ${isParcelaAtual ? '<span style="color: var(--primary-color); font-size: 0.75em; margin-left: 5px;">● Mês Atual</span>' : ''}
            </td>
            <td>${transacao.cartao_nome || 'Desconhecido'}</td>
            <td style="font-weight: 600;">${valorFormatado}</td>
            <td><span class="parcela-badge">${transacao.parcela_atual}/${transacao.parcelas}</span></td>
            <td>${categoriaInfo}</td>
            <td style="text-align: center; white-space: nowrap;">
              <button class="btn-parcela-action btn-parcela-edit" data-id="${transacao.id}" data-grupo="${transacao.grupo_parcelamento}" title="Editar parcela">
                ✏️
              </button>
              <button class="btn-parcela-action btn-parcela-delete" data-id="${transacao.id}" data-grupo="${transacao.grupo_parcelamento}" title="Excluir parcela">
                🗑️
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    // Renderizar controles de paginação
    this.renderParcelasPaginacao(totalItens, totalPaginas);

    // Adicionar event listeners aos botões
    this.attachParcelaActionListeners();
  },

  attachParcelaActionListeners() {
    // Botões de editar
    document.querySelectorAll('.btn-parcela-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const grupo = e.currentTarget.dataset.grupo;
        this.editarParcela(id, grupo);
      });
    });

    // Botões de excluir
    document.querySelectorAll('.btn-parcela-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const grupo = e.currentTarget.dataset.grupo;
        this.excluirParcela(id, grupo);
      });
    });
  },

  renderParcelasPaginacao(totalItens, totalPaginas) {
    const paginacaoContainer = document.getElementById('parcelasPaginacao');
    if (!paginacaoContainer) return;

    if (totalPaginas <= 1) {
      paginacaoContainer.innerHTML = '';
      return;
    }

    const inicio = (this.parcelasPaginaAtual - 1) * this.parcelasItensPorPagina + 1;
    const fim = Math.min(this.parcelasPaginaAtual * this.parcelasItensPorPagina, totalItens);

    let paginasHTML = '';

    // Lógica para mostrar páginas (máximo 5 botões de página)
    let inicioPagina = Math.max(1, this.parcelasPaginaAtual - 2);
    let fimPagina = Math.min(totalPaginas, inicioPagina + 4);

    if (fimPagina - inicioPagina < 4) {
      inicioPagina = Math.max(1, fimPagina - 4);
    }

    for (let i = inicioPagina; i <= fimPagina; i++) {
      paginasHTML += `
        <button
          class="pagination-btn ${i === this.parcelasPaginaAtual ? 'active' : ''}"
          data-page="${i}"
        >
          ${i}
        </button>
      `;
    }

    paginacaoContainer.innerHTML = `
      <div class="pagination-info">
        Mostrando ${inicio} - ${fim} de ${totalItens} parcelas
      </div>
      <div class="pagination-controls">
        <button
          class="pagination-btn"
          data-action="first"
          ${this.parcelasPaginaAtual === 1 ? 'disabled' : ''}
        >
          «
        </button>
        <button
          class="pagination-btn"
          data-action="prev"
          ${this.parcelasPaginaAtual === 1 ? 'disabled' : ''}
        >
          ‹
        </button>
        ${paginasHTML}
        <button
          class="pagination-btn"
          data-action="next"
          ${this.parcelasPaginaAtual === totalPaginas ? 'disabled' : ''}
        >
          ›
        </button>
        <button
          class="pagination-btn"
          data-action="last"
          ${this.parcelasPaginaAtual === totalPaginas ? 'disabled' : ''}
        >
          »
        </button>
      </div>
    `;

    // Adicionar event listeners aos botões de paginação
    paginacaoContainer.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const page = e.target.dataset.page;

        if (action === 'first') {
          this.parcelasPaginaAtual = 1;
        } else if (action === 'prev') {
          this.parcelasPaginaAtual = Math.max(1, this.parcelasPaginaAtual - 1);
        } else if (action === 'next') {
          this.parcelasPaginaAtual = Math.min(totalPaginas, this.parcelasPaginaAtual + 1);
        } else if (action === 'last') {
          this.parcelasPaginaAtual = totalPaginas;
        } else if (page) {
          this.parcelasPaginaAtual = parseInt(page);
        }

        this.renderParcelas();
      });
    });
  },

  async editarParcela(id, grupo) {
    Utils.showInfo('Função de edição de parcela em desenvolvimento');
    // TODO: Implementar modal de edição de parcela
    console.log('Editar parcela:', { id, grupo });
  },

  async excluirParcela(id, grupoParcelamento) {
    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    // Buscar todas as parcelas do grupo
    const result = await window.api.transacaoCartao.list(AppState.currentUser.id);

    if (!result.success) {
      Utils.showError('Erro ao buscar parcelas');
      return;
    }

    const parcelasDoGrupo = result.data.filter(t => t.grupo_parcelamento === grupoParcelamento);
    const quantidadeParcelas = parcelasDoGrupo.length;

    const confirmMsg = quantidadeParcelas > 1
      ? `Deseja excluir TODAS as ${quantidadeParcelas} parcelas desta compra?\n\nIsso removerá a compra parcelada por completo.`
      : 'Deseja excluir esta parcela?';

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      // Excluir todas as parcelas do grupo
      for (const parcela of parcelasDoGrupo) {
        const deleteResult = await window.api.transacaoCartao.delete(parcela.id, AppState.currentUser.id);
        if (!deleteResult.success) {
          Utils.showError(`Erro ao excluir parcela ${parcela.parcela_atual}`);
          return;
        }
      }

      Utils.showSuccess(
        quantidadeParcelas > 1
          ? `${quantidadeParcelas} parcelas excluídas com sucesso!`
          : 'Parcela excluída com sucesso!'
      );

      this.loadCartoes();
      this.loadParcelas();
    } catch (error) {
      console.error('Erro ao excluir parcelas:', error);
      Utils.showError('Erro ao excluir parcelas');
    }
  },
};

// Inicializar quando a página de cartão for aberta
document.addEventListener('DOMContentLoaded', () => {
  // A inicialização será chamada pelo Navigation quando a página for carregada
});
