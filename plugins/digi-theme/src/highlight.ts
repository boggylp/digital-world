import type { Line, Run } from './charts.ts';
import hljs from './highlight.generated.js';

const SCOPE_COLORS: Readonly<Record<string, string>> = {
  keyword: 'magenta',
  'meta.keyword': 'magenta',
  'selector-tag': 'magenta',
  string: 'green',
  regexp: 'green',
  addition: 'green',
  'meta.string': 'green',
  number: 'yellow',
  literal: 'yellow',
  symbol: 'yellow',
  bullet: 'yellow',
  type: 'cyan',
  built_in: 'cyan',
  'title.class': 'cyan',
  title: 'blue',
  section: 'blue',
  name: 'blue',
  attr: 'red',
  attribute: 'red',
  property: 'red',
  tag: 'red',
  deletion: 'red',
  variable: 'red',
  'template-variable': 'red',
  'selector-class': 'yellow',
  'selector-id': 'blue',
  comment: 'gray',
  doctag: 'gray',
  meta: 'gray',
  quote: 'gray'
};

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'" };

const decode = (text: string): string =>
  text.replaceAll(/&(?<name>amp|lt|gt|quot|#x27);/gu, (_entity, name: string) => ENTITIES[name] ?? '');

const toScope = (classes: string): string => {
  const [first = '', ...rest] = classes.split(' ');
  return [first.replace(/^hljs-/u, ''), ...rest.map(part => part.replace(/_+$/u, ''))].join('.');
};

const findColor = (scope: string | undefined): string | undefined => {
  for (let name = scope; name; name = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : undefined) {
    const color = SCOPE_COLORS[name];
    if (color) return color;
  }
  return undefined;
};

const pushText = (lines: Run[][], text: string, color: string | undefined): void => {
  text.split('\n').forEach((part, index) => {
    if (index > 0) lines.push([]);
    if (part) lines.at(-1)?.push(color ? { text: part, color } : { text: part });
  });
};

export const isHighlightable = (language: string): boolean => language !== '' && hljs.getLanguage(language) !== undefined;

export const highlightLines = (source: string, language: string): Line[] => {
  const html = hljs.highlight(source, { language, ignoreIllegals: true }).value;
  const lines: Run[][] = [[]];
  const colors: (string | undefined)[] = [];
  for (const { groups } of html.matchAll(/<span class="(?<open>[^"]+)">|(?<close><\/span>)|(?<text>[^<]+)/gu)) {
    const { open, close, text } = groups ?? {};
    if (open !== undefined) colors.push(findColor(toScope(open)) ?? colors.at(-1));
    else if (close !== undefined) colors.pop();
    else if (text !== undefined) pushText(lines, decode(text), colors.at(-1));
  }
  return lines;
};
