/**
 * Zustand Stores Index
 * 
 * 导出所有状态管理 stores
 */
export { useLayoutStore, LAYOUT_CONSTRAINTS } from './layoutStore';
export type { LayoutState, PanelVariant } from './layoutStore';

export { useAuthStore } from './authStore';
export type { AuthState, User } from './authStore';

export { useProjectStore, useFilteredProjects, useFeaturedProject } from './projectStore';
export type { ProjectState, Project } from './projectStore';

export { useEditorStore, useSaveStatusText } from './editorStore';
export type { EditorState, SaveStatus, DocumentMeta } from './editorStore';

export { useAIStore, useLastMessage, useIsRunning } from './aiStore';
export type {
  AIState,
  AIMessage,
  AIRunStatus,
  AIModel,
  AIRole,
  MessageRole,
  MessageStatus,
} from './aiStore';

export {
  useSettingsStore,
  useWritingSettings,
  useDataSettings,
  useAppearanceSettings,
  useActiveSection,
} from './settingsStore';
export type {
  SettingsState,
  UserSettings,
  WritingSettings,
  DataSettings,
  AppearanceSettings,
  SettingsSection,
} from './settingsStore';

export { useFileStore, useSelectedNode } from './fileStore';
export type { FileState, FileNode, FileNodeType } from './fileStore';

export {
  useCommandStore,
  useFilteredCommands,
  useGroupedCommands,
  useRecentCommands,
  CATEGORY_LABELS,
} from './commandStore';
export type { CommandState, Command, CommandCategory } from './commandStore';

export {
  useVersionStore,
  useSelectedVersion,
  formatVersionTime,
} from './versionStore';
export type { VersionState, VersionItem, VersionDiff, VersionActor } from './versionStore';

export { useSkillsStore, SKILL_CATEGORIES } from './skillsStore';
export type { SkillsState, Skill, SkillCategory } from './skillsStore';

export { useMemoryStore, MEMORY_TYPES, formatMemoryTime } from './memoryStore';
export type { MemoryState, Memory, MemoryType, MemoryOrigin } from './memoryStore';

export { useSearchStore, SEARCH_MODES, RESULT_TYPES } from './searchStore';
export type { SearchState, SearchResult, SearchResultType, SearchMode } from './searchStore';
