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

function hashWord(word: string): number {
  return [...word].reduce((hash, character) => (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0, 7);
}

function pickPair(word: string): (typeof WORDS)[number] {
  return WORDS[hashWord(word) % WORDS.length] ?? WORDS[0];
}

export function pickPresentWord(word: string): string {
  return pickPair(word)[0];
}

export function pickPastWord(word: string): string {
  return pickPair(word)[1];
}
