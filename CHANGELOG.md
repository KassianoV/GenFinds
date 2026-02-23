# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

### Adicionado
- **Dashboard — Card de Anotações**: novo card no dashboard para criar e gerenciar lembretes financeiros
  - Tipos de anotação: Lembrete, Vencimento, Outro — cada um com badge colorido
  - Campo de data opcional e campo de conteúdo/detalhes
  - Formulário inline com abertura/fechamento dinâmico
  - Exclusão individual com confirmação
  - Notas ordenadas por data (mais próximas primeiro)
  - Persistência via nova tabela `notas` no banco SQLite

### Backend
- Nova tabela `notas` com campos: `titulo`, `conteudo`, `data`, `tipo`
- Interface TypeScript `Nota` em `database.types.ts`
- Métodos `createNota`, `getNotas`, `updateNota`, `deleteNota` em `DatabaseManager`
- Schemas de validação `NotaCreateSchema` e `NotaUpdateSchema` com Zod
- IPC handlers: `nota:create`, `nota:list`, `nota:update`, `nota:delete`
- API exposta via `window.api.nota.*` no preload

---

## [1.8.3] - 2026-02-19

### Corrigido
- **Barra lateral e tela de login**: atualização visual e de comportamento
- **Lançamento de compra no cartão**: correção no fluxo de criação de transações parceladas
- **Erros gerais de front-end e back-end**: múltiplas correções de bugs
- **Acessibilidade**: melhorias em atributos ARIA, navegação por teclado e foco em modais

---

## [1.8.2] - 2026-01-20

### Corrigido
- **Lógica de cartão**: correção no cálculo da soma de transações à vista e parceladas
- **Exibição de totais**: valores à vista e parcelados agora somados corretamente por cartão

---

## [1.8.1] - 2026-01-20

### Adicionado
- **Paginação no módulo de cartão**: visualização paginada de transações à vista e parceladas
- **Separação por tipo**: detalhamento visual de compras à vista vs. compras parceladas no cartão

### Corrigido
- Atualização geral no módulo de cartão de crédito

---

## [1.8.0] - 2026-01-19

### Adicionado
- Suporte multi-usuário completo com isolamento total de dados por `usuario_id`
- Atualização automática dos cards de resumo após criar/editar/excluir transações

### Corrigido
- **Resumo Financeiro**: `getResumoFinanceiro` agora filtra corretamente por `usuario_id`
- **Handler `relatorio:resumo`**: recebe e passa `usuarioId` para o banco de dados
- **API `relatorio.getResumo`**: preload atualizado para passar `usuarioId`
- **Dashboard e Relatórios**: passam `usuarioId` corretamente para a API
- **Exibição de Valor de Cartões**: agora exibe valor inicial + transações do mês
- **Categorias nos Dropdowns**: corrigido `populateCategoriaDropdowns()` que não passava `usuarioId`
- **Cards de Transações**: `updateSummaryCards()` agora é chamado após operações CRUD

### Alterado
- `createCartaoCard()` em `cartao.js`: soma valor inicial do cartão com transações
- `renderFaturaCartoes()` em `cartao.js`: exibe valor total (inicial + mensal)
- `updateContaGastos()` em `dashboard.js`: inclui valor inicial do cartão no cálculo

---

## [1.7.0] - 2026-01-15

### Corrigido
- Correções de bugs no banco de dados SQLite
- Melhorias na integridade da estrutura de dados com `usuario_id`

---

## [1.6.4] - 2026-01-10

### Corrigido
- Correção da lógica no módulo de cartão de crédito

---

## [1.6.3] - 2026-01-06

### Corrigido
- Correção de interação com a aba de fatura e parcela no módulo de cartão

---

## [1.6.2] - 2026-01-05

### Adicionado
- **Aba de Fatura**: visualização e busca de cartões na aba de fatura
- **Filtros dinâmicos de ano**: exibição dos últimos 3 anos nas listagens
- **Data completa em parcelas**: exibição de data por extenso em lançamentos parcelados
- **Dashboard — Gastos nos Cartões**: resumo de gastos por cartão diretamente no dashboard
- **Relatório — Informações dos Cartões**: painel de cartões com status e vencimento

### Melhorado
- Interface de cartões mais limpa com remoção de filtros redundantes
- UX geral das páginas de cartão e relatório

---

## [1.6.1] - 2026-01-03

### Adicionado
- **ESLint v9** com flat config para padronização de código
- **Prettier** integrado com scripts `npm run lint` e `npm run format`
- **Scripts de versionamento automático**: patch, minor e major via npm scripts
- **Geração de changelog automatizada** com `conventional-changelog-cli`
- **Debounce em filtros de busca** nas transações para melhor performance
- **Paginação no backend**: implementação em `database.ts` (método `listTransacoesPaginated`)

### Corrigido
- Content Security Policy (CSP) reforçado no HTML
- 0 erros de lint (92 testes passando)

---

## [1.6.0] - 2026-01-02

### Adicionado
- **Dashboard — Gráfico de Evolução**: gráfico de linha com os últimos 6 meses (receitas vs despesas)
- **Dashboard — Gastos de Cartões**: card com total gasto nos cartões de crédito no mês
- Melhorias gerais nos cards de resumo financeiro do dashboard

---

## [1.5.0] - 2025-12-30

### Adicionado
- **Paginação de Transações**: suporte a 10, 20, 50 e 100 itens por página
- **Controles de navegação de páginas**: botões de anterior/próximo e seletor de página
- **Filtros dinâmicos por ano**: seleção dos últimos 3 anos nas transações
- **Importação OFX padronizada**: parser robusto para extratos bancários no formato OFX

### Melhorado
- Performance de listagem de transações com queries otimizadas
- Banco de dados: índices adicionados para consultas por data e usuário

---

## [1.4.0] - 2025-12-26

### Adicionado
- **Validação de dados com Zod**: todos os inputs validados com schemas tipados
- **Sistema de logging com Winston**: logs estruturados com níveis (info, warn, error)
- **Proteção contra SQL Injection**: uso exclusivo de prepared statements
- **Content Security Policy (CSP)**: cabeçalhos de segurança no HTML

### Corrigido
- Correções críticas de segurança em handlers IPC
- Melhorias de performance em queries do banco de dados

---

## [1.3.0] - 2025-12-26

### Adicionado
- **Importação de Extrato Bancário (OFX)**: upload e parsing de extratos no formato OFX
- **Categorização automática**: sugestão de categoria baseada no nome da transação
- **Preview antes de importar**: visualização das transações antes de confirmar importação
- **Detecção de duplicatas**: alertas para transações já existentes no período

---

## [1.2.0] - 2025-12-26

### Adicionado
- **Validação de entrada de dados**: verificação de campos obrigatórios e formatos
- **Foreign keys habilitadas no SQLite**: integridade referencial garantida com `PRAGMA foreign_keys = ON`

### Corrigido
- Correções críticas de segurança na camada de dados
- Melhorias de performance em consultas frequentes

---

## [1.1.0] - 2025-12-25

### Adicionado
- **Gestão de Cartões de Crédito**: cadastro e acompanhamento de cartões
- **Lançamento de Compras Parceladas**: suporte a parcelamento com cálculo automático por parcela
- **Visualização de Faturas Mensais**: fatura mensal por cartão com detalhamento de compras
- **Suite de testes (230+ testes)**: cobertura de banco de dados, validações e fluxos principais
- **Configuração Jest + TypeScript**: ambiente de testes integrado ao projeto

---

## [1.0.0] - 2025-12-24

### Adicionado
- Lançamento inicial do **GenFins — Gerenciador Financeiro Pessoal**
- **Dashboard** com cards de resumo: Patrimônio Líquido, Receita Mensal, Despesas, Saldo
- **CRUD completo de Transações**: criar, editar, excluir e filtrar receitas e despesas
- **Gestão de Contas Bancárias**: corrente, poupança, investimento e carteira
- **Categorias Personalizáveis**: categorias de receita e despesa com cores e ícones
- **Orçamentos Mensais**: planejamento de gastos por categoria com barra de progresso
- **Gráficos de Pizza**: distribuição de despesas por categoria e saldo por conta
- **Exportar Transações para CSV**: download do histórico financeiro
- **Banco de dados SQLite local**: armazenamento seguro e offline via sql.js
- **Interface responsiva**: layout adaptável para diferentes resoluções
- **Autenticação com bcrypt**: senha do usuário protegida com hash seguro
