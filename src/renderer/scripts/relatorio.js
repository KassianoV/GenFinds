// src/renderer/scripts/relatorio.js

const RelatorioPage = {
    chartReceitas: null,
    chartDespesas: null,
    chartPizzaReceitas: null,
    chartPizzaDespesas: null,

    init() {
        this.attachEventListeners();
        this.render();
    },

    attachEventListeners() {
        const filtroReceita = document.getElementById('filtroReceitaCategoria');
        const filtroDespesa = document.getElementById('filtroDespesaCategoria');

        if (filtroReceita) {
            filtroReceita.addEventListener('change', () => this.updateSummary());
        }

        if (filtroDespesa) {
            filtroDespesa.addEventListener('change', () => this.updateSummary());
        }
    },

    render() {
        this.updateFilters();
        this.updateSummary();
        this.updateInfoCredito();
        this.renderCharts();
    },

    updateFilters() {
        const filtroReceita = document.getElementById('filtroReceitaCategoria');
        const filtroDespesa = document.getElementById('filtroDespesaCategoria');

        if (filtroReceita) {
            filtroReceita.innerHTML = '<option value="">Todas</option>';
            AppState.categorias
                .filter(c => c.tipo === 'receita')
                .forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nome;
                    filtroReceita.appendChild(option);
                });
        }

        if (filtroDespesa) {
            filtroDespesa.innerHTML = '<option value="">Todas</option>';
            AppState.categorias
                .filter(c => c.tipo === 'despesa')
                .forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nome;
                    filtroDespesa.appendChild(option);
                });
        }
    },

    async updateSummary() {
        if (!AppState.currentUser) return;

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

        AppState.contas.forEach(conta => {
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

    renderCharts() {
        this.renderPieCharts();
    },

    renderPieCharts() {
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        const dataInicio = primeiroDia.toISOString().split('T')[0];
        const dataFim = ultimoDia.toISOString().split('T')[0];

        // Gráfico de Pizza - Receitas por Categoria
        const receitasPorCategoria = {};
        AppState.transacoes
            .filter(t => t.tipo === 'receita' && t.data >= dataInicio && t.data <= dataFim)
            .forEach(t => {
                if (!receitasPorCategoria[t.categoria_nome]) {
                    receitasPorCategoria[t.categoria_nome] = 0;
                }
                receitasPorCategoria[t.categoria_nome] += t.valor;
            });

        const canvasPizzaReceitas = document.getElementById('pizzaReceitas');
        if (canvasPizzaReceitas) {
            if (this.chartPizzaReceitas) {
                this.chartPizzaReceitas.destroy();
            }

            const labelsReceitas = Object.keys(receitasPorCategoria);
            const dataReceitas = Object.values(receitasPorCategoria);

            if (labelsReceitas.length > 0) {
                this.chartPizzaReceitas = new Chart(canvasPizzaReceitas, {
                    type: 'pie',
                    data: {
                        labels: labelsReceitas,
                        datasets: [{
                            data: dataReceitas,
                            backgroundColor: [
                                '#4CAF50',
                                '#8BC34A',
                                '#CDDC39',
                                '#FFEB3B',
                                '#FFC107',
                                '#FF9800',
                                '#FF5722'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${Utils.formatCurrency(value)} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }

        // Gráfico de Pizza - Despesas por Categoria
        const despesasPorCategoria = {};
        AppState.transacoes
            .filter(t => t.tipo === 'despesa' && t.data >= dataInicio && t.data <= dataFim)
            .forEach(t => {
                if (!despesasPorCategoria[t.categoria_nome]) {
                    despesasPorCategoria[t.categoria_nome] = 0;
                }
                despesasPorCategoria[t.categoria_nome] += t.valor;
            });

        const canvasPizzaDespesas = document.getElementById('pizzaDespesas');
        if (canvasPizzaDespesas) {
            if (this.chartPizzaDespesas) {
                this.chartPizzaDespesas.destroy();
            }

            const labelsDespesas = Object.keys(despesasPorCategoria);
            const dataDespesas = Object.values(despesasPorCategoria);

            if (labelsDespesas.length > 0) {
                this.chartPizzaDespesas = new Chart(canvasPizzaDespesas, {
                    type: 'pie',
                    data: {
                        labels: labelsDespesas,
                        datasets: [{
                            data: dataDespesas,
                            backgroundColor: [
                                '#f44336',
                                '#E91E63',
                                '#9C27B0',
                                '#673AB7',
                                '#3F51B5',
                                '#2196F3',
                                '#03A9F4'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${Utils.formatCurrency(value)} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }
};