export type WnPreviewTheme = 'dark' | 'light';

export function getWnPreviewTheme(): WnPreviewTheme {
  const raw = document.documentElement.dataset.theme;
  return raw === 'light' ? 'light' : 'dark';
}

