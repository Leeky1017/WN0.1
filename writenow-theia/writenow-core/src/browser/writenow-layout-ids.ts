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

/**
 * Why: Settings panel widget id for user preferences configuration.
 */
export const WRITENOW_SETTINGS_WIDGET_ID = 'writenow.settings';

/**
 * Why: Outline panel widget id for document heading navigation.
 */
export const WRITENOW_OUTLINE_WIDGET_ID = 'writenow.outline';

/**
 * Why: Shortcuts dialog widget id for keyboard shortcuts cheatsheet.
 */
export const WRITENOW_SHORTCUTS_DIALOG_ID = 'writenow.shortcutsDialog';

/**
 * Why: About dialog widget id for application information.
 */
export const WRITENOW_ABOUT_DIALOG_ID = 'writenow.aboutDialog';

/**
 * Why: Notification center widget id for centralized notifications.
 */
export const WRITENOW_NOTIFICATION_WIDGET_ID = 'writenow.notification';

/**
 * Why: Character management panel widget id (P2-003).
 */
export const WRITENOW_CHARACTER_WIDGET_ID = 'writenow.character';

/**
 * Why: Terminology panel widget id (P2-004).
 */
export const WRITENOW_TERMINOLOGY_WIDGET_ID = 'writenow.terminology';

/**
 * Why: Writing stats panel widget id (P2-005).
 */
export const WRITENOW_STATS_WIDGET_ID = 'writenow.stats';

/**
 * Why: Log viewer panel widget id (P2-006).
 */
export const WRITENOW_LOG_VIEWER_WIDGET_ID = 'writenow.logViewer';

/**
 * Why: User guide panel widget id (P2-007).
 */
export const WRITENOW_USER_GUIDE_WIDGET_ID = 'writenow.userGuide';

/**
 * Why: Semantic search panel widget id (P3-002).
 */
export const WRITENOW_SEMANTIC_SEARCH_WIDGET_ID = 'writenow.semanticSearch';

/**
 * Why: Memory viewer panel widget id (P3-004).
 */
export const WRITENOW_MEMORY_VIEWER_WIDGET_ID = 'writenow.memoryViewer';

/**
 * Why: Constraint editor panel widget id (P3-003).
 */
export const WRITENOW_CONSTRAINT_EDITOR_WIDGET_ID = 'writenow.constraintEditor';

/**
 * Why: Context debugger panel widget id (P3-001).
 */
export const WRITENOW_CONTEXT_DEBUGGER_WIDGET_ID = 'writenow.contextDebugger';
