/**
 * Utilitário para geração de tokens seguros
 */

/**
 * Gera um token seguro para criação/redefinição de senha
 * Usa crypto.randomUUID() para gerar um UUID v4 único
 */
export function generateSecureToken(): string {
  return crypto.randomUUID();
}

/**
 * Calcula a data de expiração do token (padrão: 24 horas)
 */
export function getTokenExpiration(hours: number = 24): Date {
  const now = new Date();
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}
