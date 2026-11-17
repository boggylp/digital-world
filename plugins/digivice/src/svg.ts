import { formatNumber, FULL_TURN, MAX_LABEL_WIDTH, PERCENT, readCategories, shorten, type Chart } from './charts.ts';
import type { ChartType } from './blocks.ts';
import type { Size } from './image.ts';
import { pickSeriesColor, VIBES } from './palette.ts';

export const MAX_SVG_CHARS = 131_072;

type Drawing = { heightPx: number; parts: string[] };
type Box = { left: number; top: number; width: number; height: number };

const MAX_PICTURE_WIDTH_PX = 640;
const WIDTH_PX = 560;
const ROW_PX = 24;
const BAR_PX = 16;
const PLOT_PX = 160;
const GAP_PX = 8;
const CHAR_PX = 8;
const MAX_SLOT_PX = 72;
const BAR_SHARE = 0.7;
const SPARK_ROW_PX = 28;
const PIE_CENTER_PX = 90;
const PIE_RING_RADIUS_PX = 62;
const PIE_RING_PX = 36;
const PIE_LEGEND_PX = 200;
const PERCENT_PX = 40;
const LEGEND_PAD_PX = 28;
const BASELINE_PX = 16;
const DOT_RADIUS_PX = 3;
const TENTHS = 10;
const HALF = 0.5;
const FONT = 'font-family="ui-sans-serif, system-ui, sans-serif" font-size="13"';
const BOLD = ' font-weight="bold"';
const END = ' text-anchor="end"';
const MIDDLE = ' text-anchor="middle"';

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const XML_WHITESPACE = new Set(['\t', '\n', '\r']);
const FIRST_PRINTABLE = 0x20;

const isXmlCharacter = (character: string): boolean => (character.codePointAt(0) ?? 0) >= FIRST_PRINTABLE || XML_WHITESPACE.has(character);

export const escapeXml = (text: string): string =>
  [...text].filter(character => isXmlCharacter(character)).join('').replaceAll(/[&<>"]/gu, character => XML_ESCAPES[character] ?? character);

const round = (value: number): number => Math.round(value * TENTHS) / TENTHS;

const measureText = (texts: readonly string[]): number => Math.max(0, ...texts.map(text => text.length)) * CHAR_PX + GAP_PX;

const drawText = (left: number, baseline: number, content: string, attributes = ''): string =>
  `<text x="${round(left)}" y="${round(baseline)}" fill="${VIBES.slate}"${attributes}>${escapeXml(content)}</text>`;

const drawRect = (box: Box, color: string): string =>
  `<rect x="${round(box.left)}" y="${round(box.top)}" width="${round(box.width)}" height="${round(box.height)}" rx="3" fill="${color}"/>`;

const readMaximum = (values: readonly number[]): number => Math.max(...values.map(value => Math.abs(value)), Number.EPSILON);

const readPrefixSums = (values: readonly number[]): number[] => {
  const sums: number[] = [];
  let total = 0;
  for (const value of values) {
    sums.push(total);
    total += value;
  }
  return sums;
};

const drawHorizontalBars = (chart: Chart): Drawing => {
  const categories = readCategories(chart);
  const labels = categories.map(category => shorten(category.label, MAX_LABEL_WIDTH));
  const values = categories.map(category => formatNumber(category.value, chart.unit));
  const labelPx = measureText(labels);
  const room = WIDTH_PX - labelPx - measureText(values) - GAP_PX;
  const maximum = readMaximum(categories.map(category => category.value));
  const parts = categories.flatMap((category, index) => {
    const top = index * ROW_PX;
    const width = Math.max(1, (Math.abs(category.value) / maximum) * room);
    return [
      drawText(labelPx - GAP_PX, top + BASELINE_PX, labels[index] ?? '', END),
      drawRect({ left: labelPx, top: top + (ROW_PX - BAR_PX) * HALF, width, height: BAR_PX }, pickSeriesColor(index)),
      drawText(labelPx + width + GAP_PX, top + BASELINE_PX, values[index] ?? '', BOLD)
    ];
  });
  return { heightPx: categories.length * ROW_PX, parts };
};

const drawVerticalBars = (chart: Chart): Drawing => {
  const categories = readCategories(chart);
  const maximum = readMaximum(categories.map(category => category.value));
  const slot = Math.min(MAX_SLOT_PX, WIDTH_PX / categories.length);
  const slotChars = Math.max(1, Math.floor(slot / CHAR_PX));
  const barWidth = slot * BAR_SHARE;
  const parts = categories.flatMap((category, index) => {
    const height = Math.max(1, (Math.abs(category.value) / maximum) * PLOT_PX);
    const center = index * slot + slot * HALF;
    const top = ROW_PX + PLOT_PX - height;
    return [
      drawText(center, top - GAP_PX * HALF, shorten(formatNumber(category.value, chart.unit), slotChars), BOLD + MIDDLE),
      drawRect({ left: center - barWidth * HALF, top, width: barWidth, height }, pickSeriesColor(index)),
      drawText(center, ROW_PX + PLOT_PX + BASELINE_PX + GAP_PX * HALF, shorten(category.label, slotChars), MIDDLE)
    ];
  });
  return { heightPx: ROW_PX + PLOT_PX + ROW_PX, parts };
};

type LegendEntry = { name: string; left: number; row: number };

const placeLegend = (names: readonly string[]): LegendEntry[] => {
  const placed: LegendEntry[] = [];
  for (const name of names) {
    const previous = placed.at(-1);
    const next = previous === undefined ? 0 : previous.left + measureText([previous.name]) + LEGEND_PAD_PX;
    const fits = previous === undefined || next + measureText([name]) <= WIDTH_PX;
    placed.push({ name, left: fits ? next : 0, row: (previous?.row ?? 0) + (fits ? 0 : 1) });
  }
  return placed;
};

const drawLegend = (names: readonly string[], top: number): Drawing => {
  const entries = placeLegend(names.map(name => shorten(name, MAX_LABEL_WIDTH)));
  const parts = entries.flatMap((entry, index) => {
    const baseline = top + entry.row * ROW_PX + BASELINE_PX;
    return [
      `<circle cx="${entry.left + GAP_PX * HALF}" cy="${baseline - GAP_PX * HALF}" r="4" fill="${pickSeriesColor(index)}"/>`,
      drawText(entry.left + GAP_PX + GAP_PX * HALF, baseline, entry.name)
    ];
  });
  return { heightPx: ((entries.at(-1)?.row ?? 0) + 1) * ROW_PX, parts };
};

const drawPolyline = (values: readonly number[], range: readonly number[], box: Box, color: string): string => {
  const minimum = Math.min(...range);
  const maximum = Math.max(...range);
  const span = (value: number): number => (maximum === minimum ? HALF : (value - minimum) / (maximum - minimum));
  const points = values.map((value, index) => [
    round(box.left + (values.length === 1 ? 0 : (index / (values.length - 1)) * box.width)),
    round(box.top + box.height - span(value) * box.height)
  ]);
  const [only] = points;
  if (points.length === 1 && only) return `<circle cx="${only[0]}" cy="${only[1]}" r="${DOT_RADIUS_PX}" fill="${color}"/>`;
  return `<polyline points="${points.map(point => point.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
};

const drawLineChart = (chart: Chart): Drawing => {
  const all = chart.series.flatMap(series => series.values);
  const minimum = Math.min(...all);
  const maximum = Math.max(...all);
  const axis = [formatNumber(maximum, chart.unit), formatNumber(minimum, chart.unit)];
  const axisPx = measureText(axis);
  const plot = { left: axisPx, top: GAP_PX, width: WIDTH_PX - axisPx - GAP_PX, height: PLOT_PX };
  const lines = chart.series.map((series, index) => drawPolyline(series.values, all, plot, pickSeriesColor(index)));
  const frame = [
    `<path d="M${axisPx} ${GAP_PX}V${GAP_PX + PLOT_PX}H${WIDTH_PX - GAP_PX}" fill="none" stroke="${VIBES.mountain}"/>`,
    drawText(axisPx - GAP_PX, GAP_PX + GAP_PX, axis[0] ?? '', END),
    drawText(axisPx - GAP_PX, GAP_PX + PLOT_PX, axis[1] ?? '', END)
  ];
  const labelBaseline = GAP_PX + PLOT_PX + BASELINE_PX + GAP_PX * HALF;
  const [first] = chart.labels;
  const last = chart.labels.length > 1 ? chart.labels.at(-1) : undefined;
  const labels = [
    ...(first === undefined ? [] : [drawText(axisPx, labelBaseline, shorten(first, MAX_LABEL_WIDTH))]),
    ...(last === undefined ? [] : [drawText(WIDTH_PX - GAP_PX, labelBaseline, shorten(last, MAX_LABEL_WIDTH), END)])
  ];
  const legendTop = GAP_PX + PLOT_PX + (labels.length > 0 ? ROW_PX : GAP_PX);
  const legend = drawLegend(chart.series.map(series => series.name), legendTop);
  return { heightPx: legendTop + legend.heightPx, parts: [...frame, ...lines, ...labels, ...legend.parts] };
};

const drawSparks = (chart: Chart): Drawing => {
  const names = chart.series.map(series => shorten(series.name, MAX_LABEL_WIDTH));
  const lasts = chart.series.map(series => formatNumber(series.values.at(-1) ?? 0, chart.unit));
  const ranges = chart.series.map(series => `(${formatNumber(Math.min(...series.values), chart.unit)}–${formatNumber(Math.max(...series.values), chart.unit)})`);
  const labelPx = measureText(names);
  const lastPx = measureText(lasts);
  const sparkWidth = Math.max(GAP_PX, WIDTH_PX - labelPx - lastPx - measureText(ranges) - GAP_PX);
  const lastLeft = labelPx + sparkWidth + GAP_PX;
  const parts = chart.series.flatMap((series, index) => {
    const top = index * SPARK_ROW_PX;
    const baseline = top + BASELINE_PX + GAP_PX * HALF;
    return [
      drawText(labelPx - GAP_PX, baseline, names[index] ?? '', END),
      drawPolyline(series.values, series.values, { left: labelPx, top: top + GAP_PX * HALF, width: sparkWidth, height: SPARK_ROW_PX - GAP_PX }, pickSeriesColor(index)),
      drawText(lastLeft, baseline, lasts[index] ?? '', BOLD),
      drawText(lastLeft + lastPx, baseline, ranges[index] ?? '')
    ];
  });
  return { heightPx: chart.series.length * SPARK_ROW_PX, parts };
};

const drawPie = (chart: Chart): Drawing => {
  const categories = readCategories(chart);
  const total = categories.reduce((sum, category) => sum + category.value, 0) || 1;
  const circumference = FULL_TURN * PIE_RING_RADIUS_PX;
  const lengths = categories.map(category => (category.value / total) * circumference);
  const starts = readPrefixSums(lengths);
  const slices = lengths.map(
    (length, index) =>
      `<circle cx="${PIE_CENTER_PX}" cy="${PIE_CENTER_PX}" r="${PIE_RING_RADIUS_PX}" fill="none" stroke="${pickSeriesColor(index)}" stroke-width="${PIE_RING_PX}" stroke-dasharray="${round(length)} ${round(circumference)}" stroke-dashoffset="${round(-(starts[index] ?? 0))}" transform="rotate(-90 ${PIE_CENTER_PX} ${PIE_CENTER_PX})"/>`
  );
  const percentRight = PIE_LEGEND_PX + BAR_PX + PERCENT_PX;
  const labelChars = Math.floor((WIDTH_PX - percentRight - GAP_PX) / CHAR_PX);
  const legend = categories.flatMap((category, index) => {
    const top = index * ROW_PX;
    const swatch = BAR_PX - GAP_PX * HALF;
    return [
      drawRect({ left: PIE_LEGEND_PX, top: top + (ROW_PX - swatch) * HALF, width: swatch, height: swatch }, pickSeriesColor(index)),
      drawText(percentRight, top + BASELINE_PX, `${Math.round((category.value / total) * PERCENT)}%`, BOLD + END),
      drawText(percentRight + GAP_PX, top + BASELINE_PX, shorten(category.label, labelChars))
    ];
  });
  return { heightPx: Math.max(PIE_CENTER_PX + PIE_CENTER_PX, categories.length * ROW_PX), parts: [...slices, ...legend] };
};

const DRAWERS: Record<ChartType, (chart: Chart) => Drawing> = { bar: drawVerticalBars, hbar: drawHorizontalBars, line: drawLineChart, spark: drawSparks, pie: drawPie };

const wrapSvg = (widthPx: number, heightPx: number, body: string, attributes = ''): string | null => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${round(widthPx)}" height="${round(heightPx)}" viewBox="0 0 ${round(widthPx)} ${round(heightPx)}"${attributes}>${body}</svg>`;
  return svg.length <= MAX_SVG_CHARS ? svg : null;
};

export const renderChartSvg = (chart: Chart): string | null => {
  const body = DRAWERS[chart.type](chart);
  const titleHeight = chart.title ? ROW_PX : 0;
  const title = chart.title ? `<text x="0" y="${BASELINE_PX}" fill="${VIBES.slate}"${BOLD}><tspan fill="${VIBES.sun}">✦</tspan> ${escapeXml(chart.title)}</text>` : '';
  return wrapSvg(WIDTH_PX, titleHeight + body.heightPx, `${title}<g transform="translate(0 ${titleHeight})">${body.parts.join('')}</g>`, ` ${FONT}`);
};

export const createPictureSvg = (base64: string, size: Size): string | null => {
  const scale = Math.min(1, MAX_PICTURE_WIDTH_PX / size.width);
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  return wrapSvg(width, height, `<image href="data:image/png;base64,${base64}" width="${width}" height="${height}"/>`);
};
