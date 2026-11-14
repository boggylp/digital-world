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

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/;
const HEADING = /^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/;
const IMAGE_LINE = /^\s*!\[([^\]]*)\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)\s*$/;
const MERMAID_FLOWCHART = /^\s*(graph|flowchart)\b/;

function isChartLanguage(language: string): language is ChartLanguage {
  return (CHART_LANGUAGES as readonly string[]).includes(language);
}

function createFencedBlock(language: string, source: string): Block {
  const lower = language.toLowerCase();
  if (isChartLanguage(lower)) return { kind: 'chart', language: lower, source };
  if (lower === 'flow') return { kind: 'flow', dialect: 'flow', source };
  if (lower === 'mermaid' && MERMAID_FLOWCHART.test(source)) {
    return { kind: 'flow', dialect: 'mermaid', source };
  }
  return { kind: 'code', language, source };
}

function findFenceEnd(lines: readonly string[], start: number, fence: string): number {
  const closing = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`);
  const end = lines.findIndex((line, index) => index > start && closing.test(line));
  return end === -1 ? lines.length : end;
}

export function splitBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let prose: string[] = [];
  const flushProse = () => {
    const joined = prose.join('\n').trim();
    if (joined) blocks.push({ kind: 'markdown', text: joined });
    prose = [];
  };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const fence = FENCE.exec(line);
    if (fence?.[1]) {
      flushProse();
      const end = findFenceEnd(lines, index, fence[1]);
      blocks.push(createFencedBlock(fence[2] ?? '', lines.slice(index + 1, end).join('\n')));
      index = end;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading?.[1] && heading[2]) {
      flushProse();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }
    const image = IMAGE_LINE.exec(line);
    if (image?.[2]) {
      flushProse();
      blocks.push({ kind: 'image', alt: image[1] ?? '', source: image[2] });
      continue;
    }
    prose.push(line);
  }
  flushProse();
  return blocks;
}

export function isPlainProse(blocks: readonly Block[]): boolean {
  return blocks.every(block => block.kind === 'markdown');
}
