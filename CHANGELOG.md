# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.8.0] - 2026-01-19

### Adicionado
- Suporte multi-usuário completo com isolamento total de dados por `usuario_id`
- Atualização automática dos cards de resumo após criar/editar/excluir transações

### Corrigido
- **Resumo Financeiro**: `getResumoFinanceiro` agora filtra corretamente por `usuario_id`
- **Handler relatorio:resumo**: Recebe e passa `usuarioId` para o banco de dados
- **API relatorio.getResumo**: Preload atualizado para passar `usuarioId`
- **Dashboard e Relatórios**: Passam `usuarioId` corretamente para a API
- **Exibição de Valor de Cartões**: Agora exibe valor inicial + transações do mês
- **Categorias nos Dropdowns**: Corrigido `populateCategoriaDropdowns()` que não passava `usuarioId`
- **Cards de Transações**: `updateSummaryCards()` agora é chamado após operações CRUD

### Alterado
- `createCartaoCard()` em cartao.js: Soma valor inicial do cartão com transações
- `renderFaturaCartoes()` em cartao.js: Exibe valor total (inicial + mensal)
- `updateContaGastos()` em dashboard.js: Inclui valor inicial do cartão no cálculo

---

## [1.7.0] - 2026-01-18

### Corrigido
- Correções de bugs do banco de dados
- Melhorias na estrutura de dados com `usuario_id`

---

## [1.6.4] - 2026-01-17

### Corrigido
- Correção da lógica da parte de cartão

---

## [1.6.3] - 2026-01-16

### Corrigido
- Correção de interação com a tab de fatura e parcela

---

## [1.6.2] - 2026-01-15

### Adicionado
- Melhorias de UX em cartões e relatórios

---

## [1.6.1] - 2026-01-10

### Adicionado
- Qualidade de código e automatização
- ESLint v9 com flat config
- Integração com Prettier
- Scripts de lint e formatação

---

## [1.6.0] - 2026-01-03

### Adicionado
- Melhorias em gráficos e cards de resumo
- Dashboard com gastos de cartões de crédito
- Gráfico de evolução dos últimos 6 meses

---

## [1.5.0] - 2025-12-30

### Adicionado
- Paginação de transações (10, 20, 50, 100 itens por página)
- Importação OFX padronizada
- Controles de navegação de páginas
- Filtros dinâmicos por ano (últimos 3 anos)

### Melhorado
- Performance de listagem de transações
- Queries otimizadas no banco de dados

---

## [1.4.0] - 2025-12-28

### Corrigido
- Correções críticas de segurança
- Melhorias de performance
- Validação de dados com Zod

### Adicionado
- Content Security Policy (CSP)
- Sistema de logging com Winston
- Proteção contra SQL Injection

---

## [1.3.0] - 2025-12-27

### Adicionado
- Sistema de importação de extrato bancário (OFX)
- Categorização automática de transações
- Preview de transações antes de importar
- Detecção de duplicatas

---

## [1.2.0] - 2025-12-26

### Corrigido
- Correções críticas de segurança
- Melhorias de performance

### Adicionado
- Validação de entrada de dados
- Foreign keys habilitadas no SQLite

---

## [1.1.0] - 2025-12-25

### Adicionado
- Gestão de cartões de crédito
- Lançamento de compras parceladas
- Visualização de faturas mensais

---

## [1.0.0] - 2025-12-24

### Adicionado
- Lançamento inicial do GenFins
- Dashboard com resumo financeiro
- CRUD completo de transações
- Gestão de contas bancárias
- Categorias personalizáveis
- Orçamentos mensais
- Gráficos de pizza por categoria
- Exportar transações para CSV
- Interface responsiva
- Banco de dados SQLite local
