/**
 * StatusBar - 底部状态栏
 * 显示光标位置、字数统计、AI 状态、保存状态等
 */
import { useStatusBarStore, type AIStatus, type SaveStatus } from '@/stores';
import { 
  Bot, 
  Check, 
  Loader2, 
  AlertCircle, 
  Circle,
  Wifi,
  WifiOff,
} from 'lucide-react';

/**
 * 状态栏项目组件
 */
function StatusItem({ 
  children, 
  className = '',
  separator = true,
}: { 
  children: React.ReactNode; 
  className?: string;
  separator?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${separator ? 'border-r border-[var(--border-subtle)] pr-3 mr-3' : ''} ${className}`}>
      {children}
    </div>
  );
}

/**
 * AI 状态指示器
 */
function AIStatusIndicator({ status, message }: { status: AIStatus; message: string }) {
  const config: Record<AIStatus, { icon: React.ReactNode; label: string; className: string }> = {
    idle: {
      icon: <Bot className="w-3.5 h-3.5" />,
      label: 'AI 就绪',
      className: 'text-[var(--text-muted)]',
    },
    thinking: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      label: message || 'AI 思考中...',
      className: 'text-[var(--accent)]',
    },
    streaming: {
      icon: <Bot className="w-3.5 h-3.5 animate-pulse" />,
      label: message || 'AI 输出中...',
      className: 'text-[var(--color-success)]',
    },
    error: {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: message || 'AI 错误',
      className: 'text-[var(--color-error)]',
    },
  };

  const { icon, label, className } = config[status];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * 保存状态指示器
 */
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const config: Record<SaveStatus, { icon: React.ReactNode; label: string; className: string }> = {
    saved: {
      icon: <Check className="w-3.5 h-3.5" />,
      label: '已保存',
      className: 'text-[var(--text-muted)]',
    },
    saving: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      label: '保存中...',
      className: 'text-[var(--accent)]',
    },
    unsaved: {
      icon: <Circle className="w-2 h-2 fill-current" />,
      label: '未保存',
      className: 'text-[var(--color-warning)]',
    },
    error: {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: '保存失败',
      className: 'text-[var(--color-error)]',
    },
  };

  const { icon, label, className } = config[status];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * 连接状态指示器
 */
function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${connected ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]'}`}>
      {connected ? (
        <Wifi className="w-3.5 h-3.5" />
      ) : (
        <WifiOff className="w-3.5 h-3.5" />
      )}
    </div>
  );
}

/**
 * 状态栏主组件
 */
export function StatusBar() {
  const {
    cursorPosition,
    wordCount,
    charCount,
    documentType,
    aiStatus,
    aiStatusMessage,
    saveStatus,
    isConnected,
  } = useStatusBarStore();

  return (
    <div
      className="h-6 bg-[var(--bg-sidebar)] border-t border-[var(--border-subtle)] flex items-center justify-between px-4 text-[var(--text-muted)] text-xs select-none"
      data-testid="statusbar"
    >
      {/* Left Section */}
      <div className="flex items-center">
        <StatusItem>
          <span>
            行 {cursorPosition.line}, 列 {cursorPosition.column}
          </span>
        </StatusItem>
        
        <StatusItem>
          <span>{wordCount.toLocaleString()} 字</span>
          <span className="text-[var(--text-muted)]/60">
            ({charCount.toLocaleString()} 字符)
          </span>
        </StatusItem>
        
        <StatusItem separator={false}>
          <span>{documentType}</span>
        </StatusItem>
      </div>

      {/* Right Section */}
      <div className="flex items-center">
        <StatusItem>
          <AIStatusIndicator status={aiStatus} message={aiStatusMessage} />
        </StatusItem>
        
        <StatusItem>
          <SaveStatusIndicator status={saveStatus} />
        </StatusItem>
        
        <StatusItem separator={false}>
          <ConnectionIndicator connected={isConnected} />
        </StatusItem>
      </div>
    </div>
  );
}

export default StatusBar;
