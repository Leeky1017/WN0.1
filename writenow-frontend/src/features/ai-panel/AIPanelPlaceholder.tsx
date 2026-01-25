/**
 * AIPanelPlaceholder - AI 面板占位符
 * Phase 3 实现完整 AI 面板
 */
import { Bot, Send, Sparkles } from 'lucide-react';
import { Button, Input } from '@/components/ui';

/**
 * AI 面板占位符组件
 * TODO P3-001: 迁移 AI 面板逻辑
 * TODO P3-002: 重做 AI 面板 UI (Cursor 风格)
 */
export function AIPanelPlaceholder() {
  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--blue-700)] flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-[var(--text-primary)]">AI 助手</span>
        <span className="ml-auto text-xs text-[var(--text-muted)]">Phase 3</span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Welcome Message */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--blue-700)] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
              <p className="text-sm text-[var(--text-primary)]">
                你好！我是 WriteNow AI 助手。
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                我可以帮你：
              </p>
              <ul className="text-sm text-[var(--text-muted)] mt-1 space-y-1">
                <li>• 润色和改进你的文字</li>
                <li>• 扩展或精简段落</li>
                <li>• 提供写作建议</li>
              </ul>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              完整功能将在 Phase 3 实现
            </p>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="p-4 rounded-lg bg-[var(--bg-input)] border border-dashed border-[var(--border-default)]">
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            即将推出
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="w-5 h-5 rounded bg-[var(--bg-panel)] flex items-center justify-center text-xs">1</span>
              流式输出响应
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="w-5 h-5 rounded bg-[var(--bg-panel)] flex items-center justify-center text-xs">2</span>
              Diff 对比视图
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="w-5 h-5 rounded bg-[var(--bg-panel)] flex items-center justify-center text-xs">3</span>
              斜杠命令 (/polish, /expand)
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="w-5 h-5 rounded bg-[var(--bg-panel)] flex items-center justify-center text-xs">4</span>
              内联 AI (Cmd+K)
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--border-subtle)]">
        <div className="flex gap-2">
          <Input 
            placeholder="输入消息..." 
            className="flex-1"
            disabled
          />
          <Button disabled size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
          Phase 3 启用 AI 功能
        </p>
      </div>
    </div>
  );
}

export default AIPanelPlaceholder;
