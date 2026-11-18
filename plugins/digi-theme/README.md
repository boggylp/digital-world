# digi-theme

A Digital World look for Claude Code. In the terminal and the desktop app, headings, code, charts, flow graphs and images in replies get summer-sky colors, while plain prose keeps your theme.

## Install

At the prompt of a Claude Code session:

```text
/plugin install digi-theme --marketplace boggylp/digital-world
```

Run `/digi-theme` for a tour of everything it draws.

## What it draws

| Claude writes | Claude Code shows |
| --- | --- |
| A ` ```bar `, ` ```hbar `, ` ```line `, ` ```spark ` or ` ```pie ` block | A chart in the sky, sun and leaf colors |
| A ` ```chart ` block with a `type:` line | The same chart, picked by `type` |
| A ` ```mermaid ` flowchart or a ` ```flow ` block | A tree of the graph, with edge labels and `↺` for a node already drawn |
| `![alt](path.png)` on its own line | The picture inline, with a clickable link under it |
| An absolute path such as `C:\repo\a.ts` or `~/notes/a.md:12` | A link that opens the file |
| A heading | A colored heading with a mark per level |
| A code block | A framed block with its language on top |

A `Read` of a PNG shows the image under the tool row. A `Write` or `Edit` adds a link to the file it changed. The spinner and the turn footer use words like `Digivolving` and `Digivolved`.

In the desktop and mobile apps the mod sets a light and a dark theme, and a backdrop of a summer sky over misty mountains and treetops.

## Chart blocks

Each line is `name: values`, with values separated by a comma and a space. A comma inside a number, as in `1,200`, reads as a thousands separator. The lines `type`, `title`, `x` and `unit` are settings, so a series cannot use those names.

````markdown
```line
title: Tokens per turn
x: 1, 2, 3, 4
input: 12, 18, 15, 30
output: 4, 6, 9, 7
```
````

The desktop app draws charts as vector graphics 560 pixels wide, shortening long labels to fit. The terminal draws them with block and braille characters.

`bar`, `hbar` and `pie` read the first value of each line as one category. `line` and `spark` read every value as a series. A block that does not parse draws as code with the reason under it.

## Images

The desktop app draws local PNGs up to about 95 KB and links larger ones. In the terminal, images draw in Ghostty, kitty, WezTerm and iTerm2 outside tmux. Set [`CLAUDE_CODE_FORCE_TERMINAL_IMAGES=1`](https://code.claude.com/docs/en/plugins/mods/gallery.md) when your terminal path draws images but is not detected. Elsewhere, and for remote or non-PNG images, the mod draws a clickable link.

## Development

```sh
npm install                # at the repository root
npm test                   # at the repository root: unit tests in tests/digi-theme
claude plugin test .       # mod tests against the engine
npm run typecheck
claude --plugin-dir .      # a session with the working copy
```

`npm run image:build` redraws the demo egg in `assets/digitama.png`. The drawing logic in `src/` is plain TypeScript, and only `hooks/` talks to Claude Code.
