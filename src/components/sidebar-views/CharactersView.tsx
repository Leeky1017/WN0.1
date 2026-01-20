import React from 'react';
import { useTranslation } from 'react-i18next';

import { CharactersPanel } from '../Characters/CharactersPanel';

export function CharactersView() {
  const { t } = useTranslation();

  return (
    <>
      <div className="sr-only">{t('nav.characters')}</div>
      <CharactersPanel />
    </>
  );
}
