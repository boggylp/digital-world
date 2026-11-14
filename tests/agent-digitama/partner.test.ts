import { readFile } from 'node:fs/promises';

import {
  callPartner,
  createPartner,
  DEFAULT_THRESHOLDS,
  hatchPartner,
  measurePartner,
  nameForm,
  reactPartner,
  readThresholds,
  selectFrame,
  type Partner
} from '../../plugins/agent-digitama/src/partner.ts';
import { DEFAULT_LINE, type Stage } from '../../plugins/agent-digitama/src/roster.ts';

const createAgumon = (stage: Stage = 'Digitama'): Partner => ({
  ...createPartner(DEFAULT_LINE),
  stage
});

describe('measurePartner', () => {
  it.each([
    [0, 'Baby I'],
    [4.9, 'Baby I'],
    [5, 'Baby II'],
    [9.9, 'Baby II'],
    [10, 'Rookie'],
    [29.9, 'Rookie'],
    [30, 'Champion'],
    [49.9, 'Champion'],
    [50, 'Ultimate'],
    [69.9, 'Ultimate'],
    [70, 'Mega'],
    [100, 'Mega']
  ] as const)('measurePartner_BabyAt%s_Becomes%s', (percent, stage) => {
    expect(measurePartner(createAgumon('Baby I'), percent, DEFAULT_THRESHOLDS).stage).toBe(stage);
  });

  it('measurePartner_EggBeforeFirstPrompt_StaysEgg', () => {
    expect(measurePartner(createAgumon(), 60, DEFAULT_THRESHOLDS).stage).toBe('Digitama');
  });

  it('measurePartner_MegaAfterCompactionTo20_DeDigivolvesToRookie', () => {
    expect(measurePartner(createAgumon('Mega'), 20, DEFAULT_THRESHOLDS).stage).toBe('Rookie');
  });

  it('measurePartner_MegaAfterCompactionTo40_DeDigivolvesToChampion', () => {
    expect(measurePartner(createAgumon('Mega'), 40, DEFAULT_THRESHOLDS).stage).toBe('Champion');
  });

  it('measurePartner_RookieAtZero_KeepsRookieFloor', () => {
    expect(measurePartner(createAgumon('Rookie'), 0, DEFAULT_THRESHOLDS).stage).toBe('Rookie');
  });
});

describe('readThresholds', () => {
  it('readThresholds_NoOptions_ReturnsDefaults', () => {
    expect(readThresholds({})).toStrictEqual({ babyII: 5, rookie: 10, champion: 30, ultimate: 50, mega: 70 });
  });

  it('readThresholds_CustomRisingPercentages_ReturnsThem', () => {
    const options = { baby_ii_percent: 2, rookie_percent: 4, champion_percent: 20, ultimate_percent: 40, mega_percent: 60 };
    expect(readThresholds(options)).toStrictEqual({ babyII: 2, rookie: 4, champion: 20, ultimate: 40, mega: 60 });
  });

  it('readThresholds_ManifestDefaults_MatchCodeDefaults', async () => {
    const manifest = JSON.parse(await readFile(new URL('../../plugins/agent-digitama/.claude-plugin/plugin.json', import.meta.url), 'utf8')) as { userConfig: Record<string, { default: number }> };
    const defaults = Object.fromEntries(Object.entries(manifest.userConfig).map(([key, field]) => [key, field.default]));
    expect(readThresholds(defaults)).toStrictEqual(DEFAULT_THRESHOLDS);
  });

  it.each([
    ['MegaBelowUltimate', { ultimate_percent: 60, mega_percent: 40 }],
    ['MegaEqualsUltimate', { ultimate_percent: 60, mega_percent: 60 }],
    ['RookieAboveChampion', { rookie_percent: 40, champion_percent: 35 }],
    ['MegaOver100', { mega_percent: 150 }],
    ['BabyIIAtZero', { baby_ii_percent: 0 }],
    ['NotANumber', { mega_percent: Number.NaN }],
    ['TextPercent', { mega_percent: '70' }]
  ] as const)('readThresholds_%s_ReturnsNull', (_scenario, options) => {
    expect(readThresholds(options)).toBeNull();
  });
});

describe('hatchPartner', () => {
  it('hatchPartner_EggOnFirstPrompt_HatchesToBabyI', () => {
    expect(hatchPartner(createAgumon(), 2, DEFAULT_THRESHOLDS).stage).toBe('Baby I');
  });

  it('hatchPartner_CallingPartner_StopsCalling', () => {
    const calling = callPartner(createAgumon('Rookie'), true);
    expect(hatchPartner(calling, 12, DEFAULT_THRESHOLDS).isCalling).toBe(false);
  });
});

describe('selectFrame', () => {
  it('selectFrame_CallingPartner_ShowsAngryFrame', () => {
    const calling = callPartner(createAgumon('Rookie'), true);
    expect(selectFrame(calling, 3)).toBe(8);
  });

  it('selectFrame_HurtPartner_ShowsHurtFrame', () => {
    const hurt = reactPartner(createAgumon('Rookie'), 'hurt', 10);
    expect(selectFrame(hurt, 10)).toBe(9);
  });

  it('selectFrame_HappyPartnerAfterReaction_WalksAgain', () => {
    const happy = reactPartner(createAgumon('Rookie'), 'happy', 0);
    expect(selectFrame(happy, 7)).toBe(1);
  });

  it('selectFrame_EggReactingToFailure_KeepsWobbling', () => {
    const egg = reactPartner(createAgumon(), 'hurt', 0);
    expect(selectFrame(egg, 1)).toBe(1);
  });
});

describe('nameForm', () => {
  it.each([
    ['Digitama', 'Digitama'],
    ['Rookie', 'Agumon'],
    ['Mega', 'WarGreymon']
  ] as const)('nameForm_Agumon%s_Is%s', (stage, name) => {
    expect(nameForm(createAgumon(stage))).toBe(name);
  });

  it('nameForm_VeemonMega_UsesDubName', () => {
    const line = {
      partner: 'Veemon',
      forms: { ...DEFAULT_LINE.forms, Mega: 'Imperialdramon_Fighter' }
    };
    const veemon = { ...createPartner(line), stage: 'Mega' as const };
    expect(nameForm(veemon)).toBe('Imperialdramon');
  });
});
