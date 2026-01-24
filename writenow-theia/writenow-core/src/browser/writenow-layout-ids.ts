/**
 * Why: Keep widget IDs stable across factories/contributions so layout persistence and commands
 * don't drift as Theia migration phases evolve.
 */
export const WRITENOW_WELCOME_WIDGET_ID = 'writenow.welcome';

/**
 * Why: Right-side placeholder slot for the AI Panel feature.
 */
export const WRITENOW_AI_PANEL_WIDGET_ID = 'writenow.aiPanel';

/**
 * Why: The Version History panel is a core WriteNow differentiator ("文字的 Git"). Keep its widget id stable so
 * layout persistence + commands remain consistent across the Theia migration phases.
 */
export const WRITENOW_VERSION_HISTORY_WIDGET_ID = 'writenow.versionHistory';

/**
 * Why: Keep Knowledge Graph widget IDs stable so layout persistence and commands remain consistent across Phase 3
 * and future rewrites (e.g. Graphology + Sigma.js).
 */
export const WRITENOW_KNOWLEDGE_GRAPH_WIDGET_ID = 'writenow.knowledgeGraph';

