// src/renderer/scripts/app.js

const AppState = {
    currentUser: null,
    contas: [],
    categorias: [],
    orcamentos: [],
    transacoes: []
};

const Utils = {
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    formatDate(dateString) {
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
            info: 'ℹ'
        };

        const titles = {
            success: title || 'Sucesso',
            error: title || 'Erro',
            warning: title || 'Atenção',
            info: title || 'Informação'
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
    }
};

const UserManager = {
    async init() {
        const defaultEmail = 'usuario@exemplo.com';
        
        let response = await window.api.usuario.getByEmail(defaultEmail);
        
        if (!response.success || !response.data) {
            response = await window.api.usuario.create('Usuário Padrão', defaultEmail);
        }
        
        if (response.success && response.data) {
            AppState.currentUser = response.data;
            console.log('Usuário carregado:', AppState.currentUser);
        }
    }
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
    }
};

async function initApp() {
    console.log('🚀 Inicializando aplicação...');
    
    try {
        await UserManager.init();
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
    } catch (error) {
        console.error('❌ Erro ao inicializar aplicação:', error);
    }
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}