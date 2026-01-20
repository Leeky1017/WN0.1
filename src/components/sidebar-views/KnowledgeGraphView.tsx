import React from 'react';
import { useTranslation } from 'react-i18next';

import { KnowledgeGraphPanel } from '../KnowledgeGraph/KnowledgeGraphPanel';

export function KnowledgeGraphView() {
  const { t } = useTranslation();

  return (
    <>
      <div className="sr-only">{t('nav.knowledgeGraph')}</div>
      <KnowledgeGraphPanel />
    </>
  );
}
