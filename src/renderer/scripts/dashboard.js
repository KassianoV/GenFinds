// src/renderer/scripts/dashboard.js

const DashboardPage = {
  chart: null, // Armazenar instância do gráfico

  init() {
    this.render();
  },

  async render() {
    await this.updateSummaryCards();
    this.updateRecentTransactions();
    this.updateBudgets();
    this.updateContaGastos();
    this.renderChart();
  },

  async updateSummaryCards() {
    if (!AppState.currentUser) return;

    // Calcular saldo total de todas as contas
    const saldoTotal = AppState.contas.reduce((sum, conta) => sum + conta.saldo, 0);

    // Buscar resumo do mês atual
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

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

        // Atualizar cards
        const saldoEl = document.getElementById('dashSaldoTotal');
        const receitaEl = document.getElementById('dashReceitaMes');
        const despesaEl = document.getElementById('dashDespesaMes');
        const economiaEl = document.getElementById('dashEconomiaMes');

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

        // Atualizar labels de mês
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
        const mesAtual = meses[hoje.getMonth()];
        const anoAtual = hoje.getFullYear();

        const receitaLabel = document.getElementById('dashReceitaLabel');
        const despesaLabel = document.getElementById('dashDespesaLabel');

        if (receitaLabel) receitaLabel.textContent = `${mesAtual} ${anoAtual}`;
        if (despesaLabel) despesaLabel.textContent = `${mesAtual} ${anoAtual}`;
      }
    } catch (error) {
      console.error('Erro ao atualizar resumo:', error);
    }
  },

  updateRecentTransactions() {
    const container = document.getElementById('dashRecentTransactions');
    if (!container) return;

    // Pegar últimas 5 transações
    const recentes = AppState.transacoes.slice(0, 5);

    if (recentes.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Nenhuma transação recente</p></div>';
      return;
    }

    container.innerHTML = '';

    recentes.forEach((transacao) => {
      const item = document.createElement('div');
      item.className = 'recent-item';

      item.innerHTML = `
                <div class="recent-item-info">
                    <div class="recent-item-desc">${transacao.descricao}</div>
                    <div class="recent-item-cat">${transacao.categoria_nome} • ${Utils.formatDate(transacao.data)}</div>
                </div>
                <div class="recent-item-value ${transacao.tipo}">
                    ${transacao.tipo === 'receita' ? '+' : '-'} ${Utils.formatCurrency(transacao.valor)}
                </div>
            `;

      container.appendChild(item);
    });
  },

  updateBudgets() {
    const container = document.getElementById('dashBudgetsGrid');
    if (!container) return;

    // Filtrar orçamentos do mês atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1; // 1-12
    const anoAtual = hoje.getFullYear();

    const orcamentosMesAtual = AppState.orcamentos.filter(
      (o) => o.mes === mesAtual && o.ano === anoAtual
    );

    if (orcamentosMesAtual.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Nenhum orçamento para este mês</p></div>';
      return;
    }

    container.innerHTML = '';

    orcamentosMesAtual.forEach((orcamento) => {
      // Encontrar categoria
      const categoria = AppState.categorias.find((c) => c.id === orcamento.categoria_id);
      const categoriaNome = categoria ? categoria.nome : 'Categoria não encontrada';

      // Calcular quanto foi gasto nesta categoria no mês atual
      const primeiroDia = new Date(anoAtual, mesAtual - 1, 1);
      const ultimoDia = new Date(anoAtual, mesAtual, 0);

      const dataInicio = primeiroDia.toISOString().split('T')[0];
      const dataFim = ultimoDia.toISOString().split('T')[0];

      const gastoCategoria = AppState.transacoes
        .filter(
          (t) =>
            t.categoria_id === orcamento.categoria_id &&
            t.tipo === 'despesa' &&
            t.data >= dataInicio &&
            t.data <= dataFim
        )
        .reduce((sum, t) => sum + t.valor, 0);

      const percentual = (gastoCategoria / orcamento.valor_planejado) * 100;
      const percentualFormatado = Math.min(percentual, 100).toFixed(0);

      // Definir cor da barra de progresso
      let progressColor = 'var(--success-color)';
      if (percentual >= 90) {
        progressColor = 'var(--danger-color)';
      } else if (percentual >= 70) {
        progressColor = 'var(--warning-color)';
      }

      const card = document.createElement('div');
      card.className = 'budget-card';

      card.innerHTML = `
                <div class="budget-header">
                    <div class="budget-category">${categoriaNome}</div>
                    <div class="budget-percentage" style="color: ${progressColor};">${percentualFormatado}%</div>
                </div>
                <div class="budget-progress">
                    <div class="budget-progress-bar">
                        <div class="budget-progress-fill" style="width: ${percentualFormatado}%; background-color: ${progressColor};"></div>
                    </div>
                </div>
                <div class="budget-values">
                    <span class="budget-spent">${Utils.formatCurrency(gastoCategoria)}</span>
                    <span class="budget-separator">/</span>
                    <span class="budget-total">${Utils.formatCurrency(orcamento.valor_planejado)}</span>
                </div>
                <div class="budget-remaining ${gastoCategoria > orcamento.valor_planejado ? 'over-budget' : ''}">
                    ${
                      gastoCategoria > orcamento.valor_planejado
                        ? `Excedeu ${Utils.formatCurrency(gastoCategoria - orcamento.valor_planejado)}`
                        : `Restam ${Utils.formatCurrency(orcamento.valor_planejado - gastoCategoria)}`
                    }
                </div>
            `;

      container.appendChild(card);
    });
  },

  async updateContaGastos() {
    const valorEl = document.getElementById('dashTotalGastoContas');
    const labelEl = document.getElementById('dashGastosLabel');
    const listEl = document.getElementById('dashContaGastosList');

    if (!valorEl || !labelEl || !listEl) return;

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    const gastosPorCartao = {};
    let totalGasto = 0;

    // Buscar e calcular gastos por cartão de crédito
    try {
      if (AppState.currentUser) {
        const resultCartoes = await window.api.cartao.list(AppState.currentUser.id);

        if (resultCartoes.success && resultCartoes.data) {
          const cartoes = resultCartoes.data;

          // Para cada cartão, buscar transações do período
          for (const cartao of cartoes) {
            const resultTransacoes = await window.api.transacaoCartao.list(AppState.currentUser.id, cartao.id,
              mesAtual,
              anoAtual
            );

            if (resultTransacoes.success && resultTransacoes.data) {
              const transacoes = resultTransacoes.data;
              const totalTransacoes = transacoes.reduce((sum, t) => sum + t.valor, 0);
              // Somar valor inicial do cartão com as transações do mês
              const totalCartao = (cartao.valor || 0) + totalTransacoes;

              gastosPorCartao[cartao.id] = {
                id: cartao.id,
                nome: cartao.nome,
                valor: totalCartao
              };
              totalGasto += totalCartao;
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar gastos de cartões:', error);
    }

    // Atualizar valor total
    valorEl.textContent = Utils.formatCurrency(totalGasto);

    // Atualizar label do mês
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    labelEl.textContent = `${meses[mesAtual - 1]} ${anoAtual}`;

    // Renderizar lista de cartões
    listEl.innerHTML = '';

    if (Object.keys(gastosPorCartao).length === 0) {
      listEl.innerHTML = '<p class="empty-message">Nenhum cartão de crédito cadastrado</p>';
      return;
    }

    // Ordenar por valor (maior para menor)
    const gastosOrdenados = Object.entries(gastosPorCartao).sort((a, b) => b[1].valor - a[1].valor);

    gastosOrdenados.forEach(([cartaoId, cartao]) => {
      const item = document.createElement('div');
      item.className = 'conta-gasto-item';
      item.innerHTML = `
        <span class="conta-gasto-nome">💳 ${cartao.nome}</span>
        <span class="conta-gasto-valor">${Utils.formatCurrency(cartao.valor)}</span>
      `;
      listEl.appendChild(item);
    });
  },

  renderChart() {
    console.log('[Dashboard] Iniciando renderChart()');

    // VALIDAÇÃO 1: Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
      console.error('[Dashboard] Chart.js não está carregado!');
      const canvas = document.getElementById('dashboardChart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText(
          'Erro: Biblioteca de gráficos não carregada',
          canvas.width / 2,
          canvas.height / 2
        );
      }
      return;
    }

    console.log('[Dashboard] Chart.js está disponível');

    // VALIDAÇÃO 2: Verificar se o canvas existe
    const canvas = document.getElementById('dashboardChart');
    if (!canvas) {
      console.error('[Dashboard] Canvas #dashboardChart não encontrado no DOM');
      return;
    }

    console.log('[Dashboard] Canvas encontrado:', {
      width: canvas.width,
      height: canvas.height,
      offsetWidth: canvas.offsetWidth,
      offsetHeight: canvas.offsetHeight,
    });

    // VALIDAÇÃO 3: Destruir gráfico anterior se existir
    if (this.chart) {
      console.log('[Dashboard] Destruindo gráfico anterior');
      this.chart.destroy();
      this.chart = null;
    }

    // Calcular dados dos últimos 6 meses
    console.log('[Dashboard] Calculando dados dos últimos 6 meses');
    const meses = [];
    const receitas = [];
    const despesas = [];

    const hoje = new Date();

    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mes = data.getMonth() + 1;
      const ano = data.getFullYear();

      // Nome do mês
      const nomeMes = data.toLocaleDateString('pt-BR', { month: 'short' });
      meses.push(nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1));

      // Calcular receitas e despesas do mês
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);

      const dataInicio = primeiroDia.toISOString().split('T')[0];
      const dataFim = ultimoDia.toISOString().split('T')[0];

      const receitaMes = AppState.transacoes
        .filter((t) => t.tipo === 'receita' && t.data >= dataInicio && t.data <= dataFim)
        .reduce((sum, t) => sum + t.valor, 0);

      const despesaMes = AppState.transacoes
        .filter((t) => t.tipo === 'despesa' && t.data >= dataInicio && t.data <= dataFim)
        .reduce((sum, t) => sum + t.valor, 0);

      receitas.push(receitaMes);
      despesas.push(despesaMes);
    }

    // VALIDAÇÃO 4: Validar dados calculados
    console.log('[Dashboard] Dados calculados:', {
      meses,
      receitas,
      despesas,
      totalTransacoes: AppState.transacoes.length,
    });

    if (meses.length === 0) {
      console.warn('[Dashboard] Nenhum mês para exibir');
      return;
    }

    // VALIDAÇÃO 5: Tentar criar o gráfico com try-catch
    try {
      console.log('[Dashboard] Criando instância do Chart');

      this.chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: meses,
          datasets: [
            {
              label: 'Receitas',
              data: receitas,
              borderColor: 'rgb(76, 175, 80)',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Despesas',
              data: despesas,
              borderColor: 'rgb(244, 67, 54)',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: {
                  size: 12,
                },
                padding: 15,
              },
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(context.parsed.y);
                  return label;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(value);
                },
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
        },
      });

      console.log('[Dashboard] Gráfico criado com sucesso:', this.chart);
    } catch (error) {
      console.error('[Dashboard] Erro ao criar gráfico:', error);
      console.error('[Dashboard] Stack trace:', error.stack);

      // Exibir mensagem de erro no canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#d32f2f';
      ctx.textAlign = 'center';
      ctx.fillText('Erro ao carregar gráfico', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText(error.message, canvas.width / 2, canvas.height / 2 + 10);
    }
  },
};
