export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'light';
export const THEME_COOKIE = 'theme';

/** Only known values are ever written into the page. */
export const parseTheme = (value: string | undefined): Theme =>
	THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
