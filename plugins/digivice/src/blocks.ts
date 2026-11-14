export const CHART_TYPES = ['bar', 'hbar', 'line', 'spark', 'pie'] as const;
export type ChartType = (typeof CHART_TYPES)[number];
export const CHART_LANGUAGES = ['chart', ...CHART_TYPES] as const;

export type ChartLanguage = (typeof CHART_LANGUAGES)[number];

export type Block =
  | { kind: 'markdown'; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; language: string; source: string }
  | { kind: 'chart'; language: ChartLanguage; source: string }
  | { kind: 'flow'; dialect: 'flow' | 'mermaid'; source: string }
  | { kind: 'image'; alt: string; source: string };

type Found = { block: Block; end: number };

const FENCE = /^ {0,3}(?<marker>`{3,}|~{3,})\s*(?<language>[\w+#.-]*)/u;
const HEADING = /^ {0,3}(?<marks>#{1,6})\s+(?<text>.+?)(?:\s+#+)?\s*$/u;
const IMAGE_LINE = /^\s*!\[(?<alt>[^\]]*)\]\(<?(?<source>[^)\s>]+)>?(?:\s+"[^"]*")?\)\s*$/u;
const MERMAID_FLOWCHART = /^\s*(?:graph|flowchart)\b/u;

const isChartLanguage = (language: string): language is ChartLanguage => (CHART_LANGUAGES as readonly string[]).includes(language);

const createFencedBlock = (language: string, source: string): Block => {
  const lower = language.toLowerCase();
  if (isChartLanguage(lower)) return { kind: 'chart', language: lower, source };
  if (lower === 'flow') return { kind: 'flow', dialect: 'flow', source };
  if (lower === 'mermaid' && MERMAID_FLOWCHART.test(source)) {
    return { kind: 'flow', dialect: 'mermaid', source };
  }
  return { kind: 'code', language, source };
};

const findFenceEnd = (lines: readonly string[], start: number, fence: string): number => {
  const closing = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`, 'u');
  const end = lines.findIndex((line, index) => index > start && closing.test(line));
  return end === -1 ? lines.length : end;
};

const findBlock = (lines: readonly string[], index: number): Found | undefined => {
  const line = lines[index] ?? '';
  const fence = FENCE.exec(line)?.groups;
  if (fence?.marker) {
    const end = findFenceEnd(lines, index, fence.marker);
    return { block: createFencedBlock(fence.language ?? '', lines.slice(index + 1, end).join('\n')), end };
  }
  const heading = HEADING.exec(line)?.groups;
  if (heading?.marks && heading.text) return { block: { kind: 'heading', level: heading.marks.length, text: heading.text }, end: index };
  const image = IMAGE_LINE.exec(line)?.groups;
  if (image?.source) return { block: { kind: 'image', alt: image.alt ?? '', source: image.source }, end: index };
  return undefined;
};

export const splitBlocks = (text: string): Block[] => {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let prose: string[] = [];
  const flushProse = () => {
    const joined = prose.join('\n').trim();
    if (joined) blocks.push({ kind: 'markdown', text: joined });
    prose = [];
  };
  for (let index = 0; index < lines.length; index++) {
    const found = findBlock(lines, index);
    if (found) {
      flushProse();
      blocks.push(found.block);
      index = found.end;
    } else {
      prose.push(lines[index] ?? '');
    }
  }
  flushProse();
  return blocks;
};

export const isPlainProse = (blocks: readonly Block[]): boolean => blocks.every(block => block.kind === 'markdown');
