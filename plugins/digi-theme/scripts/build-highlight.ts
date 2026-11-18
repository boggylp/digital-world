import { build } from 'esbuild';

const extraLanguages = ['powershell', 'dockerfile'];

await build({
  stdin: {
    contents: [
      "import hljs from 'highlight.js/lib/common';",
      ...extraLanguages.map((name, index) => `import language${index} from 'highlight.js/lib/languages/${name}';`),
      ...extraLanguages.map((name, index) => `hljs.registerLanguage('${name}', language${index});`),
      'export default hljs;'
    ].join('\n'),
    resolveDir: import.meta.dirname,
    loader: 'js'
  },
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'neutral',
  legalComments: 'inline',
  outfile: 'src/highlight.generated.js'
});
