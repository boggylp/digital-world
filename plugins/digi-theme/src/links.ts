import { expandHome, toSlashes } from './paths.ts';

const PROTECTED = /^(?: {4}|\t).*$|(?<ticks>`+)[\s\S]*?\k<ticks>|!?\[[^\]]*\]\([^)]*\)|<[^>\s]+>|https?:\/\/\S+/gmu;
const PATH =
  /(?<![\w.~/\\:])(?<path>(?:[A-Za-z]:[\\/]|~[\\/]|\/(?=[\w.-]+\/))[^\s`'"<>|*?()[\]{}:]*[^\s`'"<>|*?()[\]{},.;:!])(?<position>:\d+(?::\d+)?)?/gu;

export const createFileHref = (path: string, home: string): string => {
  const slashed = toSlashes(expandHome(path, home));
  return `file://${slashed.startsWith('/') ? '' : '/'}${encodeURI(slashed)}`;
};

const linkifyPlain = (text: string, home: string): string =>
  text.replace(PATH, (match, path: string) => {
    const isHomePath = path.startsWith('~');
    if (isHomePath && !home) return match;
    return `[${match}](${createFileHref(path, home)})`;
  });

export const linkifyPaths = (markdown: string, home: string): string => {
  let result = '';
  let last = 0;
  for (const kept of markdown.matchAll(PROTECTED)) {
    result += linkifyPlain(markdown.slice(last, kept.index), home) + kept[0];
    last = kept.index + kept[0].length;
  }
  return result + linkifyPlain(markdown.slice(last), home);
};
