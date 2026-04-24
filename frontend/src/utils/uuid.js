/**
 * Utilitários para geração de UUID
 */

/**
 * Gera um UUID v4 simples
 * @returns {string} UUID no formato xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Valida se uma string é um UUID válido
 * @param {string} uuid - String para validar
 * @returns {boolean} True se for um UUID válido
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Gera um ID sequencial para uso interno (não para banco)
 * @returns {string} ID sequencial baseado em timestamp
 */
export function generateSequentialId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
