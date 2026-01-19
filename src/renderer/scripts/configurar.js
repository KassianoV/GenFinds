// src/renderer/scripts/configurar.js

const ConfigurarPage = {
  currentTab: 'contas',
  isRendering: false,
  renderTimeout: null,

  init() {
    this.attachEventListeners();
    this.render();
  },

  attachEventListeners() {
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Forms - Criar
    this.attachFormListeners();

    // Modals - Editar
    this.attachEditModalListeners();
  },

  attachFormListeners() {
    // Form Conta
    const formConta = document.getElementById('formConta');
    if (formConta) {
      formConta.addEventListener('submit', (e) => this.handleContaSubmit(e));
    }

    // Form Categoria
    const formCategoria = document.getElementById('formCategoria');
    if (formCategoria) {
      formCategoria.addEventListener('submit', (e) => this.handleCategoriaSubmit(e));
    }

    // Form Orçamento
    const formOrcamento = document.getElementById('formOrcamento');
    if (formOrcamento) {
      formOrcamento.addEventListener('submit', (e) => this.handleOrcamentoSubmit(e));
    }
  },

  attachEditModalListeners() {
    // Modal Editar Conta
    const btnCloseEditConta = document.getElementById('closeModalEditarConta');
    if (btnCloseEditConta) {
      btnCloseEditConta.addEventListener('click', () => this.closeEditModal('conta'));
    }

    const btnCancelEditConta = document.getElementById('cancelModalEditarConta');
    if (btnCancelEditConta) {
      btnCancelEditConta.addEventListener('click', () => this.closeEditModal('conta'));
    }

    const formEditConta = document.getElementById('formEditarConta');
    if (formEditConta) {
      formEditConta.addEventListener('submit', (e) => this.handleEditContaSubmit(e));
    }

    // Modal Editar Categoria
    const btnCloseEditCategoria = document.getElementById('closeModalEditarCategoria');
    if (btnCloseEditCategoria) {
      btnCloseEditCategoria.addEventListener('click', () => this.closeEditModal('categoria'));
    }

    const btnCancelEditCategoria = document.getElementById('cancelModalEditarCategoria');
    if (btnCancelEditCategoria) {
      btnCancelEditCategoria.addEventListener('click', () => this.closeEditModal('categoria'));
    }

    const formEditCategoria = document.getElementById('formEditarCategoria');
    if (formEditCategoria) {
      formEditCategoria.addEventListener('submit', (e) => this.handleEditCategoriaSubmit(e));
    }

    // Modal Editar Orçamento
    const btnCloseEditOrcamento = document.getElementById('closeModalEditarOrcamento');
    if (btnCloseEditOrcamento) {
      btnCloseEditOrcamento.addEventListener('click', () => this.closeEditModal('orcamento'));
    }

    const btnCancelEditOrcamento = document.getElementById('cancelModalEditarOrcamento');
    if (btnCancelEditOrcamento) {
      btnCancelEditOrcamento.addEventListener('click', () => this.closeEditModal('orcamento'));
    }

    const formEditOrcamento = document.getElementById('formEditarOrcamento');
    if (formEditOrcamento) {
      formEditOrcamento.addEventListener('submit', (e) => this.handleEditOrcamentoSubmit(e));
    }
  },

  switchTab(tabName) {
    // Prevenir múltiplos renders simultâneos
    if (this.isRendering) {
      return;
    }

    // Cancelar timeout anterior se existir
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.currentTab = tabName;

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach((content) => {
      if (content.id === `tab-${tabName}`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Debounce de 100ms antes de renderizar
    this.renderTimeout = setTimeout(() => {
      this.renderTab(tabName);
    }, 100);
  },

  render() {
    this.renderTab(this.currentTab);
  },

  renderTab(tabName) {
    // Marcar como renderizando
    this.isRendering = true;

    try {
      switch (tabName) {
        case 'contas':
          this.renderContas();
          break;
        case 'categoria':
          this.renderCategorias();
          break;
        case 'orcamento':
          this.renderOrcamentos();
          this.updateOrcamentoCategorias();
          break;
      }
    } finally {
      // Desmarcar após um pequeno delay
      setTimeout(() => {
        this.isRendering = false;
      }, 50);
    }
  },

  // ========== CONTAS ==========

  openEditModalConta(conta) {
    const modal = document.getElementById('modalEditarConta');
    if (!modal) return;

    document.getElementById('editContaId').value = conta.id;
    document.getElementById('editContaNome').value = conta.nome;
    document.getElementById('editContaSaldo').value = conta.saldo;
    document.getElementById('editContaTipo').value = conta.tipo;

    modal.classList.add('active');
  },

  closeEditModal(type) {
    const modalMap = {
      conta: 'modalEditarConta',
      categoria: 'modalEditarCategoria',
      orcamento: 'modalEditarOrcamento',
    };

    const modal = document.getElementById(modalMap[type]);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  async handleContaSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const nome = document.getElementById('contaNome')?.value?.trim() || '';
    if (!nome) {
      Utils.showWarning('Por favor, preencha o nome da conta');
      return;
    }

    const tipo = document.getElementById('contaTipo')?.value || '';
    if (!tipo) {
      Utils.showWarning('Por favor, selecione o tipo da conta');
      return;
    }

    const saldoValue = document.getElementById('contaSaldo')?.value || '0';
    const saldo = parseFloat(saldoValue) || 0;

    const formData = {
      usuario_id: AppState.currentUser.id,
      nome: nome,
      saldo: isNaN(saldo) ? 0 : saldo,
      tipo: tipo,
      ativa: true
    };

    try {
      const response = await window.api.conta.create(formData);

      if (response.success) {
        Utils.showSuccess('Conta cadastrada com sucesso!');
        await DataManager.loadContas();
        e.target.reset();
        this.renderContas();
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      Utils.showError('Erro ao criar conta');
    }
  },

  async handleEditContaSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const id = parseInt(document.getElementById('editContaId').value);
    const nome = document.getElementById('editContaNome').value.trim();
    if (!nome) {
      Utils.showWarning('Por favor, preencha o nome da conta');
      return;
    }

    const tipo = document.getElementById('editContaTipo').value;
    if (!tipo) {
      Utils.showWarning('Por favor, selecione o tipo da conta');
      return;
    }

    const saldoValue = document.getElementById('editContaSaldo').value;
    const saldo = saldoValue ? parseFloat(saldoValue) : 0;

    const updates = {
      nome: nome,
      saldo: isNaN(saldo) ? 0 : saldo,
      tipo: tipo,
    };

    try {
      const response = await window.api.conta.update(id, AppState.currentUser.id, updates);

      if (response.success) {
        Utils.showSuccess('Conta atualizada com sucesso!');
        this.closeEditModal('conta');
        await DataManager.loadContas();
        this.renderContas();

        // Atualizar dashboard se visível
        if (typeof DashboardPage !== 'undefined') {
          DashboardPage.render();
        }
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      Utils.showError('Erro ao atualizar conta');
    }
  },

  async handleContaDelete(id) {
    if (!Utils.confirm('Deseja realmente excluir esta conta?')) {
      return;
    }

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    try {
      const response = await window.api.conta.delete(id, AppState.currentUser.id);

      if (response.success) {
        Utils.showSuccess('Conta excluída com sucesso!');
        await DataManager.loadContas();
        this.renderContas();
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      Utils.showError('Erro ao excluir conta');
    }
  },

  renderContas() {
    const list = document.getElementById('contasList');
    if (!list) return;

    if (AppState.contas.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Nenhuma conta cadastrada</p></div>';
      return;
    }

    list.innerHTML = '';

    AppState.contas.forEach((conta) => {
      const item = document.createElement('div');
      item.className = 'item-card';
      item.style.cssText =
        'padding: 15px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';

      item.innerHTML = `
                <div class="item-info">
                    <div class="item-name" style="font-weight: 600; margin-bottom: 5px;">${conta.nome}</div>
                    <div class="item-details" style="display: flex; gap: 15px; font-size: 13px; color: var(--text-secondary);">
                        <span style="padding: 4px 12px; border-radius: 12px; background-color: var(--bg-light); text-transform: capitalize;">${conta.tipo}</span>
                        <span style="font-weight: 700; font-size: 16px; color: ${conta.saldo >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                            ${Utils.formatCurrency(conta.saldo)}
                        </span>
                    </div>
                </div>
                <div class="item-actions" style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary btn-icon" data-id="${conta.id}" data-action="edit">✏️</button>
                    <button class="btn btn-danger btn-icon" data-id="${conta.id}" data-action="delete">🗑️</button>
                </div>
            `;

      list.appendChild(item);
    });

    // Eventos de editar
    list.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const conta = AppState.contas.find((c) => c.id === id);
        if (conta) {
          this.openEditModalConta(conta);
        }
      });
    });

    // Eventos de excluir
    list.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.handleContaDelete(id);
      });
    });
  },

  // ========== CATEGORIAS ==========

  openEditModalCategoria(categoria) {
    const modal = document.getElementById('modalEditarCategoria');
    if (!modal) return;

    document.getElementById('editCategoriaId').value = categoria.id;
    document.getElementById('editCategoriaNome').value = categoria.nome;
    document.getElementById('editCategoriaTipo').value = categoria.tipo;
    document.getElementById('editCategoriaCor').value = categoria.cor || '#4CAF50';

    modal.classList.add('active');
  },

  async handleCategoriaSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const nome = document.getElementById('categoriaNome').value.trim();
    if (!nome) {
      Utils.showWarning('Por favor, preencha o nome da categoria');
      return;
    }

    const tipo = document.getElementById('categoriaTipo').value;
    if (!tipo) {
      Utils.showWarning('Por favor, selecione o tipo da categoria');
      return;
    }

    const formData = {
      usuario_id: AppState.currentUser.id,
      nome: nome,
      tipo: tipo,
      cor: document.getElementById('categoriaCor').value || '#4CAF50'
    };

    try {
      const response = await window.api.categoria.create(formData);

      if (response.success) {
        Utils.showSuccess('Categoria cadastrada com sucesso!');
        await DataManager.loadCategorias();
        e.target.reset();
        this.renderCategorias();
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Utils.showError('Erro ao criar categoria');
    }
  },

  async handleEditCategoriaSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const id = parseInt(document.getElementById('editCategoriaId').value);
    const nome = document.getElementById('editCategoriaNome').value.trim();
    if (!nome) {
      Utils.showWarning('Por favor, preencha o nome da categoria');
      return;
    }

    const tipo = document.getElementById('editCategoriaTipo').value;
    if (!tipo) {
      Utils.showWarning('Por favor, selecione o tipo da categoria');
      return;
    }

    const updates = {
      nome: nome,
      tipo: tipo,
      cor: document.getElementById('editCategoriaCor').value || '#4CAF50',
    };

    try {
      const response = await window.api.categoria.update(id, AppState.currentUser.id, updates);

      if (response.success) {
        Utils.showSuccess('Categoria atualizada com sucesso!');
        this.closeEditModal('categoria');
        await DataManager.loadCategorias();
        this.renderCategorias();
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      Utils.showError('Erro ao atualizar categoria');
    }
  },

  async handleCategoriaDelete(id) {
    if (!Utils.confirm('Deseja realmente excluir esta categoria?')) {
      return;
    }

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    try {
      const response = await window.api.categoria.delete(id, AppState.currentUser.id);

      if (response.success) {
        Utils.showSuccess('Categoria excluída com sucesso!');
        await DataManager.loadCategorias();
        this.renderCategorias();
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      Utils.showError('Erro ao excluir categoria');
    }
  },

  renderCategorias() {
    const list = document.getElementById('categoriasList');
    if (!list) return;

    if (AppState.categorias.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Nenhuma categoria cadastrada</p></div>';
      return;
    }

    list.innerHTML = '';

    AppState.categorias.forEach((categoria) => {
      const item = document.createElement('div');
      item.className = 'item-card';
      item.style.cssText =
        'padding: 15px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';

      item.innerHTML = `
                <div class="item-info" style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; border-radius: 4px; border: 2px solid var(--border-color); background-color: ${categoria.cor || '#ccc'};"></div>
                    <div>
                        <div class="item-name" style="font-weight: 600; margin-bottom: 5px;">${categoria.nome}</div>
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; background-color: ${categoria.tipo === 'receita' ? '#e8f5e9' : '#ffebee'}; color: ${categoria.tipo === 'receita' ? '#2e7d32' : '#c62828'};">
                            ${categoria.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                    </div>
                </div>
                <div class="item-actions" style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary btn-icon" data-id="${categoria.id}" data-action="edit">✏️</button>
                    <button class="btn btn-danger btn-icon" data-id="${categoria.id}" data-action="delete">🗑️</button>
                </div>
            `;

      list.appendChild(item);
    });

    // Eventos de editar
    list.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const categoria = AppState.categorias.find((c) => c.id === id);
        if (categoria) {
          this.openEditModalCategoria(categoria);
        }
      });
    });

    // Eventos de excluir
    list.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.handleCategoriaDelete(id);
      });
    });
  },

  // ========== ORÇAMENTOS ==========

  openEditModalOrcamento(orcamento) {
    const modal = document.getElementById('modalEditarOrcamento');
    if (!modal) return;

    document.getElementById('editOrcamentoId').value = orcamento.id;
    document.getElementById('editOrcamentoCategoria').value = orcamento.categoria_id;
    document.getElementById('editOrcamentoValor').value = orcamento.valor_planejado;
    document.getElementById('editOrcamentoMes').value = orcamento.mes;
    document.getElementById('editOrcamentoAno').value = orcamento.ano;

    // Atualizar select de categorias
    this.updateEditOrcamentoCategorias();

    modal.classList.add('active');
  },

  updateOrcamentoCategorias() {
    const select = document.getElementById('orcamentoCategoria');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma categoria</option>';

    const categoriasDespesa = AppState.categorias.filter((c) => c.tipo === 'despesa');

    categoriasDespesa.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.nome;
      select.appendChild(option);
    });
  },

  updateEditOrcamentoCategorias() {
    const select = document.getElementById('editOrcamentoCategoria');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma categoria</option>';

    const categoriasDespesa = AppState.categorias.filter((c) => c.tipo === 'despesa');

    categoriasDespesa.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.nome;
      select.appendChild(option);
    });
  },

  async handleOrcamentoSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const formData = {
      usuario_id: AppState.currentUser.id,
      categoria_id: parseInt(document.getElementById('orcamentoCategoria').value),
      valor_planejado: parseFloat(document.getElementById('orcamentoValor').value),
      mes: parseInt(document.getElementById('orcamentoMes').value),
      ano: parseInt(document.getElementById('orcamentoAno').value)
    };

    try {
      const response = await window.api.orcamento.create(formData);

      if (response.success) {
        Utils.showSuccess('Orçamento cadastrado com sucesso!');
        await DataManager.loadOrcamentos();
        e.target.reset();
        this.renderOrcamentos();
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      Utils.showError('Erro ao criar orçamento');
    }
  },

  async handleEditOrcamentoSubmit(e) {
    e.preventDefault();

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    const id = parseInt(document.getElementById('editOrcamentoId').value);
    const updates = {
      categoria_id: parseInt(document.getElementById('editOrcamentoCategoria').value),
      valor_planejado: parseFloat(document.getElementById('editOrcamentoValor').value),
      mes: parseInt(document.getElementById('editOrcamentoMes').value),
      ano: parseInt(document.getElementById('editOrcamentoAno').value),
    };

    try {
      const response = await window.api.orcamento.update(id, AppState.currentUser.id, updates);

      if (response.success) {
        Utils.showSuccess('Orçamento atualizado com sucesso!');
        this.closeEditModal('orcamento');
        await DataManager.loadOrcamentos();
        this.renderOrcamentos();

        // Atualizar dashboard
        if (typeof DashboardPage !== 'undefined') {
          DashboardPage.render();
        }
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      Utils.showError('Erro ao atualizar orçamento');
    }
  },

  async handleOrcamentoDelete(id) {
    if (!Utils.confirm('Deseja realmente excluir este orçamento?')) {
      return;
    }

    if (!AppState.currentUser) {
      Utils.showError('Usuário não identificado');
      return;
    }

    try {
      const response = await window.api.orcamento.delete(id, AppState.currentUser.id);

      if (response.success) {
        Utils.showSuccess('Orçamento excluído com sucesso!');
        await DataManager.loadOrcamentos();
        this.renderOrcamentos();
      } else {
        Utils.showError(response.error);
      }
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      Utils.showError('Erro ao excluir orçamento');
    }
  },

  renderOrcamentos() {
    const list = document.getElementById('orcamentosList');
    if (!list) return;

    if (AppState.orcamentos.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Nenhum orçamento cadastrado</p></div>';
      return;
    }

    list.innerHTML = '';

    const meses = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    AppState.orcamentos.forEach((orcamento) => {
      const categoria = AppState.categorias.find((c) => c.id === orcamento.categoria_id);
      const categoriaNome = categoria ? categoria.nome : 'Categoria não encontrada';

      const item = document.createElement('div');
      item.className = 'item-card';
      item.style.cssText =
        'padding: 15px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';

      item.innerHTML = `
                <div class="item-info">
                    <div class="item-name" style="font-weight: 600; margin-bottom: 5px;">${categoriaNome}</div>
                    <div class="item-details" style="display: flex; gap: 15px; font-size: 13px; color: var(--text-secondary);">
                        <span>${meses[orcamento.mes - 1]} / ${orcamento.ano}</span>
                        <span><strong>Planejado:</strong> ${Utils.formatCurrency(orcamento.valor_planejado)}</span>
                    </div>
                </div>
                <div class="item-actions" style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary btn-icon" data-id="${orcamento.id}" data-action="edit">✏️</button>
                    <button class="btn btn-danger btn-icon" data-id="${orcamento.id}" data-action="delete">🗑️</button>
                </div>
            `;

      list.appendChild(item);
    });

    // Eventos de editar
    list.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        const orcamento = AppState.orcamentos.find((o) => o.id === id);
        if (orcamento) {
          this.openEditModalOrcamento(orcamento);
        }
      });
    });

    // Eventos de excluir
    list.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.handleOrcamentoDelete(id);
      });
    });
  },
};
