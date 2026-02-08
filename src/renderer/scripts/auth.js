// src/renderer/scripts/auth.js

/**
 * Gerenciador de Autenticação
 * Responsável pelo login e registro de usuários
 */
const AuthManager = {
  /**
   * Inicializa o sistema de autenticação
   * Verifica se existe usuário e mostra a tela apropriada
   */
  async init() {
    try {
      const result = await window.api.auth.checkUserExists();

      if (result.success) {
        if (result.data) {
          // Existe usuário - mostrar tela de login
          this.showLoginForm();
        } else {
          // Não existe usuário - mostrar tela de registro
          this.showRegisterForm();
        }
      } else {
        console.error('Erro ao verificar usuário:', result.error);
        this.showRegisterForm();
      }

      // Configurar event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Erro ao inicializar autenticação:', error);
      this.showRegisterForm();
    }
  },

  /**
   * Configura os event listeners dos formulários
   */
  setupEventListeners() {
    // Botão de login
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
      btnLogin.addEventListener('click', () => this.handleLogin());
    }

    // Botão de registro
    const btnRegister = document.getElementById('btnRegister');
    if (btnRegister) {
      btnRegister.addEventListener('click', () => this.handleRegister());
    }

    // Links para alternar entre login e registro
    const showRegister = document.getElementById('showRegister');
    if (showRegister) {
      showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.showRegisterForm();
      });
    }

    const showLogin = document.getElementById('showLogin');
    if (showLogin) {
      showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.showLoginForm();
      });
    }

    // Enter para submeter formulários
    const loginSenha = document.getElementById('loginSenha');
    if (loginSenha) {
      loginSenha.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin();
      });
    }

    const registerConfirmarSenha = document.getElementById('registerConfirmarSenha');
    if (registerConfirmarSenha) {
      registerConfirmarSenha.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleRegister();
      });
    }
  },

  /**
   * Processa o login
   */
  async handleLogin() {
    const nome = document.getElementById('loginNome').value.trim();
    const senha = document.getElementById('loginSenha').value;
    const errorDiv = document.getElementById('loginError');

    // Limpar erro anterior
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    // Validações
    if (!nome) {
      this.showError(errorDiv, 'Digite seu nome de usuário');
      return;
    }

    if (!senha) {
      this.showError(errorDiv, 'Digite sua senha');
      return;
    }

    // Desabilitar botão
    const btnLogin = document.getElementById('btnLogin');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';

    try {
      const result = await window.api.auth.login(nome, senha);

      if (result.success) {
        // Login bem-sucedido
        this.onAuthSuccess(result.data);
      } else {
        this.showError(errorDiv, result.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      this.showError(errorDiv, 'Erro ao conectar com o sistema');
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
    }
  },

  /**
   * Processa o registro
   */
  async handleRegister() {
    const nome = document.getElementById('registerNome').value.trim();
    const senha = document.getElementById('registerSenha').value;
    const confirmarSenha = document.getElementById('registerConfirmarSenha').value;
    const errorDiv = document.getElementById('registerError');

    // Limpar erro anterior
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    // Validações
    if (!nome) {
      this.showError(errorDiv, 'Digite um nome de usuário');
      return;
    }

    if (nome.length < 3) {
      this.showError(errorDiv, 'Nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (!senha) {
      this.showError(errorDiv, 'Digite uma senha');
      return;
    }

    if (senha.length < 4) {
      this.showError(errorDiv, 'Senha deve ter pelo menos 4 caracteres');
      return;
    }

    if (senha !== confirmarSenha) {
      this.showError(errorDiv, 'As senhas não coincidem');
      return;
    }

    // Desabilitar botão
    const btnRegister = document.getElementById('btnRegister');
    btnRegister.disabled = true;
    btnRegister.textContent = 'Criando conta...';

    try {
      const result = await window.api.auth.register(nome, senha);

      if (result.success) {
        // Registro bem-sucedido - fazer login automático
        this.onAuthSuccess(result.data);
      } else {
        this.showError(errorDiv, result.error || 'Erro ao criar conta');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      this.showError(errorDiv, 'Erro ao conectar com o sistema');
    } finally {
      btnRegister.disabled = false;
      btnRegister.textContent = 'Criar Conta';
    }
  },

  /**
   * Callback quando autenticação é bem-sucedida
   */
  onAuthSuccess(usuario) {
    // Esconder tela de auth
    document.getElementById('authScreen').style.display = 'none';

    // Mostrar app
    document.getElementById('appContainer').style.display = 'flex';

    // Atualizar nome do usuário no header
    this.updateUserDisplay(usuario.nome);

    // Configurar menu de usuário
    this.setupUserMenu();

    // Disparar evento para o app inicializar
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('auth:success', usuario);
    }

    // Chamar initApp se existir
    if (typeof initAppAfterAuth === 'function') {
      initAppAfterAuth(usuario);
    }
  },

  /**
   * Atualiza o nome do usuário exibido no header
   */
  updateUserDisplay(nome) {
    const headerUserName = document.getElementById('headerUserName');
    const dropdownUserName = document.getElementById('dropdownUserName');

    if (headerUserName) headerUserName.textContent = nome;
    if (dropdownUserName) dropdownUserName.textContent = nome;
  },

  /**
   * Configura o menu de usuário no header
   */
  setupUserMenu() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const btnAlterarSenha = document.getElementById('btnAlterarSenha');
    const btnLogout = document.getElementById('btnLogout');

    // Toggle do dropdown
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Fechar ao clicar fora
      document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
      });
    }

    // Botão alterar senha
    if (btnAlterarSenha) {
      btnAlterarSenha.addEventListener('click', () => {
        userDropdown.classList.remove('show');
        this.openChangePasswordModal();
      });
    }

    // Botão logout
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        userDropdown.classList.remove('show');
        this.handleLogout();
      });
    }

    // Setup do modal de alterar senha
    this.setupChangePasswordModal();
  },

  /**
   * Abre o modal de alterar senha
   */
  openChangePasswordModal() {
    const modal = document.getElementById('modalAlterarSenha');
    if (modal) {
      modal.style.display = 'flex';
      // Limpar campos
      document.getElementById('senhaAtual').value = '';
      document.getElementById('novaSenha').value = '';
      document.getElementById('confirmarNovaSenha').value = '';
      document.getElementById('alterarSenhaError').style.display = 'none';
      ModalAccessibility.open(modal);
    }
  },

  /**
   * Fecha o modal de alterar senha
   */
  closeChangePasswordModal() {
    const modal = document.getElementById('modalAlterarSenha');
    if (modal) {
      modal.style.display = 'none';
      ModalAccessibility.close(modal);
    }
  },

  /**
   * Configura o modal de alterar senha
   */
  setupChangePasswordModal() {
    const modal = document.getElementById('modalAlterarSenha');
    const closeBtn = document.getElementById('closeModalAlterarSenha');
    const cancelBtn = document.getElementById('cancelModalAlterarSenha');
    const form = document.getElementById('formAlterarSenha');

    // Fechar modal
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeChangePasswordModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeChangePasswordModal());
    }

    // Fechar ao clicar fora
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeChangePasswordModal();
        }
      });
    }

    // Submit do formulário
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleChangePassword();
      });
    }
  },

  /**
   * Processa a alteração de senha
   */
  async handleChangePassword() {
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarNovaSenha = document.getElementById('confirmarNovaSenha').value;
    const errorDiv = document.getElementById('alterarSenhaError');

    // Limpar erro anterior
    errorDiv.style.display = 'none';

    // Validações
    if (!senhaAtual) {
      this.showFormError(errorDiv, 'Digite sua senha atual');
      return;
    }

    if (!novaSenha) {
      this.showFormError(errorDiv, 'Digite a nova senha');
      return;
    }

    if (novaSenha.length < 4) {
      this.showFormError(errorDiv, 'Nova senha deve ter pelo menos 4 caracteres');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      this.showFormError(errorDiv, 'As senhas não coincidem');
      return;
    }

    if (senhaAtual === novaSenha) {
      this.showFormError(errorDiv, 'Nova senha deve ser diferente da atual');
      return;
    }

    try {
      const usuario = AppState.currentUser;
      if (!usuario) {
        this.showFormError(errorDiv, 'Usuário não identificado');
        return;
      }

      const result = await window.api.auth.changePassword(usuario.id, senhaAtual, novaSenha);

      if (result.success) {
        this.closeChangePasswordModal();
        if (typeof Utils !== 'undefined') {
          Utils.showSuccess('Senha alterada com sucesso!');
        }
      } else {
        this.showFormError(errorDiv, result.error || 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      this.showFormError(errorDiv, 'Erro ao conectar com o sistema');
    }
  },

  /**
   * Mostra erro no formulário
   */
  showFormError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
  },

  /**
   * Processa o logout
   */
  handleLogout() {
    if (typeof Utils !== 'undefined' && !Utils.confirm('Deseja realmente sair?')) {
      return;
    }

    // Limpar estado
    if (typeof AppState !== 'undefined') {
      AppState.currentUser = null;
      AppState.contas = [];
      AppState.categorias = [];
      AppState.orcamentos = [];
      AppState.transacoes = [];
    }

    // Esconder app e mostrar tela de login
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('authScreen').style.display = 'flex';

    // Mostrar formulário de login
    this.showLoginForm();
  },

  /**
   * Mostra formulário de login
   */
  showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';

    // Limpar campos
    document.getElementById('loginNome').value = '';
    document.getElementById('loginSenha').value = '';

    // Focar no campo de nome
    setTimeout(() => {
      document.getElementById('loginNome').focus();
    }, 100);
  },

  /**
   * Mostra formulário de registro
   */
  showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('registerError').style.display = 'none';

    // Limpar campos
    document.getElementById('registerNome').value = '';
    document.getElementById('registerSenha').value = '';
    document.getElementById('registerConfirmarSenha').value = '';

    // Focar no campo de nome
    setTimeout(() => {
      document.getElementById('registerNome').focus();
    }, 100);
  },

  /**
   * Mostra mensagem de erro
   */
  showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
  },
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.init();
});
