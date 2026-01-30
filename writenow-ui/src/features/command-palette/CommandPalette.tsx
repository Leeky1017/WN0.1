/**
 * CommandPalette Component
 * 
 * 命令面板，Cmd+K 唤起，支持搜索和快捷键显示。
 * 
 * @see DESIGN_SPEC.md 8.1.4 搜索流程
 * @see DESIGN_SPEC.md 8.3.1 全局快捷键
 */
import { useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  FileText,
  Settings,
  Bot,
  FolderOpen,
  Clock,
  Download,
  Keyboard,
  Moon,
  Command,
  ArrowRight,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  useCommandStore,
  useFilteredCommands,
  useRecentCommands,
  CATEGORY_LABELS,
  type Command as CommandType,
  type CommandCategory,
} from '../../stores/commandStore';

/**
 * 分类图标映射
 */
const CATEGORY_ICONS: Record<CommandCategory, React.ReactNode> = {
  navigation: <ArrowRight className="w-3.5 h-3.5" />,
  editor: <FileText className="w-3.5 h-3.5" />,
  ai: <Bot className="w-3.5 h-3.5" />,
  file: <FolderOpen className="w-3.5 h-3.5" />,
  settings: <Settings className="w-3.5 h-3.5" />,
  project: <FolderOpen className="w-3.5 h-3.5" />,
};

/**
 * 命令项图标映射
 */
const COMMAND_ICONS: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  file: <FileText className="w-4 h-4" />,
  folder: <FolderOpen className="w-4 h-4" />,
  history: <Clock className="w-4 h-4" />,
  export: <Download className="w-4 h-4" />,
  shortcuts: <Keyboard className="w-4 h-4" />,
  theme: <Moon className="w-4 h-4" />,
};

interface CommandItemProps {
  command: CommandType;
  isSelected: boolean;
  onSelect: (command: CommandType) => void;
  onHover: () => void;
}

/**
 * 命令项组件
 */
function CommandItem({ command, isSelected, onSelect, onHover }: CommandItemProps) {
  const icon = command.icon ? COMMAND_ICONS[command.icon] : CATEGORY_ICONS[command.category];
  
  return (
    <button
      type="button"
      onClick={() => onSelect(command)}
      onMouseEnter={onHover}
      disabled={command.disabled}
      className={clsx(
        'w-full',
        'flex items-center gap-3',
        'px-3 py-2',
        'rounded-lg',
        'text-left',
        'transition-colors duration-[var(--duration-fast)]',
        
        isSelected
          ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)]',
        
        !command.disabled && 'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
        command.disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* 图标 */}
      <span className={clsx(
        'w-8 h-8 shrink-0',
        'flex items-center justify-center',
        'rounded-md',
        'bg-[var(--color-bg-surface)]',
        'text-[var(--color-text-tertiary)]',
        isSelected && 'text-[var(--color-text-primary)]',
      )}>
        {icon}
      </span>

      {/* 标签和描述 */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate">
          {command.label}
        </div>
        {command.description && (
          <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
            {command.description}
          </div>
        )}
      </div>

      {/* 快捷键 */}
      {command.shortcut && (
        <div className="flex items-center gap-1 shrink-0">
          {command.shortcut.split('+').map((key, idx) => (
            <kbd
              key={idx}
              className={clsx(
                'min-w-[20px] h-5',
                'px-1.5',
                'flex items-center justify-center',
                'bg-[var(--color-bg-surface)]',
                'border border-[var(--color-border-default)]',
                'rounded',
                'text-[11px] font-medium',
                'text-[var(--color-text-tertiary)]',
              )}
            >
              {key === 'Cmd' ? (
                <Command className="w-3 h-3" />
              ) : (
                key
              )}
            </kbd>
          ))}
        </div>
      )}
    </button>
  );
}

interface CommandGroupProps {
  category: CommandCategory;
  commands: CommandType[];
  selectedIndex: number;
  startIndex: number;
  onSelect: (command: CommandType) => void;
  onHover: (index: number) => void;
}

/**
 * 命令分组组件
 */
function CommandGroup({
  category,
  commands,
  selectedIndex,
  startIndex,
  onSelect,
  onHover,
}: CommandGroupProps) {
  return (
    <div className="mb-4">
      <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
        {CATEGORY_LABELS[category]}
      </div>
      <div className="space-y-0.5">
        {commands.map((command, idx) => (
          <CommandItem
            key={command.id}
            command={command}
            isSelected={startIndex + idx === selectedIndex}
            onSelect={onSelect}
            onHover={() => onHover(startIndex + idx)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 命令面板组件
 * 
 * @example
 * ```tsx
 * // 在 App.tsx 中使用
 * import { CommandPalette, useCommandPaletteKeyboard } from '@/features/command-palette';
 * 
 * function App() {
 *   useCommandPaletteKeyboard();
 *   
 *   return (
 *     <>
 *       <Routes />
 *       <CommandPalette />
 *     </>
 *   );
 * }
 * ```
 */
export function CommandPalette() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    isOpen,
    close,
    searchQuery,
    setSearchQuery,
    selectedIndex,
    setSelectedIndex,
    selectNext,
    selectPrevious,
    executeCommand,
  } = useCommandStore();
  
  const filteredCommands = useFilteredCommands();
  const recentCommands = useRecentCommands();
  
  // 按分类分组
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    const existing = acc.get(command.category) || [];
    acc.set(command.category, [...existing, command]);
    return acc;
  }, new Map<CommandCategory, CommandType[]>());
  
  // 计算所有命令的扁平列表（用于键盘导航）
  const flatCommands: CommandType[] = [];
  const hasRecent = recentCommands.length > 0 && !searchQuery.trim();
  
  if (hasRecent) {
    flatCommands.push(...recentCommands);
  }
  
  for (const commands of groupedCommands.values()) {
    flatCommands.push(...commands);
  }

  /**
   * 处理选中命令
   */
  const handleSelect = useCallback((command: CommandType) => {
    executeCommand(command.id);
  }, [executeCommand]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (selectedIndex < flatCommands.length - 1) {
          selectNext();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommands[selectedIndex]) {
          handleSelect(flatCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  }, [selectedIndex, flatCommands, selectNext, selectPrevious, handleSelect, close]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 计算各分组的起始索引
  let currentIndex = hasRecent ? recentCommands.length : 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        {/* 遮罩 */}
        <Dialog.Overlay
          className={clsx(
            'fixed inset-0',
            'bg-black/60',
            'z-50',
            'animate-fade-in',
            'data-[state=closed]:animate-fade-out',
          )}
        />

        {/* 内容 */}
        <Dialog.Content
          onKeyDown={handleKeyDown}
          className={clsx(
            // 定位
            'fixed',
            'top-[20%] left-1/2',
            '-translate-x-1/2',
            'z-50',
            
            // 尺寸
            'w-full max-w-[560px]',
            'max-h-[480px]',
            
            // 样式
            'rounded-xl',
            'bg-[var(--color-bg-body)]',
            'border border-[var(--color-border-default)]',
            'shadow-xl',
            'overflow-hidden',
            
            // 动画
            'animate-scale-in',
            'data-[state=closed]:animate-fade-out',
          )}
        >
          {/* 搜索框 */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-border-default)]">
            <Search className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type a command or search..."
              className={clsx(
                'flex-1',
                'bg-transparent',
                'text-[16px] text-[var(--color-text-primary)]',
                'placeholder:text-[var(--color-text-tertiary)]',
                'outline-none',
              )}
            />
            <kbd className={clsx(
              'px-2 py-0.5',
              'bg-[var(--color-bg-surface)]',
              'border border-[var(--color-border-default)]',
              'rounded',
              'text-[11px] font-medium',
              'text-[var(--color-text-tertiary)]',
            )}>
              ESC
            </kbd>
          </div>

          {/* 命令列表 */}
          <div className="p-2 max-h-[360px] overflow-y-auto">
            {flatCommands.length === 0 ? (
              <div className="py-8 text-center text-[14px] text-[var(--color-text-tertiary)]">
                No commands found
              </div>
            ) : (
              <>
                {/* 最近使用 */}
                {hasRecent && (
                  <CommandGroup
                    category="navigation"
                    commands={recentCommands}
                    selectedIndex={selectedIndex}
                    startIndex={0}
                    onSelect={handleSelect}
                    onHover={setSelectedIndex}
                  />
                )}

                {/* 按分类显示 */}
                {Array.from(groupedCommands.entries()).map(([category, commands]) => {
                  const startIndex = currentIndex;
                  currentIndex += commands.length;
                  
                  return (
                    <CommandGroup
                      key={category}
                      category={category}
                      commands={commands}
                      selectedIndex={selectedIndex}
                      startIndex={startIndex}
                      onSelect={handleSelect}
                      onHover={setSelectedIndex}
                    />
                  );
                })}
              </>
            )}
          </div>

          {/* 底部提示 */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
              <kbd className="w-5 h-5 flex items-center justify-center bg-[var(--color-bg-body)] border border-[var(--color-border-default)] rounded text-[10px]">↑</kbd>
              <kbd className="w-5 h-5 flex items-center justify-center bg-[var(--color-bg-body)] border border-[var(--color-border-default)] rounded text-[10px]">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
              <kbd className="px-1.5 h-5 flex items-center justify-center bg-[var(--color-bg-body)] border border-[var(--color-border-default)] rounded text-[10px]">↵</kbd>
              <span>to select</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

CommandPalette.displayName = 'CommandPalette';

/**
 * 命令面板键盘快捷键 Hook
 * 
 * 在 App 根组件中使用，绑定 Cmd+K 唤起命令面板。
 */
export function useCommandPaletteKeyboard() {
  const { toggle } = useCommandStore();
  
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Cmd+K (Mac) 或 Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);
}
