import type { ChartLanguage } from '../../plugins/digivice/src/blocks.ts';
import { parseChart, type Chart } from '../../plugins/digivice/src/charts.ts';
import { createPictureSvg, escapeXml, MAX_SVG_CHARS, renderChartSvg } from '../../plugins/digivice/src/svg.ts';

const readChart = (language: ChartLanguage, source: string): Chart => {
  const chart = parseChart(language, source);
  if ('error' in chart) throw new Error(chart.error);
  return chart;
};

const readHeight = (svg: string | null): number => Number(/height="(?<px>\d+)"/u.exec(svg ?? '')?.groups?.px);

describe('escapeXml', () => {
  it('escapeXml_MarkupCharacters_ReturnsEntities', () => {
    expect(escapeXml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
  });

  it('escapeXml_ControlCharacter_DropsIt', () => {
    expect(escapeXml('a\u0007b')).toBe('ab');
  });
});

describe('renderChartSvg', () => {
  it('renderChartSvg_LabelWithMarkup_EscapesLabel', () => {
    expect(renderChartSvg(readChart('bar', '<b>: 1'))).toContain('&lt;b&gt;');
  });

  it('renderChartSvg_LongLabel_ShortensToSixteenCharacters', () => {
    expect(renderChartSvg(readChart('hbar', 'a very long category name: 1'))).toContain('>a very long cat…<');
  });

  it('renderChartSvg_Title_AddsTitleRow', () => {
    const plain = renderChartSvg(readChart('bar', 'a: 1'));
    const titled = renderChartSvg(readChart('bar', 'title: Partners\na: 1'));

    expect(titled).toContain('</tspan> Partners</text>');
    expect(readHeight(titled) - readHeight(plain)).toBe(24);
  });

  it('renderChartSvg_PieOfTwo_DrawsTwoRingSlices', () => {
    expect(renderChartSvg(readChart('pie', 'a: 1\nb: 3'))?.match(/stroke-dasharray/gu)).toHaveLength(2);
  });

  it('renderChartSvg_SinglePointLine_DrawsDot', () => {
    expect(renderChartSvg(readChart('line', 'a: 5'))).toMatch(/<circle cx="[\d.]+" cy="[\d.]+" r="3"/u);
  });

  it('renderChartSvg_ManyLongSeriesNames_WrapsLegend', () => {
    const names = Array.from({ length: 8 }, (_name, index) => `series number ${index}: 1, 2`).join('\n');
    const oneRow = renderChartSvg(readChart('line', 'a: 1, 2'));
    const wrapped = renderChartSvg(readChart('line', names));

    expect(readHeight(wrapped) - readHeight(oneRow)).toBe(48);
  });

  it('renderChartSvg_EmojiAtCut_KeepsWholeCharacter', () => {
    const label = 'a'.repeat(14);
    const chart = readChart('hbar', `${label}😀bcd: 1`);

    expect(renderChartSvg(chart)).toContain(`>${label}😀…<`);
  });

  it('renderChartSvg_LongBarLabel_ShortensToSlot', () => {
    expect(renderChartSvg(readChart('bar', 'a very long category name: 1'))).toContain('>a very l…<');
  });

  it('renderChartSvg_OverSourceLimit_ReturnsNull', () => {
    const rows = Array.from({ length: 2000 }, (_row, index) => `row ${index}: ${index + 1}`).join('\n');

    expect(renderChartSvg(readChart('hbar', rows))).toBeNull();
  });
});

describe('createPictureSvg', () => {
  it('createPictureSvg_WidePicture_ScalesToMaxWidth', () => {
    expect(createPictureSvg('AAAA', { width: 1280, height: 400 })).toContain('width="640" height="200"');
  });

  it('createPictureSvg_OverSourceLimit_ReturnsNull', () => {
    expect(createPictureSvg('A'.repeat(MAX_SVG_CHARS), { width: 10, height: 10 })).toBeNull();
  });
});
