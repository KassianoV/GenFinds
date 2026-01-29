// src/renderer/scripts/config.js
// Arquivo de configuração centralizado para constantes do sistema

const CONFIG = {
  // Configurações de Cartão
  DIAS_ANTES_FECHAMENTO_CARTAO: 6,

  // Configurações de Paginação
  ITENS_POR_PAGINA_DEFAULT: 10,
  ITENS_POR_PAGINA_TRANSACOES: 10,
  ITENS_POR_PAGINA_FATURA: 10,
  ITENS_POR_PAGINA_PARCELAS: 10,
  MAX_ITENS_POR_PAGINA: 100,

  // Configurações de Gráficos
  MESES_HISTORICO_GRAFICO: 6,

  // Configurações de Parcelas
  MIN_PARCELAS: 2,
  MAX_PARCELAS: 60,

  // Configurações de Debounce
  DEBOUNCE_BUSCA_MS: 300,
  DEBOUNCE_RENDER_MS: 100,

  // Configurações de Validação
  MAX_DESCRICAO_LENGTH: 255,
  MAX_OBSERVACOES_LENGTH: 1000,
  MAX_VALOR_TRANSACAO: 999999999,

  // Configurações de Rate Limiting (sincronizado com backend)
  MAX_LOGIN_ATTEMPTS: 5,
  BLOCK_DURATION_MINUTES: 15,

  // Array de meses para reutilização
  MESES: [
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
  ],

  // Abreviação dos meses
  MESES_ABREV: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],

  // Tipos de conta
  TIPOS_CONTA: ['corrente', 'poupanca', 'investimento', 'carteira'],

  // Status de cartão
  STATUS_CARTAO: ['aberta', 'fechada', 'paga', 'pendente'],

  // Tipos de transação
  TIPOS_TRANSACAO: ['receita', 'despesa'],

  // Cores padrão para categorias
  COR_CATEGORIA_DEFAULT: '#4CAF50',

  // Timeout para cache (em milissegundos)
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutos
};

// Congelar objeto para prevenir modificações acidentais
Object.freeze(CONFIG);
Object.freeze(CONFIG.MESES);
Object.freeze(CONFIG.MESES_ABREV);
Object.freeze(CONFIG.TIPOS_CONTA);
Object.freeze(CONFIG.STATUS_CARTAO);
Object.freeze(CONFIG.TIPOS_TRANSACAO);
