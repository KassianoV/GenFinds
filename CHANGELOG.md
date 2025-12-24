# 1.0.0 (2025-12-24)



# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-01-23

### 🎉 Lançamento Inicial

#### ✨ Adicionado
- Sistema completo de gestão financeira pessoal
- CRUD de Contas com tipos (corrente, poupança, investimento, carteira)
- CRUD de Categorias com cores personalizáveis e tipos (receita/despesa)
- CRUD de Orçamentos mensais com acompanhamento de gastos
- CRUD de Transações com filtros avançados
- Dashboard com 4 cards de resumo (Saldo Total, Receitas, Despesas, Economia)
- Gráfico de evolução mensal (últimos 6 meses) usando Chart.js
- Exibição de orçamentos do mês atual com barras de progresso
- Lista de últimas 5 transações no Dashboard
- Sistema de filtros por ano, mês, tipo e busca textual
- Exportação de transações para CSV
- Importação de transações via CSV
- Toast notifications para feedback do usuário
- Modal de edição para todas entidades (Contas, Categorias, Orçamentos, Transações)
- Página de Relatórios com gráficos de pizza por categoria
- Interface moderna e responsiva
- Sidebar com logo personalizada e versão do app
- Sistema de cores e temas consistentes
- Animações suaves de transição
- Hot reload em desenvolvimento (electron-reloader)

#### 🛠️ Técnico
- Electron 28.3.3 com TypeScript 5.3.3
- SQLite via sql.js para persistência de dados local
- Context Bridge para comunicação segura IPC
- Chart.js 4.4.0 para visualizações
- Sistema de build com electron-builder
- Geração de instalador NSIS para Windows
- Arquitetura modular com separação de concerns
- Sistema de tipos TypeScript completo
- Tratamento de erros robusto

#### 🎨 Interface
- Design clean e moderno
- Cores personalizadas (tema verde)
- Ícones emoji para melhor UX
- Cards com sombras e hover effects
- Filtros compactos estilo dropdown
- Tabs de meses clicáveis
- Toggle switches animados
- Campos de busca integrados
- Tabelas responsivas com hover
- Badges coloridos por tipo de transação
- Empty states informativos

#### 📦 Build
- Instalador Windows (.exe) funcional
- Ícone personalizado da aplicação
- Compressão máxima para otimização
- Atalhos na área de trabalho e menu iniciar
- Desinstalador incluído

---

## [Unreleased]

### 🔮 Planejado
- Dark mode
- Backup automático na nuvem
- Transações recorrentes
- Multi-moedas
- Gráficos adicionais (treemap, área)
- Metas financeiras
- Categorias personalizadas por usuário
- Anexos em transações (recibos)
- Relatórios em PDF
- Sincronização entre dispositivos

---

## Tipos de Mudanças
- `Added` (Adicionado) para novas funcionalidades
- `Changed` (Modificado) para mudanças em funcionalidades existentes
- `Deprecated` (Obsoleto) para funcionalidades que serão removidas
- `Removed` (Removido) para funcionalidades removidas
- `Fixed` (Corrigido) para correções de bugs
- `Security` (Segurança) para vulnerabilidades corrigidas