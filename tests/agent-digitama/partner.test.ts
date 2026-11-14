

import {
  callPartner,
  createPartner,
  hatchPartner,
  measurePartner,
  nameForm,
  reactPartner,
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
    [54.9, 'Champion'],
    [55, 'Ultimate'],
    [79.9, 'Ultimate'],
    [80, 'Mega'],
    [100, 'Mega']
  ] as const)('measurePartner_BabyAt%s_Becomes%s', (percent, stage) => {
    expect(measurePartner(createAgumon('Baby I'), percent).stage).toBe(stage);
  });

  it('measurePartner_EggBeforeFirstPrompt_StaysEgg', () => {
    expect(measurePartner(createAgumon(), 60).stage).toBe('Digitama');
  });

  it('measurePartner_MegaAfterCompactionTo20_DeDigivolvesToRookie', () => {
    expect(measurePartner(createAgumon('Mega'), 20).stage).toBe('Rookie');
  });

  it('measurePartner_MegaAfterCompactionTo40_DeDigivolvesToChampion', () => {
    expect(measurePartner(createAgumon('Mega'), 40).stage).toBe('Champion');
  });

  it('measurePartner_RookieAtZero_KeepsRookieFloor', () => {
    expect(measurePartner(createAgumon('Rookie'), 0).stage).toBe('Rookie');
  });
});

describe('hatchPartner', () => {
  it('hatchPartner_EggOnFirstPrompt_HatchesToBabyI', () => {
    expect(hatchPartner(createAgumon(), 2).stage).toBe('Baby I');
  });

  it('hatchPartner_CallingPartner_StopsCalling', () => {
    const calling = callPartner(createAgumon('Rookie'), true);
    expect(hatchPartner(calling, 12).isCalling).toBe(false);
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
