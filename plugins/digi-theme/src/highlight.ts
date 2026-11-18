import type { Line } from './charts.ts';
import { languages, tokenize } from './highlight.generated.js';

const ANSI_THEME_KEYS = [undefined, 'error', 'success', 'warning', 'permission', 'merged', 'planMode', undefined];

const readThemeKey = (color: string | undefined): string | undefined => {
  const index = /^#0(?<index>[0-7])000000$/u.exec(color ?? '')?.groups?.['index'];
  return index === undefined ? undefined : ANSI_THEME_KEYS[Number(index)];
};

export const isHighlightable = (language: string): boolean => languages.has(language.toLowerCase());

export const highlightLines = (source: string, language: string): Line[] =>
  tokenize(source, language.toLowerCase()).map(tokens =>
    tokens.map(({ content, color }) => {
      const name = readThemeKey(color);
      return name ? { text: content, color: name } : { text: content };
    })
  );
