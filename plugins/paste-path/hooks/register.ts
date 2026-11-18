import type { Register } from 'claude-code';

export const COMMAND = 'paste-image';

export const SAVE_CLIPBOARD = [
  'Add-Type -AssemblyName System.Windows.Forms',
  '$image = [System.Windows.Forms.Clipboard]::GetImage()',
  'if ($null -eq $image) { [Console]::Out.Write([System.Windows.Forms.Clipboard]::GetText()); exit 0 }',
  "$folder = Join-Path ([IO.Path]::GetTempPath()) 'claude-paste'",
  'New-Item -ItemType Directory -Force $folder | Out-Null',
  "$path = Join-Path $folder ('paste-{0:yyyyMMdd-HHmmss-fff}.png' -f (Get-Date))",
  '$image.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)',
  '[Console]::Out.Write($path)'
].join('; ');

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e);
    await $.command
      .register({ name: COMMAND, description: 'Paste the clipboard image as its saved file path' })
      .catch(() => {});
    return started;
  });

  on('command.run', { command: COMMAND }, async $ => {
    const { exitCode, stdout, stderr } = await $.process.run([
      'pwsh',
      '-NoProfile',
      '-NonInteractive',
      '-STA',
      '-Command',
      SAVE_CLIPBOARD
    ]);
    if (exitCode !== 0) return { text: `paste-image: ${stderr.trim() || `pwsh exited ${exitCode}`}`, isTextDisplayOnly: true };
    if (stdout === '') return { text: 'paste-image: the clipboard holds no image or text', isTextDisplayOnly: true };
    await $.prompt.fill({ text: stdout, mode: 'insert' });
    return { isTextDisplayOnly: true };
  });
};
