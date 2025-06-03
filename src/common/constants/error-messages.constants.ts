/**
 * Constantes para mensagens de erro padronizadas
 * Centraliza todas as mensagens de erro da aplicação para consistência
 */

export const ERROR_MESSAGES = {
  // Autenticação
  INVALID_CREDENTIALS:
    'Credenciais inválidas. Verifique email/usuário e senha.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  UNAUTHORIZED: 'Acesso não autorizado.',
  TOKEN_EXPIRED: 'Token expirado. Faça login novamente.',
  INVALID_TOKEN: 'Token inválido.',

  // Autorização
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  INSUFFICIENT_PERMISSIONS:
    'Permissões insuficientes para acessar este recurso.',

  // Validação
  REQUIRED_FIELD: 'Este campo é obrigatório.',
  INVALID_EMAIL: 'Formato de email inválido.',
  INVALID_PASSWORD: 'Senha deve ter no mínimo 8 caracteres.',
  PASSWORD_TOO_SHORT: 'A senha deve ter no mínimo 8 caracteres.',

  // Conflitos
  EMAIL_ALREADY_EXISTS: 'Este email já está em uso.',
  USERNAME_ALREADY_EXISTS: 'Este nome de usuário já está em uso.',
  USER_ALREADY_EXISTS: 'Usuário já existe com estes dados.',

  // Erros de sistema
  INTERNAL_ERROR: 'Erro interno do servidor. Tente novamente mais tarde.',
  DATABASE_ERROR: 'Erro de conexão com o banco de dados.',
  CONFIGURATION_ERROR: 'Erro de configuração do sistema.',

  // Contexto
  UNSUPPORTED_CONTEXT: 'Contexto de requisição não suportado.',
  USER_NOT_IN_CONTEXT: 'Usuário autenticado não encontrado no contexto.',

  // CASL/Permissões
  PERMISSION_CHECK_ERROR: 'Erro ao verificar permissões.',
  PERMISSION_NOT_FOUND: 'Permissão não encontrada.',
  INVALID_PERMISSION_CONDITION: 'Condição de permissão inválida.',
} as const;

/**
 * Mensagens de sucesso padronizadas
 */
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'Usuário criado com sucesso.',
  USER_UPDATED: 'Usuário atualizado com sucesso.',
  USER_DELETED: 'Usuário removido com sucesso.',
  LOGIN_SUCCESS: 'Login realizado com sucesso.',
  LOGOUT_SUCCESS: 'Logout realizado com sucesso.',
  TOKEN_REFRESHED: 'Token renovado com sucesso.',
  PERMISSION_GRANTED: 'Permissão concedida.',
  PERMISSION_CREATED: 'Permissão criada com sucesso.',
} as const;
