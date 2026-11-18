import { highlightLines, isHighlightable } from '../../plugins/digi-theme/src/highlight.ts';

const colorOf = (lines: ReturnType<typeof highlightLines>, text: string): string | undefined =>
  lines.flat().find(run => run.text === text)?.color;

describe('highlightLines', () => {
  it('highlightLines_TypeScript_ColorsKeywordsNumbersStringsAndFunctions', () => {
    const lines = highlightLines('const answer: number = await compute({ retries: 3 }, "label");', 'ts');

    expect([colorOf(lines, 'const'), colorOf(lines, '3'), colorOf(lines, '"label"'), colorOf(lines, 'compute')]).toStrictEqual([
      'ansi:magenta',
      'ansi:yellow',
      'ansi:green',
      'ansi:blue'
    ]);
  });

  it('highlightLines_TypeScriptDeclarationAndParameter_KeepsVariablePlainAndColorsParameter', () => {
    const lines = highlightLines('const answer: number = 1;\nfunction load(id: string) {}', 'ts');

    expect([colorOf(lines, ' answer'), colorOf(lines, 'id')]).toStrictEqual([undefined, 'ansi:cyan']);
  });

  it('highlightLines_Yaml_ColorsKeysAndValues', () => {
    const lines = highlightLines('apps:\n  dotnet: { scope: machine }', 'yaml');

    expect([colorOf(lines, 'apps'), colorOf(lines, 'scope'), colorOf(lines, 'machine')]).toStrictEqual(['ansi:red', 'ansi:red', 'ansi:green']);
  });

  it('highlightLines_TomlInlineTable_TreatsQuotedAndBareKeysAlike', () => {
    const lines = highlightLines('"quoted.key" = { scope = "machine" }', 'toml');

    expect([colorOf(lines, '"quoted.key" = { scope = '), colorOf(lines, '"machine"')]).toStrictEqual([undefined, 'ansi:green']);
  });

  it('highlightLines_Markup_KeepsSourceText', () => {
    const source = 'if (a < b && c > "d") { x = \'y\'; }';

    expect(highlightLines(source, 'js').flat().map(run => run.text).join('')).toBe(source);
  });

  it('highlightLines_BlankLines_KeepsEveryLine', () => {
    expect(highlightLines('a = 1\n\nb = 2', 'python')).toHaveLength(3);
  });

  it('isHighlightable_KnownAndUnknownLanguages_AnswersEach', () => {
    expect(['ps1', 'dockerfile', 'nu', 'TOML', 'brainfuck', ''].map(language => isHighlightable(language))).toStrictEqual([true, true, true, true, false, false]);
  });
});
