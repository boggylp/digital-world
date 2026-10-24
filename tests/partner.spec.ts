import { describe, expect, test } from 'vitest';

import {
  callPartner,
  createPartner,
  hatchPartner,
  measurePartner,
  nameForm,
  reactPartner,
  selectFrame,
  type Partner
} from '../src/partner.ts';
import { DEFAULT_LINE, type Stage } from '../src/roster.ts';

function createAgumon(stage: Stage = 'Digitama'): Partner {
  return { ...createPartner(DEFAULT_LINE), stage };
}

describe('measurePartner', () => {
  test.each([
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

  test('measurePartner_EggBeforeFirstPrompt_StaysEgg', () => {
    expect(measurePartner(createAgumon(), 60).stage).toBe('Digitama');
  });

  test('measurePartner_MegaAfterCompactionTo20_DeDigivolvesToRookie', () => {
    expect(measurePartner(createAgumon('Mega'), 20).stage).toBe('Rookie');
  });

  test('measurePartner_MegaAfterCompactionTo40_DeDigivolvesToChampion', () => {
    expect(measurePartner(createAgumon('Mega'), 40).stage).toBe('Champion');
  });

  test('measurePartner_RookieAtZero_KeepsRookieFloor', () => {
    expect(measurePartner(createAgumon('Rookie'), 0).stage).toBe('Rookie');
  });
});

describe('hatchPartner', () => {
  test('hatchPartner_EggOnFirstPrompt_HatchesToBabyI', () => {
    expect(hatchPartner(createAgumon(), 2).stage).toBe('Baby I');
  });

  test('hatchPartner_CallingPartner_StopsCalling', () => {
    expect(hatchPartner(callPartner(createAgumon('Rookie'), true), 12).isCalling).toBe(false);
  });
});

describe('selectFrame', () => {
  test('selectFrame_CallingPartner_ShowsAngryFrame', () => {
    expect(selectFrame(callPartner(createAgumon('Rookie'), true), 3)).toBe(8);
  });

  test('selectFrame_HurtPartner_ShowsHurtFrame', () => {
    expect(selectFrame(reactPartner(createAgumon('Rookie'), 'hurt', 10), 10)).toBe(9);
  });

  test('selectFrame_HappyPartnerAfterReaction_WalksAgain', () => {
    expect(selectFrame(reactPartner(createAgumon('Rookie'), 'happy', 0), 7)).toBe(1);
  });

  test('selectFrame_EggReactingToFailure_KeepsWobbling', () => {
    expect(selectFrame(reactPartner(createAgumon(), 'hurt', 0), 1)).toBe(1);
  });
});

describe('nameForm', () => {
  test.each([
    ['Digitama', 'Digitama'],
    ['Rookie', 'Agumon'],
    ['Mega', 'WarGreymon']
  ] as const)('nameForm_Agumon%s_Is%s', (stage, name) => {
    expect(nameForm(createAgumon(stage))).toBe(name);
  });

  test('nameForm_VeemonMega_UsesDubName', () => {
    const line = {
      partner: 'Veemon',
      forms: { ...DEFAULT_LINE.forms, Mega: 'Imperialdramon_Fighter' }
    };
    const veemon = { ...createPartner(line), stage: 'Mega' as const };
    expect(nameForm(veemon)).toBe('Imperialdramon');
  });
});
