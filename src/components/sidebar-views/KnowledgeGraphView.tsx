import React from 'react';
import { useTranslation } from 'react-i18next';

export function KnowledgeGraphView() {
  const { t } = useTranslation();

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('nav.knowledgeGraph')}</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-tertiary)] mb-1">Sprint 5</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">知识图谱基础将在后续步骤实现</div>
        </div>
      </div>
    </>
  );
}

