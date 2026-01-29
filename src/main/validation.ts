// src/main/validation.ts
import { z } from 'zod';

// ========== SCHEMAS DE VALIDAÇÃO ==========

// Usuário
export const UsuarioCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
});

// Conta
export const ContaCreateSchema = z.object({
  usuario_id: z.number().int().positive('ID de usuário inválido'),
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  saldo: z.number().optional().default(0),
  tipo: z.enum(['corrente', 'poupanca', 'investimento', 'carteira']),
  ativa: z.boolean().optional().default(true),
});

export const ContaUpdateSchema = z
  .object({
    nome: z.string().min(1).max(255).optional(),
    saldo: z.number().optional(),
    tipo: z.enum(['corrente', 'poupanca', 'investimento', 'carteira']).optional(),
    ativa: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser atualizado',
  });

// Categoria
export const CategoriaCreateSchema = z.object({
  usuario_id: z.number().int().positive('ID de usuário inválido'),
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  tipo: z.enum(['receita', 'despesa']),
  cor: z.string().max(50).optional(),
  icone: z.string().max(50).optional(),
});

export const CategoriaUpdateSchema = z
  .object({
    nome: z.string().min(1).max(255).optional(),
    tipo: z.enum(['receita', 'despesa']).optional(),
    cor: z.string().max(50).optional(),
    icone: z.string().max(50).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser atualizado',
  });

// Orçamento
export const OrcamentoCreateSchema = z.object({
  usuario_id: z.number().int().positive('ID de usuário inválido'),
  categoria_id: z.number().int().positive('ID de categoria inválido'),
  valor_planejado: z.number().positive('Valor deve ser positivo'),
  mes: z.number().int().min(1, 'Mês inválido').max(12, 'Mês inválido'),
  ano: z.number().int().min(2000, 'Ano inválido').max(2100, 'Ano inválido'),
});

export const OrcamentoUpdateSchema = z
  .object({
    categoria_id: z.number().int().positive().optional(),
    valor_planejado: z.number().positive().optional(),
    mes: z.number().int().min(1).max(12).optional(),
    ano: z.number().int().min(2000).max(2100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser atualizado',
  });

// Transação
export const TransacaoCreateSchema = z.object({
  usuario_id: z.number().int().positive('ID de usuário inválido'),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255, 'Descrição muito longa'),
  valor: z.number().positive('Valor deve ser positivo').max(999999999, 'Valor muito alto'),
  tipo: z.enum(['receita', 'despesa']),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  conta_id: z.number().int().positive('ID de conta inválido'),
  categoria_id: z.number().int().positive('ID de categoria inválido'),
  observacoes: z.string().max(1000, 'Observações muito longas').optional(),
});

export const TransacaoUpdateSchema = z
  .object({
    descricao: z.string().min(1).max(255).optional(),
    valor: z.number().positive().max(999999999).optional(),
    tipo: z.enum(['receita', 'despesa']).optional(),
    data: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    conta_id: z.number().int().positive().optional(),
    categoria_id: z.number().int().positive().optional(),
    observacoes: z.string().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser atualizado',
  });

// Cartão
export const CartaoCreateSchema = z.object({
  usuario_id: z.number().int().positive('ID de usuário inválido'),
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  valor: z.number().min(0, 'Valor não pode ser negativo').default(0),
  vencimento: z.number().int().min(1, 'Vencimento deve ser entre 1 e 31').max(31, 'Vencimento deve ser entre 1 e 31'),
  status: z.enum(['aberta', 'fechada', 'paga', 'pendente']).default('aberta'),
});

export const CartaoUpdateSchema = z
  .object({
    nome: z.string().min(1).max(255).optional(),
    valor: z.number().min(0).optional(),
    vencimento: z.number().int().min(1).max(31).optional(),
    status: z.enum(['aberta', 'fechada', 'paga', 'pendente']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser atualizado',
  });

// Parcela
export const ParcelaCreateSchema = z.object({
  usuario_id: z.number().int().positive('ID de usuário inválido'),
  cartao_id: z.number().int().positive('ID de cartão inválido'),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255, 'Descrição muito longa'),
  dia: z.number().int().min(1).max(31, 'Dia deve ser entre 1 e 31'),
  valor_parcela: z.number().positive('Valor da parcela deve ser positivo'),
  quantidade_parcelas: z.number().int().min(1, 'Mínimo 1 parcela').max(60, 'Máximo 60 parcelas'),
  total: z.number().positive('Valor total deve ser positivo'),
});

export const ParcelaUpdateSchema = z
  .object({
    descricao: z.string().min(1).max(255).optional(),
    valor_parcela: z.number().positive().optional(),
    quantidade_parcelas: z.number().int().min(1).max(60).optional(),
    total: z.number().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser atualizado',
  });

// Transação de Cartão
export const TransacaoCartaoCreateSchema = z.object({
  usuario_id: z.number().int().positive('ID de usuário inválido'),
  cartao_id: z.number().int().positive('ID de cartão inválido'),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255, 'Descrição muito longa'),
  valor: z.number().positive('Valor deve ser positivo').max(999999999, 'Valor muito alto'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  categoria_id: z.number().int().positive('ID de categoria inválido').optional(),
  parcelas: z.number().int().min(1).max(60).default(1),
  parcela_atual: z.number().int().min(1).default(1),
  grupo_parcelamento: z.string().max(100).optional(),
  observacoes: z.string().max(1000).optional(),
});

export const TransacaoCartaoUpdateSchema = z
  .object({
    descricao: z.string().min(1).max(255).optional(),
    valor: z.number().positive().max(999999999).optional(),
    data: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    categoria_id: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser atualizado',
  });

// Schema para criação de transação parcelada
export const TransacaoParceladaSchema = z.object({
  transacao: TransacaoCartaoCreateSchema.omit({ parcelas: true, parcela_atual: true, grupo_parcelamento: true }),
  numeroParcelas: z.number().int().min(2, 'Mínimo 2 parcelas').max(60, 'Máximo 60 parcelas'),
});

// Schemas simples para IDs e parâmetros
export const IdSchema = z.number().int().positive('ID inválido');

export const EmailSchema = z.string().email('Email inválido').max(255);

export const LimitSchema = z.number().int().positive().max(1000).optional();

export const TipoCategoriaSchema = z.enum(['receita', 'despesa']).optional();

export const MesSchema = z.number().int().min(1).max(12).optional();

export const AnoSchema = z.number().int().min(2000).max(2100).optional();

export const DataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .refine(
    (date) => {
      const d = new Date(date);
      return d instanceof Date && !isNaN(d.getTime());
    },
    { message: 'Data inválida' }
  )
  .optional();

// Paginação
export const PaginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(50),
});

// ========== FUNÇÃO DE SANITIZAÇÃO DE ERROS ==========

/**
 * Mapeia erros internos para mensagens amigáveis ao usuário
 * Evita vazamento de informações sensíveis
 */
export function sanitizeError(error: Error): string {
  const errorMessage = error.message.toLowerCase();

  // Mapeamento de erros SQL para mensagens amigáveis
  const errorMappings: Record<string, string> = {
    'unique constraint failed': 'Este registro já existe no sistema',
    'not null constraint failed': 'Campos obrigatórios não preenchidos',
    'foreign key constraint failed': 'Registro relacionado não encontrado',
    'check constraint failed': 'Valor inválido para este campo',
    'no such table': 'Erro de configuração do banco de dados',
    'syntax error': 'Erro ao processar a solicitação',
    'database is locked': 'Sistema temporariamente indisponível. Tente novamente.',
    'out of memory': 'Memória insuficiente. Tente reduzir a quantidade de dados.',
  };

  // Verificar se o erro corresponde a algum padrão conhecido
  for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
    if (errorMessage.includes(pattern)) {
      return friendlyMessage;
    }
  }

  // Mensagem genérica para erros não mapeados
  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
}

// ========== FUNÇÕES AUXILIARES DE VALIDAÇÃO ==========

/**
 * Valida dados contra um schema e retorna resultado tipado
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Retorna a primeira mensagem de erro
      const firstError = error.issues[0];
      return {
        success: false,
        error: firstError.message || 'Dados inválidos',
      };
    }
    return { success: false, error: 'Dados inválidos' };
  }
}

/**
 * Valida múltiplos parâmetros de uma vez
 */
export function validateParams(
  validations: Array<{ schema: z.ZodSchema; data: unknown }>
): { success: true } | { success: false; error: string } {
  for (const { schema, data } of validations) {
    const result = validateData(schema, data);
    if (!result.success) {
      return result;
    }
  }
  return { success: true };
}
