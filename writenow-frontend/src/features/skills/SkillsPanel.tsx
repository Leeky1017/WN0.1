/**
 * SkillsPanel - Skills management UI
 * Why: Allow users to view, enable/disable, and inspect skills.
 */

import { useCallback, useState } from 'react';
import { Zap, RefreshCw, ChevronRight, AlertCircle, Check, X, Eye } from 'lucide-react';

import { SidebarPanelSection } from '@/components/layout/sidebar-panel';
import { IconButton } from '@/components/ui/icon-button';
import { Switch } from '@/components/ui/switch';
import type { SkillListItem, SkillScope } from '@/types/ipc-generated';

import { useSkills } from './useSkills';

const SCOPE_LABELS: Record<SkillScope, string> = {
  builtin: '内置',
  global: '全局',
  project: '项目',
};

const SCOPE_COLORS: Record<SkillScope, string> = {
  builtin: 'text-[var(--fg-muted)] bg-[var(--bg-elevated)]',
  global: 'text-[var(--accent-default)] bg-[var(--accent-default)]/10',
  project: 'text-[var(--success)] bg-[var(--success)]/10',
};

interface SkillItemProps {
  skill: SkillListItem;
  onToggle: (id: string, enabled: boolean) => Promise<boolean>;
  onView: (id: string) => void;
}

function SkillItem({ skill, onToggle, onView }: SkillItemProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setToggling(true);
      await onToggle(skill.id, checked);
      setToggling(false);
    },
    [onToggle, skill.id],
  );

  return (
    <div className="group px-3 py-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--fg-default)] truncate">
              {skill.name}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${SCOPE_COLORS[skill.scope]}`}>
              {SCOPE_LABELS[skill.scope]}
            </span>
            {!skill.valid && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--error)]/10 text-[var(--error)] font-medium">
                无效
              </span>
            )}
          </div>
          {skill.description && (
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)] line-clamp-2">
              {skill.description}
            </p>
          )}
          {skill.error && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--error)]">
              <AlertCircle size={10} />
              <span>{skill.error.message}</span>
            </div>
          )}
          {skill.version && (
            <div className="mt-0.5 text-[10px] text-[var(--fg-subtle)]">
              v{skill.version}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <IconButton
            icon={Eye}
            size="xs"
            variant="ghost"
            tooltip="查看详情"
            onClick={() => onView(skill.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <Switch
            checked={skill.enabled}
            onCheckedChange={(checked) => void handleToggle(checked)}
            disabled={toggling || !skill.valid}
          />
        </div>
      </div>
    </div>
  );
}

interface SkillDetailProps {
  skill: NonNullable<ReturnType<typeof useSkills>['selectedSkill']>;
  onClose: () => void;
  onToggle: (id: string, enabled: boolean) => Promise<boolean>;
}

function SkillDetail({ skill, onClose, onToggle }: SkillDetailProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setToggling(true);
      await onToggle(skill.id, checked);
      setToggling(false);
    },
    [onToggle, skill.id],
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <button
          className="flex items-center gap-1 text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
          onClick={onClose}
        >
          <ChevronRight size={14} className="rotate-180" />
          返回列表
        </button>
        <Switch
          checked={skill.enabled}
          onCheckedChange={(checked) => void handleToggle(checked)}
          disabled={toggling || !skill.valid}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Name & Scope */}
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--fg-default)]">{skill.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SCOPE_COLORS[skill.scope]}`}>
              {SCOPE_LABELS[skill.scope]}
            </span>
            {skill.version && <span className="text-[10px] text-[var(--fg-subtle)]">v{skill.version}</span>}
            <span className="text-[10px] text-[var(--fg-subtle)]">
              {skill.enabled ? (
                <span className="flex items-center gap-1 text-[var(--success)]">
                  <Check size={10} />
                  已启用
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[var(--fg-muted)]">
                  <X size={10} />
                  已禁用
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Description */}
        {skill.description && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)] mb-1">
              描述
            </h4>
            <p className="text-[12px] text-[var(--fg-default)]">{skill.description}</p>
          </div>
        )}

        {/* Error */}
        {skill.error && (
          <div className="p-2 rounded-md bg-[var(--error)]/10 border border-[var(--error)]/30">
            <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--error)]">
              <AlertCircle size={12} />
              解析错误
            </div>
            <p className="mt-1 text-[11px] text-[var(--error)]">{skill.error.message}</p>
          </div>
        )}

        {/* Parse Error */}
        {skill.parseError && (
          <div className="p-2 rounded-md bg-[var(--warning)]/10 border border-[var(--warning)]/30">
            <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--warning)]">
              <AlertCircle size={12} />
              解析警告
            </div>
            <p className="mt-1 text-[11px] text-[var(--warning)]">{skill.parseError.message}</p>
          </div>
        )}

        {/* Source */}
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)] mb-1">
            来源
          </h4>
          <code className="text-[11px] text-[var(--fg-muted)] break-all">{skill.sourceUri}</code>
        </div>

        {/* Raw Content Preview */}
        {skill.rawText && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)] mb-1">
              内容预览
            </h4>
            <pre className="p-2 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-muted)] overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
              {skill.rawText.slice(0, 2000)}
              {skill.rawText.length > 2000 && '\n... (内容已截断)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function SkillsPanel() {
  const skills = useSkills();

  const builtinSkills = skills.skills.filter((s) => s.scope === 'builtin');
  const globalSkills = skills.skills.filter((s) => s.scope === 'global');
  const projectSkills = skills.skills.filter((s) => s.scope === 'project');

  const enabledCount = skills.skills.filter((s) => s.enabled).length;
  const totalCount = skills.skills.length;

  // If a skill is selected, show its detail view
  if (skills.selectedSkill) {
    return (
      <SkillDetail
        skill={skills.selectedSkill}
        onClose={skills.clearSelectedSkill}
        onToggle={skills.toggle}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[var(--accent-default)]" />
          <span className="text-[11px] font-medium text-[var(--fg-default)]">
            {enabledCount}/{totalCount} 已启用
          </span>
        </div>
        <IconButton
          icon={RefreshCw}
          size="xs"
          variant="ghost"
          tooltip="刷新"
          onClick={() => void skills.refresh()}
          disabled={skills.loading}
        />
      </div>

      {/* Error */}
      {skills.error && (
        <div className="px-3 py-2 text-[11px] text-[var(--error)] border-b border-[var(--error)]/40 bg-[var(--error)]/5">
          {skills.error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {skills.loading && skills.skills.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--fg-muted)]">正在加载…</div>
        ) : skills.skills.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--fg-muted)]">
            暂无可用技能。
          </div>
        ) : (
          <>
            {builtinSkills.length > 0 && (
              <SidebarPanelSection title="内置技能">
                <div className="space-y-1">
                  {builtinSkills.map((s) => (
                    <SkillItem
                      key={s.id}
                      skill={s}
                      onToggle={skills.toggle}
                      onView={skills.readSkill}
                    />
                  ))}
                </div>
              </SidebarPanelSection>
            )}

            {globalSkills.length > 0 && (
              <SidebarPanelSection title="全局技能">
                <div className="space-y-1">
                  {globalSkills.map((s) => (
                    <SkillItem
                      key={s.id}
                      skill={s}
                      onToggle={skills.toggle}
                      onView={skills.readSkill}
                    />
                  ))}
                </div>
              </SidebarPanelSection>
            )}

            {projectSkills.length > 0 && (
              <SidebarPanelSection title="项目技能">
                <div className="space-y-1">
                  {projectSkills.map((s) => (
                    <SkillItem
                      key={s.id}
                      skill={s}
                      onToggle={skills.toggle}
                      onView={skills.readSkill}
                    />
                  ))}
                </div>
              </SidebarPanelSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SkillsPanel;
