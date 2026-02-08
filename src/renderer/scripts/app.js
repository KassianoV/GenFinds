// src/renderer/scripts/app.js

const AppState = {
  currentUser: null,
  contas: [],
  categorias: [],
  orcamentos: [],
  transacoes: [],
};

const Utils = {
  // Função para prevenir XSS - escape de HTML
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  },

  formatDate(dateString) {
    // Parse da data como LOCAL para evitar problemas de timezone
    // Se vier no formato YYYY-MM-DD, fazer parse manual
    if (dateString.includes('-')) {
      const [ano, mes, dia] = dateString.split('-').map(Number);
      const date = new Date(ano, mes - 1, dia); // mes - 1 porque JS usa 0-11
      return date.toLocaleDateString('pt-BR');
    }
    // Fallback para outros formatos
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  },

  getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // NOVO: Sistema de Toast
  showToast(message, type = 'info', title = null) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      // Fallback para alert se container não existir
      alert(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    const titles = {
      success: title || 'Sucesso',
      error: title || 'Erro',
      warning: title || 'Atenção',
      info: title || 'Informação',
    };

    // ✅ CORREÇÃO XSS: Usar DOM APIs em vez de innerHTML para prevenir XSS
    const toastIcon = document.createElement('div');
    toastIcon.className = 'toast-icon';
    toastIcon.textContent = icons[type];

    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';

    const toastTitle = document.createElement('p');
    toastTitle.className = 'toast-title';
    toastTitle.textContent = titles[type];

    const toastMessage = document.createElement('p');
    toastMessage.className = 'toast-message';
    toastMessage.textContent = message; // textContent é seguro contra XSS

    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => toast.remove());

    toastContent.appendChild(toastTitle);
    toastContent.appendChild(toastMessage);

    toast.appendChild(toastIcon);
    toast.appendChild(toastContent);
    toast.appendChild(closeButton);

    container.appendChild(toast);

    // Auto remover após 4 segundos
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }, 4000);

    // Remover ao clicar
    toast.addEventListener('click', (e) => {
      if (!e.target.classList.contains('toast-close')) {
        toast.classList.add('hiding');
        setTimeout(() => {
          if (toast.parentElement) {
            toast.remove();
          }
        }, 300);
      }
    });
  },

  showSuccess(message, title) {
    this.showToast(message, 'success', title);
  },

  showError(message, title) {
    this.showToast(message, 'error', title);
  },

  showWarning(message, title) {
    this.showToast(message, 'warning', title);
  },

  showInfo(message, title) {
    this.showToast(message, 'info', title);
  },

  confirm(message) {
    return confirm(message);
  },
};

const UserManager = {
  /**
   * Define o usuário atual (chamado após login)
   */
  setUser(usuario) {
    AppState.currentUser = usuario;
    console.log('Usuário definido:', AppState.currentUser);
  },

  /**
   * Obtém o usuário atual
   */
  getUser() {
    return AppState.currentUser;
  },
};

const DataManager = {
  async loadContas() {
    if (!AppState.currentUser) return;

    const response = await window.api.conta.list(AppState.currentUser.id);
    if (response.success) {
      AppState.contas = response.data || [];
      console.log('Contas carregadas:', AppState.contas.length);
    }
  },

  async loadCategorias() {
    if (!AppState.currentUser) return;

    const response = await window.api.categoria.list(AppState.currentUser.id);
    if (response.success) {
      AppState.categorias = response.data || [];
      console.log('Categorias carregadas:', AppState.categorias.length);
    }
  },

  async loadOrcamentos() {
    if (!AppState.currentUser) return;

    const response = await window.api.orcamento.list(AppState.currentUser.id);
    if (response.success) {
      AppState.orcamentos = response.data || [];
      console.log('Orçamentos carregados:', AppState.orcamentos.length);
    }
  },

  async loadTransacoes() {
    if (!AppState.currentUser) return;

    const response = await window.api.transacao.list(AppState.currentUser.id);
    if (response.success) {
      AppState.transacoes = response.data || [];
      console.log('Transações carregadas:', AppState.transacoes.length);
    }
  },

  async loadAll() {
    await this.loadContas();
    await this.loadCategorias();
    await this.loadOrcamentos();
    await this.loadTransacoes();
  },
};

/**
 * Inicializa a aplicação após autenticação bem-sucedida
 * Esta função é chamada pelo AuthManager após login/registro
 */
async function initAppAfterAuth(usuario) {
  console.log('🚀 Inicializando aplicação após autenticação...');

  try {
    // Definir usuário
    UserManager.setUser(usuario);

    // Carregar dados
    await DataManager.loadAll();

    console.log('✅ Dados carregados');
    console.log('Estado atual:', AppState);

    // Inicializar Navigation
    if (typeof Navigation !== 'undefined') {
      Navigation.init();
      console.log('✅ Navigation inicializado');
    }

    // Inicializar Dashboard
    if (typeof DashboardPage !== 'undefined') {
      DashboardPage.init();
      console.log('✅ Dashboard inicializado');
    }

    // Inicializar Transações
    if (typeof TransacoesPage !== 'undefined') {
      TransacoesPage.init();
      console.log('✅ Transações inicializado');
    } else {
      console.error('❌ TransacoesPage não encontrado!');
    }

    // Inicializar Relatório
    if (typeof RelatorioPage !== 'undefined') {
      RelatorioPage.init();
      console.log('✅ Relatório inicializado');
    }

    // Inicializar Configurar
    if (typeof ConfigurarPage !== 'undefined') {
      ConfigurarPage.init();
      console.log('✅ Configurar inicializado');
    }

    console.log('🎉 Aplicação inicializada com sucesso!');

    // Mostrar mensagem de boas-vindas
    Utils.showSuccess(`Bem-vindo(a), ${usuario.nome}!`);
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    Utils.showError('Erro ao carregar dados. Tente novamente.');
  }
}

// ========== ACESSIBILIDADE DE MODAIS (Focus Trap) ==========

const ModalAccessibility = {
  _previouslyFocused: null,
  _activeModal: null,
  _boundKeyHandler: null,

  /**
   * Abre um modal com focus trap e acessibilidade completa
   */
  open(modalElement) {
    if (!modalElement) return;

    // Salvar elemento com foco antes de abrir o modal
    this._previouslyFocused = document.activeElement;
    this._activeModal = modalElement;

    // Mover foco para o primeiro elemento focável dentro do modal
    requestAnimationFrame(() => {
      const firstFocusable = this._getFocusableElements(modalElement)[0];
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        modalElement.setAttribute('tabindex', '-1');
        modalElement.focus();
      }
    });

    // Adicionar handler de teclado para trap de foco
    this._boundKeyHandler = (e) => this._handleKeyDown(e, modalElement);
    document.addEventListener('keydown', this._boundKeyHandler);
  },

  /**
   * Fecha o modal e restaura o foco ao elemento anterior
   */
  close(modalElement) {
    if (!modalElement) return;

    // Remover handler de teclado
    if (this._boundKeyHandler) {
      document.removeEventListener('keydown', this._boundKeyHandler);
      this._boundKeyHandler = null;
    }

    this._activeModal = null;

    // Restaurar foco ao elemento que tinha foco antes de abrir o modal
    if (this._previouslyFocused && this._previouslyFocused.focus) {
      this._previouslyFocused.focus();
      this._previouslyFocused = null;
    }
  },

  /**
   * Handler de teclado para trap de foco e fechamento com Escape
   */
  _handleKeyDown(e, modalElement) {
    if (e.key === 'Escape') {
      // Fechar modal ao pressionar Escape
      const closeBtn = modalElement.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.click();
      }
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = this._getFocusableElements(modalElement);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: se foco está no primeiro elemento, ir para o último
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: se foco está no último elemento, ir para o primeiro
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  },

  /**
   * Retorna todos os elementos focáveis dentro de um container
   */
  _getFocusableElements(container) {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)).filter(
      (el) => el.offsetParent !== null // Apenas elementos visíveis
    );
  },
};

// A aplicação não inicia automaticamente
// O AuthManager controla quando chamar initAppAfterAuth
