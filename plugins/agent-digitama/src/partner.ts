import { STAGES, type Line, type Stage } from './roster.ts';
import { FRAMES } from './sprite.ts';

const MEGA_PERCENT = 80;
const ULTIMATE_PERCENT = 55;
const CHAMPION_PERCENT = 30;
const ROOKIE_PERCENT = 10;
const BABY_II_PERCENT = 5;

export const THRESHOLDS: readonly [Stage, number][] = [
  ['Mega', MEGA_PERCENT],
  ['Ultimate', ULTIMATE_PERCENT],
  ['Champion', CHAMPION_PERCENT],
  ['Rookie', ROOKIE_PERCENT],
  ['Baby II', BABY_II_PERCENT],
  ['Baby I', 0]
];

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

export const findStageForPercent = (percent: number): Stage =>
  THRESHOLDS.find(([, threshold]) => percent >= threshold)?.[0] ?? 'Baby I';

export const measurePartner = (partner: Partner, percent: number): Partner => {
  if (partner.stage === 'Digitama') return partner;
  const measured = findStageForPercent(percent);
  const rookie = STAGES.indexOf('Rookie');
  const isGrown = STAGES.indexOf(partner.stage) >= rookie;
  const stage = isGrown && STAGES.indexOf(measured) < rookie ? 'Rookie' : measured;
  return { ...partner, stage };
};

export const hatchPartner = (partner: Partner, percent: number): Partner => {
  if (partner.stage !== 'Digitama') return { ...partner, isCalling: false };
  return measurePartner({ ...partner, stage: 'Baby I', isCalling: false }, percent);
};

export const reactPartner = (partner: Partner, reaction: Reaction, tick: number): Partner => {
  if (partner.stage === 'Digitama') return partner;
  return { ...partner, reaction, reactionUntilTick: tick + REACTION_TICKS };
};

export const callPartner = (partner: Partner, isCalling: boolean): Partner => ({
  ...partner,
  isCalling
});

const cycleFrames = (frames: readonly number[], tick: number): number =>
  frames.at(tick % frames.length) ?? 0;

export const selectFrame = (partner: Partner, tick: number): number => {
  if (partner.stage === 'Digitama') return cycleFrames(FRAMES.egg, tick);
  if (partner.isCalling) return cycleFrames(FRAMES.angry, tick);
  if (partner.reaction !== null && tick < partner.reactionUntilTick) {
    return cycleFrames(FRAMES[partner.reaction], tick);
  }
  return cycleFrames(FRAMES.walk, tick);
};

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
