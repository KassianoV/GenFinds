// src/renderer/scripts/cartao.js

const CartaoPage = {
  currentTab: 'contas',
  cartoes: [],
  currentEditId: null,
  faturaAtual: null,
  parcelas: [],
  transacoesCartao: [],
  // Variáveis para importação de fatura
  currentFileFatura: null,
  parsedDataFatura: [],
  cartaoSelecionadoFatura: null,

  init() {
    this.attachEventListeners();
    this.attachImportFaturaEventListeners();
    this.loadCartoes();
    this.initFaturaTab();
    this.initParcelaTab();
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

    // Form de Adicionar Cartão
    const formCartao = document.getElementById('formCartao');
    if (formCartao) {
      formCartao.addEventListener('submit', (e) => this.handleCartaoSubmit(e));
    }

    // Modal de Editar - Event Listeners
    const btnCloseEditCartao = document.getElementById('closeModalEditarCartao');
    if (btnCloseEditCartao) {
      btnCloseEditCartao.addEventListener('click', () => this.closeEditModal());
    }

    const btnCancelEditCartao = document.getElementById('cancelModalEditarCartao');
    if (btnCancelEditCartao) {
      btnCancelEditCartao.addEventListener('click', () => this.closeEditModal());
    }

    const formEditCartao = document.getElementById('formEditarCartao');
    if (formEditCartao) {
      formEditCartao.addEventListener('submit', (e) => this.handleEditSubmit(e));
    }

    // Fechar modal ao clicar fora
    const modalEditCartao = document.getElementById('modalEditarCartao');
    if (modalEditCartao) {
      modalEditCartao.addEventListener('click', (e) => {
        if (e.target === modalEditCartao) {
          this.closeEditModal();
        }
      });
    }

    // Botão Importar Fatura
    const btnImportarFatura = document.getElementById('btnImportarFatura');
    if (btnImportarFatura) {
      btnImportarFatura.addEventListener('click', () => this.importarFatura());
    }

    // Botão Lançar Compra
    const btnLancarCompra = document.getElementById('btnLancarCompra');
    if (btnLancarCompra) {
      btnLancarCompra.addEventListener('click', () => this.openLancarCompraModal());
    }

    // Modal Lançar Compra - Fechar
    const btnCloseLancarCompra = document.getElementById('closeModalLancarCompra');
    if (btnCloseLancarCompra) {
      btnCloseLancarCompra.addEventListener('click', () => this.closeLancarCompraModal());
    }

    const btnCancelLancarCompra = document.getElementById('cancelLancarCompra');
    if (btnCancelLancarCompra) {
      btnCancelLancarCompra.addEventListener('click', () => this.closeLancarCompraModal());
    }

    // Modal Lançar Compra - Form
    const formLancarCompra = document.getElementById('formLancarCompra');
    if (formLancarCompra) {
      formLancarCompra.addEventListener('submit', (e) => this.handleLancarCompraSubmit(e));
    }

    // Modal Lançar Compra - Calcular parcelas
    const compraParcelas = document.getElementById('compraParcelas');
    const compraValor = document.getElementById('compraValor');
    if (compraParcelas && compraValor) {
      compraParcelas.addEventListener('change', () => this.updateParcelaInfo());
      compraValor.addEventListener('input', () => this.updateParcelaInfo());
    }

    // Fechar modal ao clicar fora
    const modalLancarCompra = document.getElementById('modalLancarCompra');
    if (modalLancarCompra) {
      modalLancarCompra.addEventListener('click', (e) => {
        if (e.target === modalLancarCompra) {
          this.closeLancarCompraModal();
        }
      });
    }

    // Botão Consultar Fatura
    const btnConsultarFatura = document.getElementById('btnConsultarFatura');
    if (btnConsultarFatura) {
      btnConsultarFatura.addEventListener('click', () => this.consultarFatura());
    }

    // Form de Adicionar Parcela
    const formParcela = document.getElementById('formParcela');
    if (formParcela) {
      formParcela.addEventListener('submit', (e) => this.handleParcelaSubmit(e));
    }

    // Cálculo automático do total
    const parcelaValor = document.getElementById('parcelaValor');
    const parcelaQuantidade = document.getElementById('parcelaQuantidade');
    if (parcelaValor && parcelaQuantidade) {
      parcelaValor.addEventListener('input', () => this.calculateTotal());
      parcelaQuantidade.addEventListener('input', () => this.calculateTotal());
    }
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
        nome,
        valor,
        vencimento,
        status: 'aberta', // Status padrão
        usuario_id: AppState.currentUser.id,
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

  async loadCartoes() {
    if (!AppState.currentUser) return;

    try {
      const result = await window.api.cartao.list(AppState.currentUser.id);

      if (result.success) {
        this.cartoes = result.data || [];
        this.renderCartoes();
        this.populateCartaoDropdown();
        this.populateParcelaCartaoDropdown();
        this.renderFaturaCartoes();
      } else {
        console.error('Erro ao carregar cartões:', result.error);
        Utils.showError('Erro ao carregar cartões');
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
      Utils.showError('Erro ao carregar cartões');
    }
  },

  renderCartoes() {
    const emptyState = document.getElementById('cartoesEmpty');
    const cartoesList = document.getElementById('cartoesList');

    if (this.cartoes.length === 0) {
      emptyState.style.display = 'block';
      cartoesList.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    cartoesList.style.display = 'block';

    cartoesList.innerHTML = this.cartoes
      .map((cartao) => this.createCartaoCard(cartao))
      .join('');

    // Anexar event listeners aos botões de ação
    this.attachCartaoActionListeners();
  },

  createCartaoCard(cartao) {
    const valorFormatado = this.formatCurrency(cartao.valor);
    const statusClass = cartao.status || 'aberta';
    const statusText = this.getStatusText(statusClass);

    return `
      <div class="cartao-card" data-id="${cartao.id}">
        <div class="cartao-info">
          <div class="cartao-nome">
            <span class="icon">💳</span>
            ${cartao.nome}
          </div>
          <div class="cartao-valor ${statusClass}">
            ${valorFormatado}
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

      const result = await window.api.cartao.update(this.currentEditId, updates);

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

    if (!Utils.confirm(`Tem certeza que deseja remover o cartão "${cartao.nome}"?`)) {
      return;
    }

    try {
      const result = await window.api.cartao.delete(id);

      if (result.success) {
        Utils.showSuccess('Cartão removido com sucesso!');
        this.loadCartoes();
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
    };
    return statusMap[status] || 'Aberta';
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

  renderFaturaCartoes() {
    const grid = document.getElementById('faturaCartoesGrid');
    if (!grid) return;

    if (this.cartoes.length === 0) {
      grid.innerHTML = '<p class="empty-message">Nenhum cartão cadastrado</p>';
      return;
    }

    grid.innerHTML = this.cartoes
      .map((cartao) => `
        <div class="fatura-cartao-card" data-cartao-id="${cartao.id}" data-cartao-nome="${cartao.nome.toLowerCase()}">
          <div class="fatura-cartao-icon">💳</div>
          <div class="fatura-cartao-info">
            <h4>${cartao.nome}</h4>
            <p>Vence dia: ${cartao.vencimento}</p>
            <span class="fatura-cartao-valor">${this.formatCurrency(cartao.valor)}</span>
          </div>
        </div>
      `)
      .join('');

    // Adicionar event listeners para selecionar cartão ao clicar
    document.querySelectorAll('.fatura-cartao-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const cartaoId = e.currentTarget.dataset.cartaoId;
        const select = document.getElementById('faturaCartaoSelect');
        if (select) {
          select.value = cartaoId;
        }
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
    const cartaoSelect = document.getElementById('faturaCartaoSelect');
    if (!cartaoSelect) return;

    cartaoSelect.innerHTML = '<option value="">Selecione um cartão</option>';

    this.cartoes.forEach((cartao) => {
      const option = document.createElement('option');
      option.value = cartao.id;
      option.textContent = cartao.nome;
      cartaoSelect.appendChild(option);
    });
  },

  async consultarFatura() {
    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const cartaoId = document.getElementById('faturaCartaoSelect').value;
    const mes = parseInt(document.getElementById('faturaMesSelect').value);
    const ano = parseInt(document.getElementById('faturaAnoSelect').value);

    if (!cartaoId) {
      Utils.showWarning('Por favor, selecione um cartão');
      return;
    }

    try {
      // Buscar transações reais do cartão no período
      const result = await window.api.transacaoCartao.list(
        AppState.currentUser.id,
        parseInt(cartaoId),
        mes,
        ano
      );

      if (!result.success) {
        Utils.showError(result.error || 'Erro ao buscar transações');
        return;
      }

      const transacoes = result.data || [];
      const cartao = this.cartoes.find((c) => c.id === parseInt(cartaoId));

      if (!cartao) {
        Utils.showError('Cartão não encontrado');
        return;
      }

      // Calcular valor total das transações do período
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

      this.renderFatura();
    } catch (error) {
      console.error('Erro ao consultar fatura:', error);
      Utils.showError('Erro ao consultar fatura');
    }
  },

  renderFatura() {
    const resumoSection = document.getElementById('faturaResumoSection');
    const lancamentosSection = document.getElementById('faturaLancamentosSection');
    const emptyState = document.getElementById('faturaEmpty');
    const noDataState = document.getElementById('faturaNoData');

    if (!this.faturaAtual) {
      // Mostrar empty state
      if (emptyState) emptyState.style.display = 'block';
      if (noDataState) noDataState.style.display = 'none';
      if (resumoSection) resumoSection.style.display = 'none';
      if (lancamentosSection) lancamentosSection.style.display = 'none';
      return;
    }

    // Esconder empty state
    if (emptyState) emptyState.style.display = 'none';

    // Renderizar resumo
    this.renderFaturaResumo();

    // Renderizar lançamentos
    if (this.faturaAtual.lancamentos.length === 0) {
      if (noDataState) noDataState.style.display = 'block';
      if (lancamentosSection) lancamentosSection.style.display = 'none';
    } else {
      if (noDataState) noDataState.style.display = 'none';
      if (lancamentosSection) lancamentosSection.style.display = 'block';
      this.renderFaturaLancamentos();
    }
  },

  renderFaturaResumo() {
    const resumoSection = document.getElementById('faturaResumoSection');
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

    lancamentosList.innerHTML = this.faturaAtual.lancamentos
      .map((lancamento) => {
        const valorFormatado = this.formatCurrency(lancamento.valor);
        const dataFormatada = this.formatDate(lancamento.data);

        // Mostrar informação de parcelamento se houver
        const parcelamentoInfo =
          lancamento.parcelas > 1
            ? `<span class="parcela-badge">${lancamento.parcela_atual}/${lancamento.parcelas}</span>`
            : '';

        // Mostrar categoria se houver
        const categoriaInfo = lancamento.categoria_nome
          ? `<span class="categoria-badge" style="${
              lancamento.categoria_cor
                ? `background-color: ${lancamento.categoria_cor}22; color: ${lancamento.categoria_cor}`
                : ''
            }">${lancamento.categoria_nome}</span>`
          : '';

        return `
          <div class="fatura-lancamento-item">
            <div class="fatura-lancamento-info">
              <div class="fatura-lancamento-descricao">
                ${lancamento.descricao}
                ${parcelamentoInfo}
              </div>
              <div class="fatura-lancamento-meta">
                <span class="fatura-lancamento-data">${dataFormatada}</span>
                ${categoriaInfo}
              </div>
            </div>
            <div class="fatura-lancamento-valor">${valorFormatado}</div>
          </div>
        `;
      })
      .join('');
  },

  // ========== MODAL LANÇAR COMPRA ==========

  openLancarCompraModal() {
    const modal = document.getElementById('modalLancarCompra');
    if (!modal) {
      Utils.showError('Modal de lançar compra não encontrado');
      return;
    }

    // Resetar formulário
    document.getElementById('formLancarCompra').reset();

    // Definir data padrão como hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('compraData').value = hoje;

    // Preencher dropdowns
    this.populateCompraCartaoDropdown();
    this.populateCompraCategoriaDropdown();

    // Esconder info de parcela
    document.getElementById('parcelaInfo').style.display = 'none';

    modal.classList.add('active');
  },

  closeLancarCompraModal() {
    const modal = document.getElementById('modalLancarCompra');
    if (modal) {
      modal.classList.remove('active');
    }
    document.getElementById('formLancarCompra').reset();
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
      if (parcelas > 1) {
        // Compra parcelada - criar múltiplas transações
        const transacao = {
          descricao,
          valor,
          data,
          cartao_id,
          categoria_id,
          parcelas,
          observacoes,
          usuario_id: AppState.currentUser.id,
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
        } else {
          Utils.showError(result.error || 'Erro ao lançar compra parcelada');
        }
      } else {
        // Compra à vista - criar transação única
        const transacao = {
          descricao,
          valor,
          data,
          cartao_id,
          categoria_id,
          parcelas: 1,
          parcela_atual: 1,
          observacoes,
          usuario_id: AppState.currentUser.id,
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
          descricao: item.descricao,
          valor: item.valor,
          data: item.data,
          cartao_id: this.cartaoSelecionadoFatura.id,
          categoria_id: item.categoria ? item.categoria.id : null,
          parcelas: 1,
          parcela_atual: 1,
          observacoes: 'Importado via arquivo OFX - ' + this.currentFileFatura.name,
          usuario_id: AppState.currentUser.id,
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

  populateParcelaCartaoDropdown() {
    const cartaoSelect = document.getElementById('parcelaCartao');
    if (!cartaoSelect) return;

    cartaoSelect.innerHTML = '<option value="">Selecione um cartão</option>';

    this.cartoes.forEach((cartao) => {
      const option = document.createElement('option');
      option.value = cartao.id;
      option.textContent = cartao.nome;
      cartaoSelect.appendChild(option);
    });
  },

  calculateTotal() {
    const valorInput = document.getElementById('parcelaValor');
    const quantidadeInput = document.getElementById('parcelaQuantidade');
    const totalInput = document.getElementById('parcelaTotal');

    if (!valorInput || !quantidadeInput || !totalInput) return;

    const valor = parseFloat(valorInput.value) || 0;
    const quantidade = parseInt(quantidadeInput.value) || 0;
    const total = valor * quantidade;

    totalInput.value = total.toFixed(2);
  },

  async handleParcelaSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const descricao = document.getElementById('parcelaDescricao').value.trim();
    const dia = parseInt(document.getElementById('parcelaDia').value);
    const cartao_id = parseInt(document.getElementById('parcelaCartao').value);
    const valor_parcela = parseFloat(document.getElementById('parcelaValor').value);
    const quantidade_parcelas = parseInt(document.getElementById('parcelaQuantidade').value);
    const total = parseFloat(document.getElementById('parcelaTotal').value);

    // Validações
    if (!descricao) {
      Utils.showWarning('Por favor, preencha a descrição');
      return;
    }

    if (dia < 1 || dia > 31) {
      Utils.showWarning('Dia deve ser entre 1 e 31');
      return;
    }

    if (!cartao_id) {
      Utils.showWarning('Por favor, selecione um cartão');
      return;
    }

    if (quantidade_parcelas < 1) {
      Utils.showWarning('Quantidade de parcelas deve ser maior que 0');
      return;
    }

    try {
      const parcela = {
        descricao,
        dia,
        cartao_id,
        valor_parcela,
        quantidade_parcelas,
        total,
        usuario_id: AppState.currentUser.id,
      };

      const result = await window.api.parcela.create(parcela);

      if (result.success) {
        Utils.showSuccess('Parcela adicionada com sucesso!');
        document.getElementById('formParcela').reset();
        this.loadParcelas();
      } else {
        Utils.showError(result.error || 'Erro ao adicionar parcela');
      }
    } catch (error) {
      console.error('Erro ao adicionar parcela:', error);
      Utils.showError('Erro ao adicionar parcela');
    }
  },

  async loadParcelas() {
    if (!AppState.currentUser) return;

    try {
      const result = await window.api.parcela.list(AppState.currentUser.id);

      if (result.success) {
        this.parcelas = result.data || [];
        this.renderParcelas();
      } else {
        console.error('Erro ao carregar parcelas:', result.error);
        Utils.showError('Erro ao carregar parcelas');
      }
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
      Utils.showError('Erro ao carregar parcelas');
    }
  },

  renderParcelas() {
    const emptyState = document.getElementById('parcelasEmpty');
    const tableWrapper = document.getElementById('parcelasTableWrapper');
    const tableBody = document.getElementById('parcelasTableBody');

    if (this.parcelas.length === 0) {
      emptyState.style.display = 'block';
      tableWrapper.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    tableWrapper.style.display = 'block';

    tableBody.innerHTML = this.parcelas
      .map((parcela) => {
        const cartao = this.cartoes.find((c) => c.id === parcela.cartao_id);
        const cartaoNome = cartao ? cartao.nome : 'Desconhecido';
        const valorParcelaFormatado = this.formatCurrency(parcela.valor_parcela);
        const totalFormatado = this.formatCurrency(parcela.total);

        // Calcular data de início baseada no dia informado
        const hoje = new Date();
        const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), parcela.dia);
        const dataInicioFormatada = dataInicio.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        return `
          <tr>
            <td>${parcela.descricao}</td>
            <td>${dataInicioFormatada}</td>
            <td>${cartaoNome}</td>
            <td>${valorParcelaFormatado}</td>
            <td>${parcela.quantidade_parcelas}x</td>
            <td>${totalFormatado}</td>
            <td>
              <div class="parcelas-actions">
                <button class="btn-parcela-action btn-parcela-delete" data-id="${parcela.id}">
                  🗑️ Remover
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Anexar event listeners aos botões de ação
    this.attachParcelaActionListeners();
  },

  attachParcelaActionListeners() {
    // Botões de Remover
    document.querySelectorAll('.btn-parcela-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.deleteParcela(id);
      });
    });
  },

  async deleteParcela(id) {
    const parcela = this.parcelas.find((p) => p.id === id);
    if (!parcela) return;

    if (!Utils.confirm(`Tem certeza que deseja remover a parcela "${parcela.descricao}"?`)) {
      return;
    }

    try {
      const result = await window.api.parcela.delete(id);

      if (result.success) {
        Utils.showSuccess('Parcela removida com sucesso!');
        this.loadParcelas();
      } else {
        Utils.showError(result.error || 'Erro ao remover parcela');
      }
    } catch (error) {
      console.error('Erro ao remover parcela:', error);
      Utils.showError('Erro ao remover parcela');
    }
  },
};

// Inicializar quando a página de cartão for aberta
document.addEventListener('DOMContentLoaded', () => {
  // A inicialização será chamada pelo Navigation quando a página for carregada
});
