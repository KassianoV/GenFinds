# Guia de Contribuição

Obrigado por considerar contribuir com o GenFins! 🎉

## 📋 Convenção de Commits

Este projeto segue a [Conventional Commits](https://www.conventionalcommits.org/pt-br/).

### Formato:
```
<tipo>(<escopo>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

### Tipos Permitidos:

- **feat**: Nova funcionalidade
- **fix**: Correção de bug
- **docs**: Apenas documentação
- **style**: Formatação, espaços, etc (sem mudança de código)
- **refactor**: Refatoração de código
- **perf**: Melhoria de performance
- **test**: Adição de testes
- **chore**: Tarefas de build, configurações, etc
- **build**: Mudanças no sistema de build
- **ci**: Mudanças em CI/CD

### Escopos Comuns:

- **dashboard**: Dashboard e visualizações
- **transacoes**: Módulo de transações
- **contas**: Módulo de contas
- **categorias**: Módulo de categorias
- **orcamentos**: Módulo de orçamentos
- **relatorios**: Módulo de relatórios
- **ui**: Interface do usuário
- **db**: Database/persistência
- **build**: Sistema de build

### Exemplos:
```bash
# Nova funcionalidade
feat(transacoes): adiciona filtro por período personalizado

# Correção de bug
fix(dashboard): corrige cálculo de economia mensal

# Documentação
docs(readme): atualiza instruções de instalação

# Refatoração
refactor(db): simplifica queries de relatório

# Performance
perf(dashboard): otimiza renderização do gráfico

# Build
build: atualiza electron para versão 28.3.3

# UI
style(transacoes): ajusta espaçamento dos filtros
```

### ❌ Exemplos Ruins:
```bash
# Muito vago
fix: corrige bug

# Sem tipo
adiciona nova feature

# Muito longo na descrição curta
feat(transacoes): adiciona sistema completo de filtros avançados com suporte a múltiplos critérios incluindo data, valor, categoria e conta com interface redesenhada
```

### ✅ Boas Práticas:

1. **Use o imperativo**: "adiciona" não "adicionado" ou "adicionando"
2. **Primeira letra minúscula**: "adiciona filtro" não "Adiciona filtro"
3. **Sem ponto final**: "adiciona filtro" não "adiciona filtro."
4. **Seja específico**: "corrige cálculo de saldo" não "corrige bug"
5. **Máximo 50 caracteres** na descrição curta

---

## 🔄 Workflow de Desenvolvimento

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/genfins.git
cd genfins
```

### 2. Instale Dependências
```bash
npm install
```

### 3. Crie uma Branch
```bash
git checkout -b feat/minha-nova-feature
```

### 4. Desenvolva e Teste
```bash
npm run dev
```

### 5. Commit com Convenção
```bash
git add .
git commit -m "feat(dashboard): adiciona gráfico de despesas por categoria"
```

### 6. Push e Pull Request
```bash
git push origin feat/minha-nova-feature
```

---

## 🧪 Testando
```bash
# Desenvolvimento
npm run dev

# Build de teste
npm run build:dir

# Build completo
npm run build:prod
```

---

## 📦 Versionamento

Ao fazer release:
```bash
# Atualizar versão (automático gera changelog)
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Push com tags
git push --follow-tags
```

---

## 📝 Gerando Changelog
```bash
# Gerar changelog automaticamente
npm run changelog
```

---

## 🐛 Reportando Bugs

Ao reportar bugs, inclua:
- Versão do GenFins
- Sistema operacional
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)

---

## 💡 Sugerindo Features

Ao sugerir features, inclua:
- Descrição clara da funcionalidade
- Caso de uso
- Mockups ou wireframes (se aplicável)
- Impacto esperado

---

## ✅ Checklist de PR

- [ ] Código segue convenção de commits
- [ ] Funcionalidade testada localmente
- [ ] Documentação atualizada (se necessário)
- [ ] Build passa sem erros
- [ ] Sem console.logs desnecessários

---

**Obrigado por contribuir! 🚀**