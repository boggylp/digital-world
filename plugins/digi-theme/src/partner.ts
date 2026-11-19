import { STAGES, type Line, type Stage } from './roster.ts';

export const QUESTION_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);
export const REFUSED =
  /The user doesn't want to (?:proceed with this tool use|take this action)|\[Request interrupted by user/u;

export type Thresholds = {
  babyII: number;
  rookie: number;
  champion: number;
  ultimate: number;
  mega: number;
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  babyII: 5,
  rookie: 10,
  champion: 30,
  ultimate: 50,
  mega: 70
};

const listThresholds = (thresholds: Thresholds): readonly [Stage, number][] => [
  ['Mega', thresholds.mega],
  ['Ultimate', thresholds.ultimate],
  ['Champion', thresholds.champion],
  ['Rookie', thresholds.rookie],
  ['Baby II', thresholds.babyII],
  ['Baby I', 0]
];

const isAscending = (thresholds: Thresholds): boolean =>
  listThresholds(thresholds).every(
    ([, threshold], index, list) => index === 0 || threshold < (list[index - 1]?.[1] ?? Infinity)
  );

const MIN_PERCENT = 1;
const MAX_PERCENT = 100;

const OPTION_KEYS: Record<keyof Thresholds, string> = {
  babyII: 'baby_ii_percent',
  rookie: 'rookie_percent',
  champion: 'champion_percent',
  ultimate: 'ultimate_percent',
  mega: 'mega_percent'
};

export const readThresholds = (options: Readonly<Record<string, unknown>>): Thresholds | null => {
  const read = (key: keyof Thresholds): number => {
    const value = options[OPTION_KEYS[key]];
    if (value === undefined) return DEFAULT_THRESHOLDS[key];
    return typeof value === 'number' && value >= MIN_PERCENT && value <= MAX_PERCENT ? value : Number.NaN;
  };
  const thresholds = {
    babyII: read('babyII'),
    rookie: read('rookie'),
    champion: read('champion'),
    ultimate: read('ultimate'),
    mega: read('mega')
  };
  return isAscending(thresholds) ? thresholds : null;
};

export type Reaction = 'happy' | 'angry' | 'hurt';

export type Partner = {
  line: Line;
  stage: Stage;
  reaction: Reaction | null;
  reactionUntilTick: number;
  isCalling: boolean;
};

export const REACTION_TICKS = 6;

export const createPartner = (line: Line): Partner => ({
  line,
  stage: 'Digitama',
  reaction: null,
  reactionUntilTick: 0,
  isCalling: false
});

export const findStageForPercent = (percent: number, thresholds: Thresholds): Stage =>
  listThresholds(thresholds).find(([, threshold]) => percent >= threshold)?.[0] ?? 'Baby I';

export const measurePartner = (partner: Partner, percent: number, thresholds: Thresholds): Partner => {
  if (partner.stage === 'Digitama') return partner;
  const measured = findStageForPercent(percent, thresholds);
  const rookie = STAGES.indexOf('Rookie');
  const isGrown = STAGES.indexOf(partner.stage) >= rookie;
  const stage = isGrown && STAGES.indexOf(measured) < rookie ? 'Rookie' : measured;
  return { ...partner, stage };
};

export const hatchPartner = (partner: Partner, percent: number, thresholds: Thresholds): Partner => {
  if (partner.stage !== 'Digitama') return { ...partner, isCalling: false };
  return measurePartner({ ...partner, stage: 'Baby I', isCalling: false }, percent, thresholds);
};

export const reactPartner = (partner: Partner, reaction: Reaction, tick: number): Partner => {
  if (partner.stage === 'Digitama') return partner;
  return { ...partner, reaction, reactionUntilTick: tick + REACTION_TICKS };
};

export const callPartner = (partner: Partner, isCalling: boolean): Partner => ({
  ...partner,
  isCalling
});

const DUB_NAMES: Record<string, string> = {
  Piyomon: 'Biyomon',
  Hououmon: 'Phoenixmon',
  Plotmon: 'Salamon',
  Tailmon: 'Gatomon',
  'V-mon': 'Veemon',
  'XV-mon': 'ExVeemon',
  Imperialdramon_Fighter: 'Imperialdramon'
};

export const nameForm = (partner: Partner): string => {
  if (partner.stage === 'Digitama') return 'Digitama';
  const sprite = partner.line.forms[partner.stage];
  return DUB_NAMES[sprite] ?? sprite;
};
