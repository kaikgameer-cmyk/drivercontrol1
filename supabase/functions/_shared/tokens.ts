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

/**
 * Gera o hash SHA-256 em hexadecimal de um token arbitrário
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
