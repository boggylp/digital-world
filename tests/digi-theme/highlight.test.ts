import { highlightLines, isHighlightable } from '../../plugins/digi-theme/src/highlight.ts';

const colorOf = (lines: ReturnType<typeof highlightLines>, text: string): string | undefined =>
  lines.flat().find(run => run.text.includes(text))?.color;

describe('highlightLines', () => {
  it('highlightLines_Toml_ColorsKeysAndStrings', () => {
    const lines = highlightLines('"Microsoft.DotNet.SDK.11" = { scope = "machine" }', 'toml');

    expect(colorOf(lines, 'Microsoft.DotNet.SDK.11')).toBe('red');
    expect(colorOf(lines, '"machine"')).toBe('green');
  });

  it('highlightLines_Yaml_ColorsKeys', () => {
    const lines = highlightLines('apps:\n  dotnet: { id: x }', 'yaml');

    expect(colorOf(lines, 'apps')).toBe('red');
    expect(lines).toHaveLength(2);
  });

  it('highlightLines_TypeScript_ColorsKeywordsNumbersAndStrings', () => {
    const lines = highlightLines('const answer = await compute(3, "label");', 'ts');

    expect(colorOf(lines, 'const')).toBe('magenta');
    expect(colorOf(lines, '3')).toBe('yellow');
    expect(colorOf(lines, '"label"')).toBe('green');
  });

  it('highlightLines_EscapedMarkup_KeepsSourceText', () => {
    const source = 'if (a < b && c > "d") { x = \'y\'; }';

    const lines = highlightLines(source, 'js');

    expect(lines.flat().map(run => run.text).join('')).toBe(source);
  });

  it('highlightLines_BlankLines_KeepsEveryLine', () => {
    expect(highlightLines('a = 1\n\nb = 2', 'python')).toHaveLength(3);
  });

  it('isHighlightable_KnownAndUnknownLanguages_AnswersEach', () => {
    expect([isHighlightable('powershell'), isHighlightable('dockerfile'), isHighlightable('nu'), isHighlightable('')]).toStrictEqual([
      true,
      true,
      false,
      false
    ]);
  });
});
