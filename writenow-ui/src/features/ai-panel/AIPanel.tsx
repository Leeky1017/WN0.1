/**
 * AIPanel Component
 *
 * AI 面板主组件，组装所有子组件：
 * - AIHeader: 模型/角色选择 + 操作按钮
 * - AIMessageList: 消息列表
 * - AIInput: 输入区域
 *
 * 宽度：360px（由 layoutStore 控制）
 *
 * @see DESIGN_SPEC.md 7.2 Dashboard 页面
 * @see DESIGN_SPEC.md 8.1.7 AI 对话流程
 */
import { useCallback } from 'react';
import { clsx } from 'clsx';
import { AIHeader } from './components/AIHeader';
import { AIMessageList } from './components/AIMessageList';
import { AIInput } from './components/AIInput';
import { useAIStore } from '../../stores/aiStore';

export interface AIPanelProps {
  /** 折叠面板回调 */
  onCollapse?: () => void;
  /** 应用代码到编辑器回调 */
  onApplyCode?: (code: string) => void;
  /** 插入代码到编辑器回调 */
  onInsertCode?: (code: string) => void;
  /** 自定义类名 */
  className?: string;
}

export function AIPanel({
  onCollapse,
  onApplyCode,
  onInsertCode,
  className,
}: AIPanelProps) {
  // 从 store 获取状态和 actions
  const {
    messages,
    inputText,
    setInputText,
    runStatus,
    selectedModelId,
    setSelectedModel,
    selectedRoleId,
    setSelectedRole,
    availableModels,
    availableRoles,
    sendMessage,
    cancelRun,
    clearMessages,
  } = useAIStore();

  const isRunning = runStatus !== 'idle';

  // 处理发送消息
  const handleSend = useCallback(() => {
    if (inputText.trim()) {
      sendMessage(inputText);
    }
  }, [inputText, sendMessage]);

  // 处理取消
  const handleCancel = useCallback(() => {
    cancelRun();
  }, [cancelRun]);

  // 处理清空对话
  const handleClear = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  return (
    <div
      className={clsx(
        'h-full flex flex-col',
        'bg-[var(--color-bg-surface)]',
        className
      )}
    >
      {/* Header */}
      <AIHeader
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModel}
        models={availableModels}
        selectedRoleId={selectedRoleId}
        onRoleChange={setSelectedRole}
        roles={availableRoles}
        onClear={handleClear}
        onCollapse={onCollapse}
        hasMessages={messages.length > 0}
      />

      {/* Message List */}
      <AIMessageList
        messages={messages}
        isStreaming={isRunning}
        onApplyCode={onApplyCode}
        onInsertCode={onInsertCode}
      />

      {/* Input Area */}
      <AIInput
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
        onCancel={handleCancel}
        isLoading={isRunning}
        placeholder="Ask anything about your writing..."
      />
    </div>
  );
}

AIPanel.displayName = 'AIPanel';

/**
 * 独立使用的 AIPanel（带边框）
 */
export function AIPanelStandalone(props: AIPanelProps) {
  return (
    <div className="h-full border-l border-[var(--color-border-default)]">
      <AIPanel {...props} />
    </div>
  );
}

AIPanelStandalone.displayName = 'AIPanelStandalone';
