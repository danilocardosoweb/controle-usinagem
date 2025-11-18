/**
 * Feature Flags para Refatoração Segura do ExpUsinagem.jsx
 * 
 * IMPORTANTE: Ativar flags uma por vez e testar antes de ativar a próxima
 * 
 * @created 18/11/2024
 * @author Cascade AI
 */

export const REFACTOR = {
  // Modais
  USE_NEW_APONTAMENTO_MODAL: true,
  USE_NEW_APROVAR_MODAL: false,
  USE_NEW_REABRIR_MODAL: false,
  
  // Tabs
  USE_NEW_TECNO_TAB: false,
  USE_NEW_ALUNICA_TAB: false,
  
  // Hooks
  USE_NEW_ALUNICA_HOOK: false,
  USE_NEW_TECNO_HOOK: false,
  
  // Debug
  LOG_REFACTOR_CHANGES: true,
  SHOW_WARNINGS: true
};

/**
 * Helper para logging de refatoração
 * @param {string} component - Nome do componente
 * @param {string} action - Ação executada
 * @param {any} data - Dados relevantes
 */
export const logRefactor = (component, action, data) => {
  if (REFACTOR.LOG_REFACTOR_CHANGES) {
    console.log(`[REFACTOR][${component}] ${action}:`, data);
  }
};

/**
 * Helper para avisos de refatoração
 * @param {string} message - Mensagem de aviso
 */
export const warnRefactor = (message) => {
  if (REFACTOR.SHOW_WARNINGS) {
    console.warn(`[REFACTOR WARNING] ${message}`);
  }
};

export default REFACTOR;
