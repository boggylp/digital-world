import { expect, test } from 'claude-code/testing';

const RUN = { command: 'paste-image', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const;
const PATH = String.raw`C:\Temp\claude-paste\paste-1.png`;

test('PasteImage_ImageOnClipboard_InsertsSavedPathAtCursor', async (engine, listen) => {
  const fills: unknown[] = [];
  listen('process.run', () => ({ value: { exitCode: 0, stdout: PATH, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }));
  listen('prompt.fill', (_engine, event) => {
    fills.push(event);
    return { isFilled: true };
  });

  const result = await engine.command.run(RUN);

  expect(fills).toMatchObject([{ text: PATH, mode: 'insert' }]);
  expect(result.text).toBeUndefined();
});

test('PasteImage_PwshFails_ReportsWithoutFilling', async (engine, listen) => {
  const fills: unknown[] = [];
  listen('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: 'boom', isStdoutTruncated: false, isStderrTruncated: false } }));
  listen('prompt.fill', (_engine, event) => {
    fills.push(event);
    return { isFilled: true };
  });

  const result = await engine.command.run(RUN);

  expect(fills).toHaveLength(0);
  expect(result.text).toBe('paste-image: boom');
});
