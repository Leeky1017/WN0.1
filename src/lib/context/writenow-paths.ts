export const WRITENOW_DIR = '.writenow' as const;

export const WRITENOW_RULES_DIR = `${WRITENOW_DIR}/rules` as const;
export const WRITENOW_CHARACTERS_DIR = `${WRITENOW_DIR}/characters` as const;
export const WRITENOW_SETTINGS_DIR = `${WRITENOW_DIR}/settings` as const;
export const WRITENOW_CONVERSATIONS_DIR = `${WRITENOW_DIR}/conversations` as const;
export const WRITENOW_CACHE_DIR = `${WRITENOW_DIR}/cache` as const;

export const WRITENOW_RULES_STYLE = `${WRITENOW_RULES_DIR}/style.md` as const;
export const WRITENOW_RULES_TERMINOLOGY = `${WRITENOW_RULES_DIR}/terminology.json` as const;
export const WRITENOW_RULES_CONSTRAINTS = `${WRITENOW_RULES_DIR}/constraints.json` as const;

export function joinWritenowPath(...segments: string[]) {
  const cleaned = segments
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .map((s) => s.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, ''));
  if (cleaned.length === 0) return WRITENOW_DIR;
  return `${WRITENOW_DIR}/${cleaned.join('/')}`;
}

