const WORDS = [
  ['Digivolving', 'Digivolved'],
  ['Hatching', 'Hatched'],
  ['Exploring', 'Explored'],
  ['Scanning data', 'Scanned data'],
  ['Charging', 'Charged'],
  ['Syncing', 'Synced'],
  ['Decoding', 'Decoded'],
  ['Adventuring', 'Adventured']
] as const;
const HASH_MULTIPLIER = 31;
const HASH_SEED = 7;

const hashWord = (word: string): number =>
  [...word].reduce((hash, character) => (hash * HASH_MULTIPLIER + (character.codePointAt(0) ?? 0)) >>> 0, HASH_SEED);

const pickPair = (word: string): (typeof WORDS)[number] => WORDS[hashWord(word) % WORDS.length] ?? WORDS[0];

export const pickPresentWord = (word: string): string => pickPair(word)[0];

export const pickPastWord = (word: string): string => pickPair(word)[1];
