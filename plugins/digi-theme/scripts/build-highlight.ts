import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from 'esbuild';
import plist from 'plist';

const languages = [
  'bash', 'c', 'cpp', 'csharp', 'css', 'diff', 'docker', 'go', 'graphql', 'html', 'ini', 'java', 'javascript', 'json', 'jsonc',
  'jsx', 'kotlin', 'less', 'lua', 'make', 'markdown', 'nushell', 'objective-c', 'perl', 'php', 'powershell', 'python', 'r', 'ruby',
  'rust', 'scss', 'shellscript', 'sql', 'swift', 'toml', 'tsx', 'typescript', 'vb', 'wasm', 'xml', 'yaml'
];

const tmTheme = plist.parse(await readFile(new URL('../assets/bat-ansi.tmTheme', import.meta.url), 'utf8')) as {
  settings: object[];
};
const theme = { name: 'ansi', type: 'dark', colors: {}, tokenColors: tmTheme.settings };

const scratch = await mkdtemp(join(tmpdir(), 'digi-theme-highlight-'));
const entry = join(scratch, 'highlighter.js');
await writeFile(
  entry,
  [
    "import { createHighlighterCoreSync } from 'shiki/core';",
    "import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';",
    ...languages.map((name, index) => `import language${index} from 'shiki/langs/${name}.mjs';`),
    'const highlighter = createHighlighterCoreSync({',
    `  themes: [${JSON.stringify(theme)}],`,
    `  langs: [${languages.map((_name, index) => `language${index}`).join(', ')}],`,
    '  engine: createJavaScriptRegexEngine()',
    '});',
    'export const languages = new Set(highlighter.getLoadedLanguages());',
    "export const tokenize = (code, lang) => highlighter.codeToTokensBase(code, { lang, theme: 'ansi' });"
  ].join('\n')
);

await rm('src/highlight.generated', { recursive: true, force: true });
try {
  await build({
    entryPoints: [
      { in: entry, out: 'highlighter' },
      ...languages.map(name => ({ in: `shiki/langs/${name}.mjs`, out: `lang-${name}` }))
    ],
    nodePaths: [join(import.meta.dirname, '..', '..', '..', 'node_modules')],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    legalComments: 'inline',
    splitting: true,
    outdir: 'src/highlight.generated',
    chunkNames: 'chunk-[hash]'
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
await writeFile('src/highlight.generated.js', "export { languages, tokenize } from './highlight.generated/highlighter.js';\n");
