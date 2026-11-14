import { describe, expect, test } from 'vitest';

import { formatNumber, parseChart, renderChart, type Chart, type Line } from '../src/charts.ts';

function readText(lines: readonly Line[]): string[] {
  return lines.map(line => line.map(run => run.text).join(''));
}

function parseValid(language: Parameters<typeof parseChart>[0], source: string): Chart {
  const chart = parseChart(language, source);
  if ('error' in chart) throw new Error(chart.error);
  return chart;
}

describe('charts', () => {
  test('parseChart_ChartFenceWithType_ReadsSettingsAndSeries', () => {
    expect(parseChart('chart', 'type: line\ntitle: T\nx: a, b\ncpu: 1, 2\nunit: %')).toEqual({
      type: 'line',
      title: 'T',
      unit: '%',
      labels: ['a', 'b'],
      series: [{ name: 'cpu', values: [1, 2] }]
    });
  });

  test('parseChart_UnknownType_ReturnsError', () => {
    expect(parseChart('chart', 'type: radar\na: 1')).toEqual({ error: 'unknown chart type "radar"' });
  });

  test('parseChart_ThousandsSeparator_ReadsOneNumber', () => {
    expect(parseChart('bar', 'Revenue: 1,200')).toEqual({ type: 'bar', unit: '', labels: [], series: [{ name: 'Revenue', values: [1200] }] });
  });

  test('parseChart_PieWithNegative_ReturnsError', () => {
    expect(parseChart('pie', 'a: 3\nb: -1')).toEqual({ error: 'pie needs positive values' });
  });

  test('parseChart_NoNumbers_ReturnsError', () => {
    expect(parseChart('bar', 'just words')).toEqual({ error: 'no "name: number" rows' });
  });

  test('renderChart_HorizontalBars_ScalesToLongestBar', () => {
    expect(readText(renderChart(parseValid('hbar', 'a: 4\nbb: 2'), 12))).toEqual(['a  ██████ 4', 'bb ███    2']);
  });

  test('renderChart_VerticalBars_DrawsRowsValuesAndLabels', () => {
    expect(readText(renderChart(parseValid('bar', 'a: 8\nb: 4'), 8))).toEqual([
      '███     ',
      '███     ',
      '███     ',
      '███     ',
      '███ ███ ',
      '███ ███ ',
      '███ ███ ',
      '███ ███ ',
      '8   4   ',
      'a   b   '
    ]);
  });

  test('renderChart_VerticalBarsTooNarrow_FallsBackToHorizontal', () => {
    expect(readText(renderChart(parseValid('bar', 'a: 1\nb: 1\nc: 1'), 6))).toEqual(['a ████ 1', 'b ████ 1', 'c ████ 1']);
  });

  test('renderChart_Spark_DrawsOneLinePerSeries', () => {
    expect(readText(renderChart(parseValid('spark', 'load: 1, 5, 9'), 40))).toEqual(['load ▁▅█ 9 (1–9)']);
  });

  test('renderChart_RisingLine_DrawsDiagonalBetweenAxisLabels', () => {
    expect(readText(renderChart(parseValid('line', 'load: 0, 10'), 12))).toEqual([
      '10 ┤⠀⠀⠀⠀⠀⠀⠀⡜',
      '   │⠀⠀⠀⠀⠀⠀⡜⠀',
      '   │⠀⠀⠀⠀⠀⡜⠀⠀',
      '   │⠀⠀⠀⠀⡜⠀⠀⠀',
      '   │⠀⠀⠀⡜⠀⠀⠀⠀',
      '   │⠀⠀⡜⠀⠀⠀⠀⠀',
      '   │⠀⡜⠀⠀⠀⠀⠀⠀',
      ' 0 ┤⡜⠀⠀⠀⠀⠀⠀⠀',
      '● load   '
    ]);
  });

  test('renderChart_Pie_ListsSharesBesideTheDisc', () => {
    expect(readText(renderChart(parseValid('pie', 'a: 3\nb: 1'), 40))).toEqual([
      '⠀⠀⠀⣠⣴⣶⣿⣿⣿⣿⣶⣦⣄⠀⠀⠀  ■ a 75%',
      '⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀  ■ b 25%',
      '⢰⣿⣿⣿⣿⠟⠋⠉⠉⠙⠻⣿⣿⣿⣿⡆',
      '⣿⣿⣿⣿⡏⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿',
      '⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿',
      '⠸⣿⣿⣿⣿⣦⣄⣀⣀⣠⣴⣿⣿⣿⣿⠇',
      '⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀',
      '⠀⠀⠀⠙⠻⠿⣿⣿⣿⣿⠿⠟⠋⠀⠀⠀'
    ]);
  });

  test('renderChart_Title_DrawsTitleFirst', () => {
    expect(readText(renderChart(parseValid('spark', 'title: Load\nload: 1, 2'), 40))[0]).toBe('✦ Load');
  });

  test.each([
    [1234.5, '', '1,235'],
    [3.14159, '%', '3.14%'],
    [-2, 'ms', '-2ms']
  ])('formatNumber_%d_RoundsAndAddsUnit', (value, unit, expected) => {
    expect(formatNumber(value, unit)).toBe(expected);
  });
});
