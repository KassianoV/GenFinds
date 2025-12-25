# 💰 GenFins - Gerenciador Financeiro Pessoal

<div align="center">
  <img src="assets/icon.png" alt="GenFins Logo" width="120"/>
  
  <p><strong>Sistema completo de gestão financeira pessoal desenvolvido com Electron</strong></p>
  
  [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE.txt)
  [![Electron](https://img.shields.io/badge/Electron-28.3.3-47848f.svg)](https://www.electronjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178c6.svg)](https://www.typescriptlang.org/)
  
  <img src="assets/screenshot.png" alt="GenFins Screenshot" width="800"/>
</div>

---

## 🌟 Funcionalidades

### 💼 Gestão Financeira Completa

| Módulo | Recursos |
|--------|----------|
| **Dashboard** | Cards de resumo, gráfico de evolução mensal, orçamentos, últimas transações |
| **Transações** | CRUD completo, filtros avançados, exportar/importar CSV |
| **Contas** | Múltiplas contas, tipos variados, edição com saldo automático |
| **Categorias** | Personalizáveis, cores, separação por tipo |
| **Orçamentos** | Planejamento mensal, acompanhamento visual, alertas |
| **Relatórios** | Gráficos de pizza, análise por período |

### 📊 Visualizações

- 📈 Gráfico de evolução dos últimos 6 meses
- 🥧 Gráficos de pizza por categoria
- 📊 Barras de progresso de orçamentos
- 💳 Cards com indicadores visuais coloridos

### ⚡ Funcionalidades Avançadas

- ✅ Exportar transações para CSV
- ✅ Importar transações via CSV
- ✅ Edição completa de todas entidades
- ✅ Filtros por ano, mês, tipo e busca
- ✅ Toast notifications para feedback
- ✅ Hot reload em desenvolvimento
- ✅ Interface responsiva

---

## 🚀 Início Rápido

### 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) (v18 ou superior)
- npm (incluído no Node.js)

### 📥 Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/genfins.git

# Entre no diretório
cd genfins

# Instale as dependências
npm install

# Execute em modo de desenvolvimento
npm run dev
```

---

## 📦 Build e Distribuição

### Desenvolvimento
```bash
# Modo desenvolvimento (hot reload)
npm run dev

# Compilar TypeScript
npm run build

# Limpar builds anteriores
npm run clean
```

### Produção
```bash
# Build completo com instalador
npm run build:prod

# Build sem instalador (para teste)
npm run build:dir
```

**📁 Saída:** `release/GenFins-1.0.0-Setup.exe` (Windows)

---

## 🏗️ Arquitetura
```
GenFins/
├── 📁 src/
│   ├── 📁 types/          # TypeScript interfaces
│   ├── 📁 database/       # SQLite manager (sql.js)
│   ├── 📁 main/           # Electron main process
│   ├── 📁 preload/        # Context bridge (IPC)
│   └── 📁 renderer/       # Frontend (HTML/CSS/JS)
│       ├── 📄 index.html
│       ├── 📁 styles/     # CSS modular
│       └── 📁 scripts/    # JavaScript modular
├── 📁 assets/             # Ícones e recursos
├── 📁 dist/               # Build TypeScript
└── 📁 release/            # Instaladores gerados
```

### 🔄 Fluxo de Dados
```
┌─────────────┐      IPC       ┌──────────────┐
│  Renderer   │ ◄────────────► │ Main Process │
│  (Frontend) │   Context      │  (Backend)   │
└─────────────┘    Bridge      └──────────────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │  SQLite  │
                                 │ Database │
                                 └──────────┘
```

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Electron** | 28.3.3 | Framework desktop multiplataforma |
| **TypeScript** | 5.3.3 | Linguagem com tipagem estática |
| **SQLite** (sql.js) | 1.10.3 | Banco de dados local |
| **Chart.js** | 4.4.0 | Biblioteca de gráficos |
| **Electron Builder** | 24.9.1 | Build e distribuição |

---

## 📸 Screenshots

<details>
<summary>📊 Dashboard</summary>

![Dashboard](assets/screenshots/dashboard.png)
- Cards de resumo financeiro
- Gráfico de evolução mensal
- Orçamentos com progresso visual
- Últimas transações

</details>

<details>
<summary>💳 Transações</summary>

![Transações](assets/screenshots/transacoes.png)
- Lista completa de transações
- Filtros avançados (ano, mês, tipo, busca)
- Exportar/Importar CSV
- Editar e excluir

</details>

<details>
<summary>⚙️ Configurações</summary>

![Configurações](assets/screenshots/config.png)
- Gerenciar contas
- Criar categorias personalizadas
- Definir orçamentos mensais

</details>

---

## 📖 Documentação

- [📝 Changelog](CHANGELOG.md) - Histórico de versões
- [🤝 Contribuindo](CONTRIBUTING.md) - Guia de contribuição
- [📄 Licença](LICENSE.txt) - Licença MIT

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas! 🎉

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feat/nova-feature`)
3. **Commit** suas mudanças seguindo [Conventional Commits](CONTRIBUTING.md#-convenção-de-commits)
4. **Push** para a branch (`git push origin feat/nova-feature`)
5. Abra um **Pull Request**

Leia nosso [Guia de Contribuição](CONTRIBUTING.md) para mais detalhes.

---

## 🐛 Reportar Bugs

Encontrou um bug? [Abra uma issue](https://github.com/KassianoV/GenFinds/issues) com:
- Descrição clara do problema
- Passos para reproduzir
- Screenshots (se aplicável)
- Versão do GenFins e sistema operacional

---

## 💡 Roadmap

### 🔜 Próximas Versões


Veja o [Changelog](CHANGELOG.md) para mais detalhes.

---

## 📊 Status do Projeto
```
✅ Dashboard completo
✅ CRUD de todas entidades
✅ Sistema de filtros
✅ Exportar/Importar CSV
✅ Build de produção
✅ Documentação completa
```

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE.txt](LICENSE.txt) para detalhes.

---

## 👨‍💻 Autor

**Kassiano Vieira**

- 🐙 GitHub: [@kassianovieira](https://github.com/KassianoV)
- 📧 Email: kassianovieira.pc@gmail.com
- 💼 LinkedIn: [kASSIANO VIEIRA](https://www.linkedin.com/in/kassianovieira/)

---

## 🙏 Agradecimentos

- [Electron](https://www.electronjs.org/) - Framework desktop incrível
- [Chart.js](https://www.chartjs.org/) - Biblioteca de gráficos
- [sql.js](https://sql.js.org/) - SQLite em JavaScript
- Comunidade open source 💚

---

## ⭐ Apoie o Projeto

Se o GenFins te ajudou, considere dar uma ⭐ no repositório!

---

<div align="center">
  <p>Desenvolvido por <strong>Kassiano</strong></p>
  <p>
    <a href="#-genfins---gerenciador-financeiro-pessoal">Voltar ao topo ⬆️</a>
  </p>
</div>