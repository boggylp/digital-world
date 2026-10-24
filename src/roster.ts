export const STAGES = [
  'Digitama',
  'Baby I',
  'Baby II',
  'Rookie',
  'Champion',
  'Ultimate',
  'Mega'
] as const;

export type Stage = (typeof STAGES)[number];

export type Line = {
  partner: string;
  forms: Record<Stage, string>;
};

export const DEFAULT_LINE: Line = {
  partner: 'Agumon',
  forms: {
    Digitama: 'Agu_Digitama',
    'Baby I': 'Botamon',
    'Baby II': 'Koromon',
    Rookie: 'Agumon',
    Champion: 'Greymon',
    Ultimate: 'MetalGreymon',
    Mega: 'WarGreymon'
  }
};

export const LINES: readonly Line[] = [
  DEFAULT_LINE,
  {
    partner: 'Gabumon',
    forms: {
      Digitama: 'Gabu_Digitama',
      'Baby I': 'Punimon',
      'Baby II': 'Tsunomon',
      Rookie: 'Gabumon',
      Champion: 'Garurumon',
      Ultimate: 'WereGarurumon',
      Mega: 'MetalGarurumon'
    }
  },
  {
    partner: 'Biyomon',
    forms: {
      Digitama: 'Piyo_Digitama',
      'Baby I': 'Pururumon',
      'Baby II': 'Pyocomon',
      Rookie: 'Piyomon',
      Champion: 'Birdramon',
      Ultimate: 'Garudamon',
      Mega: 'Hououmon'
    }
  },
  {
    partner: 'Palmon',
    forms: {
      Digitama: 'Pal_Digitama',
      'Baby I': 'Yuramon',
      'Baby II': 'Tanemon',
      Rookie: 'Palmon',
      Champion: 'Togemon',
      Ultimate: 'Lilimon',
      Mega: 'Rosemon'
    }
  },
  {
    partner: 'Salamon',
    forms: {
      Digitama: 'Plot_Digitama',
      'Baby I': 'YukimiBotamon',
      'Baby II': 'Nyaromon',
      Rookie: 'Plotmon',
      Champion: 'Tailmon',
      Ultimate: 'Angewomon',
      Mega: 'Ophanimon'
    }
  },
  {
    partner: 'Veemon',
    forms: {
      Digitama: 'V_Digitama',
      'Baby I': 'Chicomon',
      'Baby II': 'Chibimon',
      Rookie: 'V-mon',
      Champion: 'XV-mon',
      Ultimate: 'Paildramon',
      Mega: 'Imperialdramon_Fighter'
    }
  }
];

export function findLine(partner: string): Line | null {
  const wanted = partner.toLowerCase();
  return LINES.find((line) => line.partner.toLowerCase() === wanted) ?? null;
}
