# paste-path

Pastes a clipboard image into Claude Code as the path of a saved PNG, instead of an inline image. On Windows, Claude Code's own image paste starts Windows PowerShell 5.1 twice per paste ([anthropics/claude-code#101444](https://github.com/anthropics/claude-code/issues/101444)). This mod starts PowerShell 7 once.

## Install

At the prompt of a Claude Code session:

```text
/plugin install paste-path --marketplace boggylp/digital-world
```

Then bind the paste keys to its command in `~/.claude/keybindings.json`:

```json
{
  "bindings": [
    { "context": "Chat", "bindings": { "ctrl+v": "command:paste-image", "alt+v": "command:paste-image" } }
  ]
}
```

Requirements: Windows with PowerShell 7 (`pwsh`) on `PATH`.

## What it does

`/paste-image`, or a key bound to it, reads the clipboard once:

- An image is saved as `paste-<time>.png` in `%TEMP%\claude-paste\`, and its path goes in at the cursor.
- Text, when there is no image, goes in at the cursor as it is.
- An empty clipboard or a failed read shows a one-line note and leaves the prompt alone.

## Development

```sh
claude plugin test .       # mod tests against the engine
claude --plugin-dir .      # a session with the working copy
```
