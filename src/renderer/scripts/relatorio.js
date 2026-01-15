// src/renderer/scripts/relatorio.js

const RelatorioPage = {
  chartReceitas: null,
  chartDespesas: null,
  chartPizzaDespesas: null,
  chartPizzaTotais: null,
  chartPizzaContas: null,

  init() {
    this.attachEventListeners();
    this.render();
  },

  attachEventListeners() {
    // Filtros removidos para deixar os relatórios mais limpos
  },

  render() {
    this.updateSummary();
    this.updateInfoCredito();
    this.updateInfoCartoes();
    this.renderCharts();
  },

  async updateSummary() {
    if (!AppState.currentUser) return;

    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const dataInicio = primeiroDia.toISOString().split('T')[0];
    const dataFim = ultimoDia.toISOString().split('T')[0];

    try {
      const response = await window.api.relatorio.getResumo(dataInicio,
        dataFim
      );

      if (response.success) {
        const resumo = response.data;

        const receitaEl = document.getElementById('receitaTotal');
        const despesaEl = document.getElementById('despesaTotal');
        const saldoEl = document.getElementById('saldoTotal');

        if (receitaEl) {
          receitaEl.textContent = Utils.formatCurrency(resumo.receita);
        }

        if (despesaEl) {
          despesaEl.textContent = Utils.formatCurrency(resumo.despesa);
        }

        if (saldoEl) {
          saldoEl.textContent = Utils.formatCurrency(resumo.saldo);
          saldoEl.style.color = resumo.saldo >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar resumo:', error);
    }
  },

  updateInfoCredito() {
    const container = document.getElementById('infoCredito');
    if (!container) return;

    if (AppState.contas.length === 0) {
      container.innerHTML = '<p>Nenhuma conta cadastrada</p>';
      return;
    }

    container.innerHTML = '<p><strong>Contas:</strong></p>';

    const lista = document.createElement('ul');
    lista.style.listStyle = 'none';
    lista.style.padding = '0';

    AppState.contas.forEach((conta) => {
      const item = document.createElement('li');
      item.style.padding = '8px 0';
      item.style.borderBottom = '1px solid var(--border-color)';

      const saldoColor = conta.saldo >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

      item.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <span>${conta.nome}</span>
                    <strong style="color: ${saldoColor};">${Utils.formatCurrency(conta.saldo)}</strong>
                </div>
            `;

      lista.appendChild(item);
    });

    container.appendChild(lista);
  },

  async updateInfoCartoes() {
    const container = document.getElementById('infoCartoes');
    if (!container) return;

    try {
      // Buscar cartões do usuário
      if (!AppState.currentUser) {
        container.innerHTML = '<p>Usuário não identificado</p>';
        return;
      }

      const result = await window.api.cartao.list();

      if (!result.success || !result.data || result.data.length === 0) {
        container.innerHTML = '<p>Nenhum cartão cadastrado</p>';
        return;
      }

      const cartoes = result.data;
      container.innerHTML = '<p><strong>Cartões:</strong></p>';

      const lista = document.createElement('ul');
      lista.style.listStyle = 'none';
      lista.style.padding = '0';

      cartoes.forEach((cartao) => {
        const item = document.createElement('li');
        item.style.padding = '8px 0';
        item.style.borderBottom = '1px solid var(--border-color)';

        // Definir cor baseada no status
        let statusColor = 'var(--warning-color)';
        if (cartao.status === 'paga') {
          statusColor = 'var(--success-color)';
        } else if (cartao.status === 'fechada') {
          statusColor = 'var(--danger-color)';
        }

        const statusText = {
          'aberta': 'Aberta',
          'fechada': 'Fechada',
          'paga': 'Paga'
        }[cartao.status] || 'Aberta';

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <div style="font-weight: 500;">${cartao.nome}</div>
              <div style="font-size: 0.85em; color: var(--text-secondary);">
                Vence dia ${cartao.vencimento} • <span style="color: ${statusColor};">${statusText}</span>
              </div>
            </div>
            <strong style="color: var(--danger-color);">${Utils.formatCurrency(cartao.valor)}</strong>
          </div>
        `;

        lista.appendChild(item);
      });

      container.appendChild(lista);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
      container.innerHTML = '<p>Erro ao carregar cartões</p>';
    }
  },

  renderCharts() {
    this.renderPizzaTotais();
    this.renderPizzaContas();
    this.renderPizzaDespesas();
  },

  renderPizzaDespesas() {
    console.log('[Relatorio] Iniciando renderPizzaDespesas()');

    // Validar Chart.js
    if (typeof Chart === 'undefined') {
      console.error('[Relatorio] Chart.js não carregado');
      return;
    }

    const canvas = document.getElementById('pizzaDespesas');
    if (!canvas) {
      console.error('[Relatorio] Canvas #pizzaDespesas não encontrado');
      return;
    }

    // Destruir gráfico anterior
    if (this.chartPizzaDespesas) {
      this.chartPizzaDespesas.destroy();
      this.chartPizzaDespesas = null;
    }

    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const dataInicio = primeiroDia.toISOString().split('T')[0];
    const dataFim = ultimoDia.toISOString().split('T')[0];

    // Gráfico de Pizza - Despesas por Categoria
    const despesasPorCategoria = {};
    AppState.transacoes
      .filter((t) => t.tipo === 'despesa' && t.data >= dataInicio && t.data <= dataFim)
      .forEach((t) => {
        if (!despesasPorCategoria[t.categoria_nome]) {
          despesasPorCategoria[t.categoria_nome] = 0;
        }
        despesasPorCategoria[t.categoria_nome] += t.valor;
      });

    const labelsDespesas = Object.keys(despesasPorCategoria);
    const dataDespesas = Object.values(despesasPorCategoria);

    console.log('[Relatorio] Despesas por categoria:', { labelsDespesas, dataDespesas });

    // Validar dados
    if (labelsDespesas.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('Nenhuma despesa', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Criar gráfico
    try {
      this.chartPizzaDespesas = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labelsDespesas,
          datasets: [
            {
              data: dataDespesas,
              backgroundColor: [
                '#f44336',
                '#E91E63',
                '#9C27B0',
                '#673AB7',
                '#3F51B5',
                '#2196F3',
                '#03A9F4',
                '#00BCD4',
                '#009688',
                '#4CAF50',
              ],
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { size: 12 },
                padding: 15,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  const formatted = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(value);
                  return `${label}: ${formatted} (${percentage}%)`;
                },
              },
            },
          },
        },
      });

      console.log('[Relatorio] Gráfico de despesas criado com sucesso');
    } catch (error) {
      console.error('[Relatorio] Erro ao criar gráfico de despesas:', error);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#d32f2f';
      ctx.textAlign = 'center';
      ctx.fillText('Erro ao carregar gráfico', canvas.width / 2, canvas.height / 2);
    }
  },

  renderPizzaContas() {
    console.log('[Relatorio] Iniciando renderPizzaContas()');

    // Validar Chart.js
    if (typeof Chart === 'undefined') {
      console.error('[Relatorio] Chart.js não carregado');
      return;
    }

    const canvas = document.getElementById('pizzaContas');
    if (!canvas) {
      console.error('[Relatorio] Canvas #pizzaContas não encontrado');
      return;
    }

    // Destruir gráfico anterior
    if (this.chartPizzaContas) {
      this.chartPizzaContas.destroy();
      this.chartPizzaContas = null;
    }

    // Calcular saldo por conta
    const labels = [];
    const data = [];
    const backgroundColor = [];

    AppState.contas.forEach((conta, index) => {
      if (conta.saldo > 0) {
        labels.push(conta.nome);
        data.push(conta.saldo);

        // Cores variadas para as contas
        const colors = [
          '#2196F3',
          '#4CAF50',
          '#FF9800',
          '#9C27B0',
          '#00BCD4',
          '#FF5722',
          '#8BC34A',
          '#E91E63',
          '#673AB7',
          '#FFC107',
        ];
        backgroundColor.push(colors[index % colors.length]);
      }
    });

    console.log('[Relatorio] Saldo por conta:', { labels, data });

    // Validar dados
    if (labels.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('Nenhuma conta com saldo', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Criar gráfico
    try {
      this.chartPizzaContas = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: backgroundColor,
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { size: 12 },
                padding: 15,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  const formatted = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(value);
                  return `${label}: ${formatted} (${percentage}%)`;
                },
              },
            },
          },
        },
      });

      console.log('[Relatorio] Gráfico de contas criado com sucesso');
    } catch (error) {
      console.error('[Relatorio] Erro ao criar gráfico de contas:', error);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#d32f2f';
      ctx.textAlign = 'center';
      ctx.fillText('Erro ao carregar gráfico', canvas.width / 2, canvas.height / 2);
    }
  },

  renderPizzaTotais() {
    console.log('[Relatorio] Iniciando renderPizzaTotais()');

    // Validar Chart.js
    if (typeof Chart === 'undefined') {
      console.error('[Relatorio] Chart.js não carregado');
      return;
    }

    const canvas = document.getElementById('pizzaTotais');
    if (!canvas) {
      console.error('[Relatorio] Canvas #pizzaTotais não encontrado');
      return;
    }

    // Destruir gráfico anterior
    if (this.chartPizzaTotais) {
      this.chartPizzaTotais.destroy();
      this.chartPizzaTotais = null;
    }

    // Calcular período (mês atual)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const dataInicio = primeiroDia.toISOString().split('T')[0];
    const dataFim = ultimoDia.toISOString().split('T')[0];

    // Calcular totais
    let receitaTotal = 0;
    let despesaTotal = 0;

    AppState.transacoes.forEach((t) => {
      if (t.data >= dataInicio && t.data <= dataFim) {
        if (t.tipo === 'receita') receitaTotal += t.valor;
        else if (t.tipo === 'despesa') despesaTotal += t.valor;
      }
    });

    console.log('[Relatorio] Totais:', { receitaTotal, despesaTotal });

    // Validar dados
    if (receitaTotal === 0 && despesaTotal === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('Nenhuma transação', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Preparar dados
    const labels = [];
    const data = [];
    const backgroundColor = [];

    if (receitaTotal > 0) {
      labels.push('Receitas');
      data.push(receitaTotal);
      backgroundColor.push('#4CAF50');
    }

    if (despesaTotal > 0) {
      labels.push('Despesas');
      data.push(despesaTotal);
      backgroundColor.push('#f44336');
    }

    // Criar gráfico
    try {
      this.chartPizzaTotais = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: backgroundColor,
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { size: 12 },
                padding: 15,
                generateLabels: function (chart) {
                  const data = chart.data;
                  if (data.labels.length && data.datasets.length) {
                    return data.labels.map((label, i) => {
                      const value = data.datasets[0].data[i];
                      const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);

                      return {
                        text: `${label}: ${percentage}%`,
                        fillStyle: data.datasets[0].backgroundColor[i],
                        hidden: false,
                        index: i,
                      };
                    });
                  }
                  return [];
                },
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  const formatted = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(value);

                  return `${label}: ${formatted} (${percentage}%)`;
                },
              },
            },
          },
        },
      });

      console.log('[Relatorio] Gráfico de totais criado com sucesso');
    } catch (error) {
      console.error('[Relatorio] Erro ao criar gráfico:', error);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#d32f2f';
      ctx.textAlign = 'center';
      ctx.fillText('Erro ao carregar gráfico', canvas.width / 2, canvas.height / 2);
    }
  },
};
