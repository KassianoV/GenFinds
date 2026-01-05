const Navigation = {
  currentPage: 'transacoes',

  init() {
    this.attachEventListeners();
    this.showPage(this.currentPage);
  },

  attachEventListeners() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');

    navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        this.navigateTo(page);
      });
    });
  },

  navigateTo(pageName) {
    if (this.currentPage === pageName) return;

    this.currentPage = pageName;
    this.updateActiveNav(pageName);
    this.showPage(pageName);
  },

  updateActiveNav(pageName) {
    const navItems = document.querySelectorAll('.nav-item[data-page]');

    navItems.forEach((item) => {
      if (item.dataset.page === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  showPage(pageName) {
    // Ocultar todas as páginas
    const pages = document.querySelectorAll('.page-content');
    pages.forEach((page) => {
      page.style.display = 'none';
    });

    // Exibir a página atual
    const currentPageEl = document.getElementById(`${pageName}-page`);
    if (currentPageEl) {
      currentPageEl.style.display = 'block';

      // Atualizar conteúdo da página se necessário
      this.refreshPageContent(pageName);
    }
  },

  refreshPageContent(pageName) {
    // Atualizar conteúdo específico de cada página
    switch (pageName) {
      case 'dashboard':
        if (typeof DashboardPage !== 'undefined') {
          DashboardPage.render();
        }
        break;
      case 'transacoes':
        if (typeof TransacoesPage !== 'undefined') {
          TransacoesPage.render();
        }
        break;
      case 'cartao':
        if (typeof CartaoPage !== 'undefined') {
          CartaoPage.init();
        }
        break;
      case 'relatorio':
        if (typeof RelatorioPage !== 'undefined') {
          RelatorioPage.render();
        }
        break;
      case 'configurar':
        if (typeof ConfigurarPage !== 'undefined') {
          ConfigurarPage.render();
        }
        break;
    }
  },
};
