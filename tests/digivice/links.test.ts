

import { linkifyPaths } from '../../plugins/digivice/src/links.ts';

describe('linkifyPaths', () => {
  it.each([
    [String.raw`open C:\repo\a.ts now`, String.raw`open [C:\repo\a.ts](file:///C:/repo/a.ts) now`],
    ['see /usr/lib/x.so.', 'see [/usr/lib/x.so](file:///usr/lib/x.so).'],
    ['at ~/notes/a.md:12', 'at [~/notes/a.md:12](file:///home/me/notes/a.md)']
  ])('linkifyPaths_%s_LinksThePath', (input, expected) => {
    expect(linkifyPaths(input, '/home/me')).toBe(expected);
  });

  it.each([
    ['`C:\\repo\\a.ts`'],
    [String.raw`[a](C:\repo\a.ts)`],
    ['https://example.com/a/b.ts'],
    ['    indented /usr/local/bin code'],
    ['1/2 and and/or'],
    ['ratio 3/4/5']
  ])('linkifyPaths_%s_LeavesTextAlone', input => {
    expect(linkifyPaths(input, '/home/me')).toBe(input);
  });

  it('linkifyPaths_HomePathWithoutHome_LeavesTextAlone', () => {
    expect(linkifyPaths('~/a/b.md', '')).toBe('~/a/b.md');
  });
});
