import type { Line } from '../../plugins/digi-theme/src/charts.ts';

export const readText = (lines: readonly Line[]): string[] => lines.map(line => line.map(run => run.text).join(''));
