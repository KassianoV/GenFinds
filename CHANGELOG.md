# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.6.0] - 2026-01-02

### Adicionado
- Cards de resumo na página de transações com patrimônio líquido, receita e despesa do mês
- Função `updateSummaryCards()` para atualização dinâmica dos cards
- Labels dinâmicas com mês/ano nos cards de resumo
- Novos gráficos de pizza no relatório: totais e contas
- Validações extensivas para renderização de gráficos com tratamento de erros
- Logs de debug detalhados no dashboard para troubleshooting
- Exibição de patrimônio líquido baseado na soma de todas as contas

### Modificado
- Ícones da aplicação atualizados com nova logo do projeto
- Melhorias na renderização de gráficos do dashboard com validações robustas
- Estrutura dos gráficos de relatório reorganizada
- Estilos aprimorados em dashboard, relatório e transações
- Script `build-icon.js` atualizado para nova geração de ícones

### Removido
- Filtro de categoria de receitas no relatório (simplificação da interface)
- Gráfico de pizza de receitas individual (consolidado em gráfico de totais)

### Corrigido
- Tratamento de erros quando Chart.js não está carregado
- Verificação de existência do canvas antes de renderizar gráficos
- Destruição adequada de gráficos anteriores para evitar memory leaks

## [1.5.0] - 2024

### Adicionado
- Sistema de paginação de transações
- Importação de extrato bancário no formato OFX padronizada
- Melhorias na performance de carregamento de dados

### Corrigido
- Correções críticas de segurança
- Otimizações de performance

## [1.4.0] - 2024

### Adicionado
- Sistema de logging com Winston
- Validação de dados com Zod

### Corrigido
- Correções críticas de segurança
- Melhorias de performance

## [1.3.0] - 2024

### Adicionado
- Sistema de importação de extrato bancário
- Suporte para diferentes formatos de arquivo

## [1.2.0] - 2024

### Adicionado
- Sistema de categorias personalizadas
- Filtros avançados de transações

### Corrigido
- Correções críticas de segurança
- Melhorias de performance

## [1.0.0] - 2024

### Adicionado
- Versão inicial do GenFins
- Sistema de gestão de finanças pessoais
- Dashboard com gráficos interativos
- Gerenciamento de transações (receitas e despesas)
- Sistema de contas bancárias
- Relatórios financeiros
- Integração com Chart.js para visualizações
- Base de dados SQLite local
- Interface moderna e responsiva
