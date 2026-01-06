// src/renderer/scripts/cartao.js

const CartaoPage = {
  currentTab: 'contas',
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
          await window.api.transacaoCartao.delete(transacao.id);
        }
      }

      // Depois, deletar o cartão
      const result = await window.api.cartao.delete(id);

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

    // Adicionar event listeners para selecionar cartão ao clicar e consultar fatura
    document.querySelectorAll('.fatura-cartao-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const cartaoId = e.currentTarget.dataset.cartaoId;

        // Selecionar o cartão no dropdown
        const select = document.getElementById('faturaCartaoSelect');
        if (select) {
          select.value = cartaoId;
        }

        // Definir mês e ano atuais se ainda não estiverem definidos
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        const mesSelect = document.getElementById('faturaMesSelect');
        const anoSelect = document.getElementById('faturaAnoSelect');

        if (mesSelect && !mesSelect.value) {
          mesSelect.value = mesAtual;
        }
        if (anoSelect && !anoSelect.value) {
          anoSelect.value = anoAtual;
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
    console.log('[Fatura] Iniciando consulta de fatura...');

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
      const result = await window.api.transacaoCartao.list(
        AppState.currentUser.id,
        parseInt(cartaoId),
        mes,
        ano
      );

      console.log('[Fatura] Resultado da busca:', result);

      if (!result.success) {
        Utils.showError(result.error || 'Erro ao buscar transações');
        return;
      }

      const transacoes = result.data || [];
      const cartao = this.cartoes.find((c) => c.id === parseInt(cartaoId));

      console.log('[Fatura] Transações encontradas:', transacoes.length);
      console.log('[Fatura] Cartão:', cartao);

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
          ${this.faturaAtual.lancamentos
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

              return `
                <tr>
                  <td style="white-space: nowrap;">${dataFormatada}</td>
                  <td><strong>${lancamento.descricao}</strong></td>
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

    // Adicionar event listeners aos botões
    this.attachFaturaLancamentoListeners();
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

    if (!Utils.confirm(`Tem certeza que deseja excluir a compra "${lancamento.descricao}"?`)) {
      return;
    }

    try {
      const result = await window.api.transacaoCartao.delete(id);

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

        const result = await window.api.transacaoCartao.update(this.currentEditCompraId, updates);

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
        // CRIAR compra à vista - criar transação única
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

  async loadParcelas() {
    if (!AppState.currentUser) return;

    try {
      // Buscar todas as transações de cartão do usuário que sejam parceladas
      const result = await window.api.transacaoCartao.list(AppState.currentUser.id);

      if (result.success) {
        // Filtrar apenas transações parceladas (parcelas > 1)
        const transacoesParceladas = (result.data || []).filter((t) => t.parcelas > 1);

        // Agrupar transações parceladas únicas (baseado em grupo de parcelas)
        // Vamos criar um mapa de compras únicas baseado nos dados
        const comprasUnicas = new Map();

        transacoesParceladas.forEach((t) => {
          // Criar uma chave única baseada em: descrição, valor, cartão_id, parcelas, categoria_id
          const chave = `${t.descricao}-${t.valor}-${t.cartao_id}-${t.parcelas}-${t.categoria_id || 'sem'}`;

          if (!comprasUnicas.has(chave)) {
            comprasUnicas.set(chave, t);
          } else {
            // Se já existe, manter a transação mais antiga (primeira parcela)
            const existente = comprasUnicas.get(chave);
            if (new Date(t.data) < new Date(existente.data)) {
              comprasUnicas.set(chave, t);
            }
          }
        });

        this.parcelas = Array.from(comprasUnicas.values());
        this.renderParcelas();
      } else {
        console.error('Erro ao carregar compras parceladas:', result.error);
        Utils.showError('Erro ao carregar compras parceladas');
      }
    } catch (error) {
      console.error('Erro ao carregar compras parceladas:', error);
      Utils.showError('Erro ao carregar compras parceladas');
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

    // Data atual para calcular qual parcela está sendo exibida
    const hoje = new Date();
    const mesAtual = hoje.getMonth(); // 0-11
    const anoAtual = hoje.getFullYear();

    tableBody.innerHTML = this.parcelas
      .map((transacao) => {
        // Data da compra (primeira parcela)
        const dataCompra = new Date(transacao.data);
        const mesCompra = dataCompra.getMonth(); // 0-11
        const anoCompra = dataCompra.getFullYear();

        // Calcular diferença de meses entre a compra e o mês atual
        const diferencaMeses = (anoAtual - anoCompra) * 12 + (mesAtual - mesCompra);

        // Número da parcela atual (mínimo 1, máximo parcelas)
        const parcelaAtual = Math.min(Math.max(diferencaMeses + 1, 1), transacao.parcelas);

        // Valor da parcela (valor total dividido pelo número de parcelas)
        const valorParcela = transacao.valor;
        const valorFormatado = this.formatCurrency(valorParcela);
        const dataFormatada = this.formatDate(transacao.data);

        // Mostrar informação de categoria se houver
        const categoriaInfo = transacao.categoria_nome
          ? transacao.categoria_nome
          : 'Sem categoria';

        return `
          <tr>
            <td>${transacao.descricao}</td>
            <td>${dataFormatada}</td>
            <td>${transacao.cartao_nome || 'Desconhecido'}</td>
            <td>${valorFormatado}</td>
            <td>${parcelaAtual}/${transacao.parcelas}</td>
            <td>${categoriaInfo}</td>
          </tr>
        `;
      })
      .join('');
  },
};

// Inicializar quando a página de cartão for aberta
document.addEventListener('DOMContentLoaded', () => {
  // A inicialização será chamada pelo Navigation quando a página for carregada
});
