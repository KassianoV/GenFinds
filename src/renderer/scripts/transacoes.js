// src/renderer/scripts/transacoes.js

// Função utilitária debounce para otimizar filtros
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const TransacoesPage = {
  currentEditId: null,
  filtros: {
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    tipo: '',
    busca: '',
  },
  paginacao: {
    paginaAtual: 1,
    itensPorPagina: 10,
    totalItens: 0,
    totalPaginas: 0,
  },

  populateYearSelect() {
    const select = document.getElementById('filtroAno');
    if (!select) return;

    const anoAtual = new Date().getFullYear();
    const anos = [
      anoAtual - 1, // Ano anterior
      anoAtual, // Ano atual
      anoAtual + 1, // Próximo ano
    ];

    select.innerHTML = '';

    anos.forEach((ano) => {
      const option = document.createElement('option');
      option.value = ano;
      option.textContent = ano;

      if (ano === anoAtual) {
        option.selected = true;
      }

      select.appendChild(option);
    });
  },

  init() {
    this.populateYearSelect();
    this.attachEventListeners();
    this.setCurrentMonth();
    this.render();
    this.updateSummaryCards();
  },

  async updateSummaryCards() {
    if (!AppState.currentUser) return;

    // Calcular patrimônio líquido (soma de todas as contas)
    const saldoTotal = AppState.contas.reduce((sum, conta) => sum + conta.saldo, 0);

    // Calcular período baseado nos filtros atuais
    const primeiroDia = new Date(this.filtros.ano, this.filtros.mes - 1, 1);
    const ultimoDia = new Date(this.filtros.ano, this.filtros.mes, 0);

    const dataInicio = primeiroDia.toISOString().split('T')[0];
    const dataFim = ultimoDia.toISOString().split('T')[0];

    try {
      const response = await window.api.relatorio.getResumo(
        AppState.currentUser.id,
        dataInicio,
        dataFim
      );

      if (response.success) {
        const resumo = response.data;

        // Atualizar cards com os valores
        const saldoEl = document.getElementById('transacoesSaldoTotal');
        const receitaEl = document.getElementById('transacoesReceitaMes');
        const despesaEl = document.getElementById('transacoesDespesaMes');
        const economiaEl = document.getElementById('transacoesEconomiaMes');

        if (saldoEl) {
          saldoEl.textContent = Utils.formatCurrency(saldoTotal);
          saldoEl.style.color = saldoTotal >= 0 ? 'var(--info-color)' : 'var(--danger-color)';
        }

        if (receitaEl) {
          receitaEl.textContent = Utils.formatCurrency(resumo.receita);
        }

        if (despesaEl) {
          despesaEl.textContent = Utils.formatCurrency(resumo.despesa);
        }

        if (economiaEl) {
          economiaEl.textContent = Utils.formatCurrency(resumo.saldo);
          economiaEl.style.color =
            resumo.saldo >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        }

        // Atualizar labels com mês/ano selecionado
        const mesAtual = CONFIG.MESES[this.filtros.mes - 1];
        const anoAtual = this.filtros.ano;

        const receitaLabel = document.getElementById('transacoesReceitaLabel');
        const despesaLabel = document.getElementById('transacoesDespesaLabel');

        if (receitaLabel) receitaLabel.textContent = `${mesAtual} ${anoAtual}`;
        if (despesaLabel) despesaLabel.textContent = `${mesAtual} ${anoAtual}`;
      }
    } catch (error) {
      console.error('Erro ao atualizar resumo da página de transações:', error);
    }
  },

  setCurrentMonth() {
    const currentMonth = new Date().getMonth() + 1;
    const tabs = document.querySelectorAll('.month-tab');
    tabs.forEach((tab) => {
      if (parseInt(tab.dataset.month) === currentMonth) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  },

  attachEventListeners() {
    // Botão Nova Transação
    const btnNova = document.getElementById('btnNovaTransacao');
    if (btnNova) {
      btnNova.addEventListener('click', () => this.openModal());
    }

    // Botão Exportar
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) {
      btnExportar.addEventListener('click', () => this.exportarCSV());
    }

    // Botão Importar
    const btnImportar = document.getElementById('btnImportar');
    if (btnImportar) {
      btnImportar.addEventListener('click', () => {
        document.getElementById('fileImport').click();
      });
    }

    const fileImport = document.getElementById('fileImport');
    if (fileImport) {
      fileImport.addEventListener('change', (e) => this.importarCSV(e));
    }

    // Fechar Modal Nova
    const btnClose = document.getElementById('closeModalTransacao');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeModal());
    }

    const btnCancel = document.getElementById('cancelModalTransacao');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => this.closeModal());
    }

    // Fechar Modal Editar
    const btnCloseEdit = document.getElementById('closeModalEditarTransacao');
    if (btnCloseEdit) {
      btnCloseEdit.addEventListener('click', () => this.closeEditModal());
    }

    const btnCancelEdit = document.getElementById('cancelModalEditarTransacao');
    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', () => this.closeEditModal());
    }

    // Mudança de tipo de transação (Nova)
    const tipoSelect = document.getElementById('transacaoTipo');
    if (tipoSelect) {
      tipoSelect.addEventListener('change', (e) => {
        this.updateCategoriasSelect(e.target.value);
      });
    }

    // Mudança de tipo de transação (Editar)
    const editTipoSelect = document.getElementById('editTransacaoTipo');
    if (editTipoSelect) {
      editTipoSelect.addEventListener('change', (e) => {
        this.updateEditCategoriasSelect(e.target.value);
      });
    }

    // Submit do formulário Nova
    const form = document.getElementById('formNovaTransacao');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Submit do formulário Editar
    const editForm = document.getElementById('formEditarTransacao');
    if (editForm) {
      editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
    }

    // Filtro Ano
    const filtroAno = document.getElementById('filtroAno');
    if (filtroAno) {
      filtroAno.addEventListener('change', (e) => {
        this.filtros.ano = parseInt(e.target.value);
        this.paginacao.paginaAtual = 1;
        this.render();
        this.updateSummaryCards();
      });
    }

    // Tabs de Mês
    const monthTabs = document.querySelectorAll('.month-tab');
    monthTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        monthTabs.forEach((t) => t.classList.remove('active'));
        e.target.classList.add('active');
        this.filtros.mes = parseInt(e.target.dataset.month);
        this.paginacao.paginaAtual = 1;
        this.render();
        this.updateSummaryCards();
      });
    });

    // Dropdown de Filtro
    const filterTrigger = document.getElementById('filterTrigger');
    const filterMenu = document.getElementById('filterMenu');
    const filterLabel = document.getElementById('filterLabel');

    if (filterTrigger && filterMenu) {
      filterTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        filterTrigger.classList.toggle('active');
        filterMenu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!filterTrigger.contains(e.target) && !filterMenu.contains(e.target)) {
          filterTrigger.classList.remove('active');
          filterMenu.classList.remove('active');
        }
      });

      const filterOptions = document.querySelectorAll('.filter-option');
      filterOptions.forEach((option) => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();

          filterOptions.forEach((o) => o.classList.remove('active'));
          e.target.classList.add('active');

          this.filtros.tipo = e.target.dataset.tipo;

          if (filterLabel) {
            filterLabel.textContent = e.target.textContent;
          }

          filterTrigger.classList.remove('active');
          filterMenu.classList.remove('active');

          this.paginacao.paginaAtual = 1;
          this.render();
        });
      });
    }

    // Campo de Busca com debounce
    const searchInput = document.getElementById('searchTransacoes');
    if (searchInput) {
      // Criar função debounced para otimizar a busca
      const debouncedSearch = debounce((value) => {
        this.filtros.busca = value;
        this.paginacao.paginaAtual = 1;
        this.render();
      }, 300); // 300ms de atraso

      searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value.toLowerCase());
      });
    }

    // Botões de Paginação
    const btnFirstPage = document.getElementById('btnFirstPage');
    if (btnFirstPage) {
      btnFirstPage.addEventListener('click', () => this.irParaPagina(1));
    }

    const btnPrevPage = document.getElementById('btnPrevPage');
    if (btnPrevPage) {
      btnPrevPage.addEventListener('click', () =>
        this.irParaPagina(this.paginacao.paginaAtual - 1)
      );
    }

    const btnNextPage = document.getElementById('btnNextPage');
    if (btnNextPage) {
      btnNextPage.addEventListener('click', () =>
        this.irParaPagina(this.paginacao.paginaAtual + 1)
      );
    }

    const btnLastPage = document.getElementById('btnLastPage');
    if (btnLastPage) {
      btnLastPage.addEventListener('click', () => this.irParaPagina(this.paginacao.totalPaginas));
    }

    // Seletor de Itens por Página
    const pageSize = document.getElementById('pageSize');
    if (pageSize) {
      pageSize.addEventListener('change', (e) => {
        this.paginacao.itensPorPagina = parseInt(e.target.value);
        this.paginacao.paginaAtual = 1;
        this.render();
      });
    }
  },

  exportarCSV() {
    const transacoes = this.getTransacoesFiltradas();

    if (transacoes.length === 0) {
      Utils.showWarning('Nenhuma transação para exportar');
      return;
    }

    let csv = 'Data,Descrição,Categoria,Conta,Tipo,Valor,Observações\n';

    transacoes.forEach((t) => {
      const linha = [
        t.data,
        `"${t.descricao}"`,
        `"${t.categoria_nome}"`,
        `"${t.conta_nome}"`,
        t.tipo,
        t.valor,
        `"${t.observacoes || ''}"`,
      ].join(',');
      csv += linha + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${this.filtros.ano}_${this.filtros.mes}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Utils.showSuccess(`Exportadas ${transacoes.length} transações`);
  },

  getTransacoesFiltradas() {
    let transacoes = [...AppState.transacoes];

    const primeiroDia = new Date(this.filtros.ano, this.filtros.mes - 1, 1);
    const ultimoDia = new Date(this.filtros.ano, this.filtros.mes, 0);

    const dataInicio = primeiroDia.toISOString().split('T')[0];
    const dataFim = ultimoDia.toISOString().split('T')[0];

    transacoes = transacoes.filter((t) => t.data >= dataInicio && t.data <= dataFim);

    if (this.filtros.tipo) {
      transacoes = transacoes.filter((t) => t.tipo === this.filtros.tipo);
    }

    if (this.filtros.busca) {
      transacoes = transacoes.filter(
        (t) =>
          t.descricao.toLowerCase().includes(this.filtros.busca) ||
          t.categoria_nome.toLowerCase().includes(this.filtros.busca) ||
          t.conta_nome.toLowerCase().includes(this.filtros.busca)
      );
    }

    return transacoes;
  },

  calcularPaginacao(totalItens) {
    this.paginacao.totalItens = totalItens;
    this.paginacao.totalPaginas = Math.ceil(totalItens / this.paginacao.itensPorPagina);

    if (this.paginacao.paginaAtual > this.paginacao.totalPaginas) {
      this.paginacao.paginaAtual = Math.max(1, this.paginacao.totalPaginas);
    }
  },

  getTransacoesPaginadas(transacoes) {
    const inicio = (this.paginacao.paginaAtual - 1) * this.paginacao.itensPorPagina;
    const fim = inicio + this.paginacao.itensPorPagina;
    return transacoes.slice(inicio, fim);
  },

  irParaPagina(pagina) {
    if (pagina < 1 || pagina > this.paginacao.totalPaginas) return;
    this.paginacao.paginaAtual = pagina;
    this.render();
  },

  renderizarControlesPaginacao() {
    const controls = document.getElementById('paginationControls');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationPages = document.getElementById('paginationPages');

    if (!controls || !paginationInfo || !paginationPages) return;

    // Ocultar paginação se não há itens ou se há apenas uma página (10 ou menos itens)
    if (this.paginacao.totalItens === 0 || this.paginacao.totalPaginas <= 1) {
      controls.style.display = 'none';
      return;
    }

    controls.style.display = 'flex';

    const inicio = (this.paginacao.paginaAtual - 1) * this.paginacao.itensPorPagina + 1;
    const fim = Math.min(
      this.paginacao.paginaAtual * this.paginacao.itensPorPagina,
      this.paginacao.totalItens
    );

    paginationInfo.textContent = `Mostrando ${inicio}-${fim} de ${this.paginacao.totalItens} transações`;

    paginationPages.innerHTML = '';

    const btnFirst = document.getElementById('btnFirstPage');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    const btnLast = document.getElementById('btnLastPage');

    btnFirst.disabled = this.paginacao.paginaAtual === 1;
    btnPrev.disabled = this.paginacao.paginaAtual === 1;
    btnNext.disabled = this.paginacao.paginaAtual === this.paginacao.totalPaginas;
    btnLast.disabled = this.paginacao.paginaAtual === this.paginacao.totalPaginas;

    const maxPaginas = 5;
    let inicioPaginas = Math.max(1, this.paginacao.paginaAtual - Math.floor(maxPaginas / 2));
    let fimPaginas = Math.min(this.paginacao.totalPaginas, inicioPaginas + maxPaginas - 1);

    if (fimPaginas - inicioPaginas < maxPaginas - 1) {
      inicioPaginas = Math.max(1, fimPaginas - maxPaginas + 1);
    }

    if (inicioPaginas > 1) {
      const btn = document.createElement('button');
      btn.className = 'pagination-page-btn';
      btn.textContent = '1';
      btn.addEventListener('click', () => this.irParaPagina(1));
      paginationPages.appendChild(btn);

      if (inicioPaginas > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationPages.appendChild(ellipsis);
      }
    }

    for (let i = inicioPaginas; i <= fimPaginas; i++) {
      const btn = document.createElement('button');
      btn.className = 'pagination-page-btn';
      if (i === this.paginacao.paginaAtual) {
        btn.classList.add('active');
      }
      btn.textContent = i;
      btn.addEventListener('click', () => this.irParaPagina(i));
      paginationPages.appendChild(btn);
    }

    if (fimPaginas < this.paginacao.totalPaginas) {
      if (fimPaginas < this.paginacao.totalPaginas - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        paginationPages.appendChild(ellipsis);
      }

      const btn = document.createElement('button');
      btn.className = 'pagination-page-btn';
      btn.textContent = this.paginacao.totalPaginas;
      btn.addEventListener('click', () => this.irParaPagina(this.paginacao.totalPaginas));
      paginationPages.appendChild(btn);
    }
  },

  openModal() {
    const modal = document.getElementById('modalNovaTransacao');
    if (modal) {
      modal.classList.add('active');
      ModalAccessibility.open(modal);

      const form = document.getElementById('formNovaTransacao');
      if (form) {
        form.reset();
      }

      const dataInput = document.getElementById('transacaoData');
      if (dataInput) {
        dataInput.value = Utils.getTodayDate();
      }

      this.updateContasSelect();
      this.updateCategoriasSelect('receita');
    }
  },

  closeModal() {
    const modal = document.getElementById('modalNovaTransacao');
    if (modal) {
      modal.classList.remove('active');
      ModalAccessibility.close(modal);
    }
  },

  openEditModal(transacao) {
    const modal = document.getElementById('modalEditarTransacao');
    if (!modal) return;

    this.currentEditId = transacao.id;

    document.getElementById('editTransacaoId').value = transacao.id;
    document.getElementById('editTransacaoDescricao').value = transacao.descricao;
    document.getElementById('editTransacaoValor').value = transacao.valor;
    document.getElementById('editTransacaoTipo').value = transacao.tipo;
    document.getElementById('editTransacaoData').value = transacao.data;
    document.getElementById('editTransacaoObservacoes').value = transacao.observacoes || '';

    this.updateEditContasSelect(transacao.conta_id);
    this.updateEditCategoriasSelect(transacao.tipo, transacao.categoria_id);

    modal.classList.add('active');
    ModalAccessibility.open(modal);
  },

  closeEditModal() {
    const modal = document.getElementById('modalEditarTransacao');
    if (modal) {
      modal.classList.remove('active');
      ModalAccessibility.close(modal);
    }
    this.currentEditId = null;
  },

  updateContasSelect() {
    const select = document.getElementById('transacaoConta');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma conta</option>';

    AppState.contas.forEach((conta) => {
      const option = document.createElement('option');
      option.value = conta.id;
      option.textContent = `${conta.nome} - ${Utils.formatCurrency(conta.saldo)}`;
      select.appendChild(option);
    });
  },

  updateEditContasSelect(selectedId) {
    const select = document.getElementById('editTransacaoConta');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma conta</option>';

    AppState.contas.forEach((conta) => {
      const option = document.createElement('option');
      option.value = conta.id;
      option.textContent = `${conta.nome} - ${Utils.formatCurrency(conta.saldo)}`;
      if (conta.id === selectedId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  },

  updateCategoriasSelect(tipo) {
    const select = document.getElementById('transacaoCategoria');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma categoria</option>';

    const categoriasFiltradas = AppState.categorias.filter((cat) => cat.tipo === tipo);

    categoriasFiltradas.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.nome;
      select.appendChild(option);
    });
  },

  updateEditCategoriasSelect(tipo, selectedId) {
    const select = document.getElementById('editTransacaoCategoria');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma categoria</option>';

    const categoriasFiltradas = AppState.categorias.filter((cat) => cat.tipo === tipo);

    categoriasFiltradas.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.nome;
      if (cat.id === selectedId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  },

  async handleSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const formData = {
      usuario_id: AppState.currentUser.id,
      descricao: document.getElementById('transacaoDescricao').value,
      valor: parseFloat(document.getElementById('transacaoValor').value),
      tipo: document.getElementById('transacaoTipo').value,
      data: document.getElementById('transacaoData').value,
      conta_id: parseInt(document.getElementById('transacaoConta').value),
      categoria_id: parseInt(document.getElementById('transacaoCategoria').value),
      observacoes: document.getElementById('transacaoObservacoes').value || undefined,
    };

    if (
      !formData.descricao ||
      !formData.valor ||
      !formData.data ||
      !formData.conta_id ||
      !formData.categoria_id
    ) {
      Utils.showError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await window.api.transacao.create(formData);

      if (response.success) {
        Utils.showSuccess('Transação cadastrada com sucesso!');
        this.closeModal();
        await DataManager.loadAll();
        this.render();
        this.updateSummaryCards();

        if (typeof DashboardPage !== 'undefined') {
          DashboardPage.render();
        }
      } else {
        Utils.showError(response.error || 'Erro ao cadastrar transação');
      }
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      Utils.showError('Erro ao criar transação');
    }
  },

  async handleEditSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser || !this.currentEditId) {
      Utils.showError('Erro ao identificar transação');
      return;
    }

    const formData = {
      descricao: document.getElementById('editTransacaoDescricao').value,
      valor: parseFloat(document.getElementById('editTransacaoValor').value),
      tipo: document.getElementById('editTransacaoTipo').value,
      data: document.getElementById('editTransacaoData').value,
      conta_id: parseInt(document.getElementById('editTransacaoConta').value),
      categoria_id: parseInt(document.getElementById('editTransacaoCategoria').value),
      observacoes: document.getElementById('editTransacaoObservacoes').value || undefined,
    };

    if (
      !formData.descricao ||
      !formData.valor ||
      !formData.data ||
      !formData.conta_id ||
      !formData.categoria_id
    ) {
      Utils.showError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Os triggers SQL atualizam o saldo automaticamente
      // Não é necessário calcular manualmente
      const response = await window.api.transacao.update(this.currentEditId, AppState.currentUser.id, formData);

      if (response.success) {
        Utils.showSuccess('Transação atualizada com sucesso!');
        this.closeEditModal();
        await DataManager.loadAll();
        this.render();
        this.updateSummaryCards();

        if (typeof DashboardPage !== 'undefined') {
          DashboardPage.render();
        }
      } else {
        Utils.showError(response.error || 'Erro ao atualizar transação');
      }
    } catch (error) {
      console.error('Erro ao editar transação:', error);
      Utils.showError('Erro ao editar transação');
    }
  },

  async handleDelete(id) {
    if (!Utils.confirm('Deseja realmente excluir esta transação?')) {
      return;
    }

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    try {
      const response = await window.api.transacao.delete(id, AppState.currentUser.id);

      if (response.success) {
        Utils.showSuccess('Transação excluída com sucesso!');
        await DataManager.loadAll();
        this.render();
        this.updateSummaryCards();

        if (typeof DashboardPage !== 'undefined') {
          DashboardPage.render();
        }
      } else {
        Utils.showError(response.error || 'Erro ao excluir transação');
      }
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      Utils.showError('Erro ao excluir transação');
    }
  },

  render() {
    const tbody = document.getElementById('transacoesBody');
    const table = document.getElementById('transacoesTable');
    const emptyState = document.getElementById('emptyStateTransacoes');

    if (!tbody || !table || !emptyState) return;

    const transacoesFiltradas = this.getTransacoesFiltradas();

    this.calcularPaginacao(transacoesFiltradas.length);

    if (transacoesFiltradas.length === 0) {
      table.style.display = 'none';
      emptyState.style.display = 'block';
      emptyState.innerHTML = '<p>Nenhuma transação encontrada com os filtros aplicados</p>';
      this.renderizarControlesPaginacao();
      return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    const transacoesPaginadas = this.getTransacoesPaginadas(transacoesFiltradas);

    tbody.innerHTML = '';

    transacoesPaginadas.forEach((transacao) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
                <td>${Utils.formatDate(transacao.data)}</td>
                <td>${Utils.escapeHtml(transacao.descricao)}</td>
                <td>
                    <div class="transacao-categoria">
                        ${transacao.categoria_cor ? `<span class="categoria-cor" style="background-color: ${Utils.escapeHtml(transacao.categoria_cor)};"></span>` : ''}
                        <span>${Utils.escapeHtml(transacao.categoria_nome)}</span>
                    </div>
                </td>
                <td>${Utils.escapeHtml(transacao.conta_nome)}</td>
                <td>
                    <span class="tipo-badge ${Utils.escapeHtml(transacao.tipo)}">
                        ${transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                </td>
                <td style="font-weight: 700; color: ${transacao.tipo === 'receita' ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${Utils.formatCurrency(transacao.valor)}
                </td>
                <td>
                    <button class="btn btn-secondary btn-icon" data-id="${transacao.id}" data-action="edit">✏️</button>
                    <button class="btn btn-danger btn-icon" data-id="${transacao.id}" data-action="delete">🗑️</button>
                </td>
            `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const transacao = AppState.transacoes.find((t) => t.id === id);
        if (transacao) {
          this.openEditModal(transacao);
        }
      });
    });

    tbody.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.handleDelete(id);
      });
    });

    this.renderizarControlesPaginacao();
  },
};
