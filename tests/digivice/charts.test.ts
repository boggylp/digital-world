import { formatNumber, parseChart, renderChart, type Chart } from '../../plugins/digivice/src/charts.ts';
import { readText } from './read-text.ts';

const VERTICAL_BARS = [
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
];

const RISING_LINE = [
  '10 ┤⠀⠀⠀⠀⠀⠀⠀⡜',
  '   │⠀⠀⠀⠀⠀⠀⡜⠀',
  '   │⠀⠀⠀⠀⠀⡜⠀⠀',
  '   │⠀⠀⠀⠀⡜⠀⠀⠀',
  '   │⠀⠀⠀⡜⠀⠀⠀⠀',
  '   │⠀⠀⡜⠀⠀⠀⠀⠀',
  '   │⠀⡜⠀⠀⠀⠀⠀⠀',
  ' 0 ┤⡜⠀⠀⠀⠀⠀⠀⠀',
  '● load   '
];

const PIE = [
  '⠀⠀⠀⣠⣴⣶⣿⣿⣿⣿⣶⣦⣄⠀⠀⠀  ■ a 75%',
  '⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀  ■ b 25%',
  '⢰⣿⣿⣿⣿⠟⠋⠉⠉⠙⠻⣿⣿⣿⣿⡆',
  '⣿⣿⣿⣿⡏⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿',
  '⠸⣿⣿⣿⣿⣦⣄⣀⣀⣠⣴⣿⣿⣿⣿⠇',
  '⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀',
  '⠀⠀⠀⠙⠻⠿⣿⣿⣿⣿⠿⠟⠋⠀⠀⠀'
];

const parseValid = (language: Parameters<typeof parseChart>[0], source: string): Chart => {
  const chart = parseChart(language, source);
  if ('error' in chart) throw new Error(chart.error);
  return chart;
};

const drawChart = (language: Parameters<typeof parseChart>[0], source: string, columns: number): string[] =>
  readText(renderChart(parseValid(language, source), columns));

describe('parseChart', () => {
  it('parseChart_ChartFenceWithType_ReadsSettingsAndSeries', () => {
    expect(parseChart('chart', 'type: line\ntitle: T\nx: a, b\ncpu: 1, 2\nunit: %')).toStrictEqual({
      type: 'line',
      title: 'T',
      unit: '%',
      labels: ['a', 'b'],
      series: [{ name: 'cpu', values: [1, 2] }]
    });
  });

  it('parseChart_UnknownType_ReturnsError', () => {
    expect(parseChart('chart', 'type: radar\na: 1')).toStrictEqual({ error: 'unknown chart type "radar"' });
  });

  it('parseChart_ThousandsSeparator_ReadsOneNumber', () => {
    expect(parseChart('bar', 'Revenue: 1,200')).toStrictEqual({ type: 'bar', unit: '', labels: [], series: [{ name: 'Revenue', values: [1200] }] });
  });

  it('parseChart_PieWithNegative_ReturnsError', () => {
    expect(parseChart('pie', 'a: 3\nb: -1')).toStrictEqual({ error: 'pie needs positive values' });
  });

  it('parseChart_NoNumbers_ReturnsError', () => {
    expect(parseChart('bar', 'just words')).toStrictEqual({ error: 'no "name: number" rows' });
  });
});

describe('renderChart', () => {
  it('renderChart_HorizontalBars_ScalesToLongestBar', () => {
    expect(drawChart('hbar', 'a: 4\nbb: 2', 12)).toStrictEqual(['a  ██████ 4', 'bb ███    2']);
  });

  it('renderChart_VerticalBars_DrawsRowsValuesAndLabels', () => {
    expect(drawChart('bar', 'a: 8\nb: 4', 8)).toStrictEqual(VERTICAL_BARS);
  });

  it('renderChart_VerticalBarsTooNarrow_FallsBackToHorizontal', () => {
    expect(drawChart('bar', 'a: 1\nb: 1\nc: 1', 6)).toStrictEqual(['a ████ 1', 'b ████ 1', 'c ████ 1']);
  });

  it('renderChart_Spark_DrawsOneLinePerSeries', () => {
    expect(drawChart('spark', 'load: 1, 5, 9', 40)).toStrictEqual(['load ▁▅█ 9 (1–9)']);
  });

  it('renderChart_RisingLine_DrawsDiagonalBetweenAxisLabels', () => {
    expect(drawChart('line', 'load: 0, 10', 12)).toStrictEqual(RISING_LINE);
  });

  it('renderChart_Pie_ListsSharesBesideTheDisc', () => {
    expect(drawChart('pie', 'a: 3\nb: 1', 40)).toStrictEqual(PIE);
  });

  it('renderChart_Title_DrawsTitleFirst', () => {
    expect(drawChart('spark', 'title: Load\nload: 1, 2', 40)[0]).toBe('✦ Load');
  });
});

describe('formatNumber', () => {
  it.each([
    [1234.5, '', '1,235'],
    [4.56789, '%', '4.57%'],
    [-2, 'ms', '-2ms']
  ])('formatNumber_%d_RoundsAndAddsUnit', (value, unit, expected) => {
    expect(formatNumber(value, unit)).toBe(expected);
  });
});
