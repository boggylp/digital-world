# digi-theme

A Digital World for Claude Code. A pixel Digimon partner lives above the prompt: every session hatches an egg, and the partner digivolves as the context window fills, so you can read how full the context is at a glance. In the terminal and the desktop app, headings, code, charts, flow graphs and images in replies get summer-sky colors, while plain prose keeps your theme.

## Install

At the prompt of a Claude Code session:

```text
/plugin install digi-theme --marketplace boggylp/digital-world
```

Answer `y` to add the marketplace, then pick a scope. The partner appears in the band above the prompt. Run `/digi-theme` for a tour of everything the look draws.

## The partner above the prompt

Requirements: Claude Code with mods (tested on 2.1.326), in a truecolor terminal or the desktop app. The desktop app draws the partner as vector pixel art.

The desktop app always uses the detailed sprites, 64 pixels tall. In the terminal, Ghostty, kitty and compatible iTerm2 sessions use image rendering, and other terminals use text cells. If Claude refuses the first image, the partner falls back to text cells for that session.

| Renderer | Minimum band width | Minimum band height |
| --- | --- | --- |
| Image | 8 columns | 4 rows |
| Text cells | 24 columns | 8 rows |

In the terminal, the partner hides when the band cannot fit its renderer. Inside multiplexers, image rendering follows Claude's documented [`CLAUDE_CODE_FORCE_TERMINAL_IMAGES`](https://code.claude.com/docs/en/plugins/mods/gallery.md) setting. Enable it only when the complete terminal path supports images.

### How the partner grows

The form follows the session's context usage:

| Context used | Stage | Agumon line |
| --- | --- | --- |
| Before the first prompt | Digitama | Digitama |
| 0% | Baby I | Botamon |
| 5% | Baby II | Koromon |
| 10% | Rookie | Agumon |
| 30% | Champion | Greymon |
| 50% | Ultimate | MetalGreymon |
| 70% | Mega | WarGreymon |

The egg hatches on your first prompt: it wobbles, cracks and bursts into the baby. Every stage change plays a short digivolution: the old form flashes, morphs through white silhouettes and sparkles, and the new form appears. When compaction frees context, the partner de-digivolves to the stage that matches, but never below Rookie once it got there. Going down plays the same morph without sparkles.

The percentages in the table are defaults. Change them in `/config` under the plugin's settings, or in `pluginConfigs` in `settings.json` with the keys `baby_ii_percent`, `rookie_percent`, `champion_percent`, `ultimate_percent` and `mega_percent`. Each value must be 1 to 100, and each stage must start higher than the one before. Otherwise the partner keeps the defaults and a notice says why on each prompt.

### Reactions

- **Turn complete:** the partner hops.
- **Tool call fails:** the partner flashes red.
- **Claude needs you:** the partner pulses amber.

Claude Code hides the band while a dialog is open, so a question or permission dialog covers the signal.

### Choose a partner

```text
/agent-digitama Veemon
```

New sessions hatch the saved partner's egg. The current session keeps its partner. Run `/agent-digitama` with no name to see the saved partner and the choices: Agumon, Gabumon, Biyomon, Palmon, Salamon, Veemon. Save `Random` to hatch a different egg from those six in each new session. Without a saved choice, the partner is Agumon.

### Sprites

[Digimon UP](https://github.com/dannyphang/digimon-up-sprites) supplies the walking and idle animations for every form after the egg. Every form draws at the same height. The image renderer and the desktop app preserve the artwork on a compact canvas. The text fallback uses half-block characters. Each form keeps one scale across its animation frames.

| Renderer | Pixel canvas |
| --- | --- |
| Image and desktop | 80×80 |
| Text cells | 24×16 |

Eggs use Tortoiseshel's [Full Color Digimon Dot Sprites](https://withthewill.net/threads/full-color-digimon-dot-sprites.25843/) with their original artwork, scaled evenly for image rendering. Both sets are bundled for offline use. See [CREDITS.md](CREDITS.md).

A line joins the roster only when the set has every stage from egg to Mega. Tentomon, Gomamon and Patamon lack a Baby I sprite.

The full original collection remains in [assets/digimon-up/](assets/digimon-up/). [UPSTREAM.md](assets/digimon-up/UPSTREAM.md) explains its frame names and animation sequences.

## The Digital World look

### What it draws

| Claude writes | Claude Code shows |
| --- | --- |
| A ` ```bar `, ` ```hbar `, ` ```line `, ` ```spark ` or ` ```pie ` block | A chart in the sky, sun and leaf colors |
| A ` ```chart ` block with a `type:` line | The same chart, picked by `type` |
| A ` ```mermaid ` flowchart or a ` ```flow ` block | A tree of the graph, with edge labels and `↺` for a node already drawn |
| `![alt](path.png)` on its own line | The picture inline, with a clickable link under it |
| An absolute path such as `C:\repo\a.ts` or `~/notes/a.md:12` | A link that opens the file |
| A heading | A colored heading with a mark per level |
| A code block | A framed block with its language on top. In the terminal its tokens take your terminal's own colors |

A `Read` of a PNG shows the image under the tool row. A `Write` or `Edit` adds a link to the file it changed. The spinner and the turn footer use words like `Digivolving` and `Digivolved`.

In the desktop and mobile apps the mod sets a light and a dark theme, and a backdrop of a summer sky over misty mountains and treetops.

### Chart blocks

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

### Code colors

In the terminal, code blocks are colored through Claude Code's theme keys. Under the `dark-ansi` or `light-ansi` theme those keys are your terminal's own ANSI colors, so code follows whatever palette your terminal or its host uses; under other themes they take that theme's colors. [Shiki](https://shiki.style/) reads each block with the TextMate grammars VS Code uses, and [bat](https://github.com/sharkdp/bat)'s `ansi` theme picks an ANSI color for each kind of token. 41 grammars are bundled, among them TypeScript, TSX, JavaScript, JSON, YAML, TOML, Bash, PowerShell, Nushell, Python, C#, Go, Rust, SQL, Dockerfile, CSS, HTML and Markdown. A language outside that set is left to Claude Code's own highlighter.

### Images

The desktop app draws local PNGs up to about 95 KB and links larger ones. In the terminal, images draw in Ghostty, kitty, WezTerm and iTerm2 outside tmux. Set [`CLAUDE_CODE_FORCE_TERMINAL_IMAGES=1`](https://code.claude.com/docs/en/plugins/mods/gallery.md) when your terminal path draws images but is not detected. Elsewhere, and for remote or non-PNG images, the mod draws a clickable link.

## Development

```sh
npm install                # at the repository root
npm test                   # at the repository root: unit tests in tests/digi-theme
claude plugin test .       # mod tests against the engine
npm run typecheck
claude --plugin-dir .      # a session with the working copy
```

`npm run sprites:fetch` downloads the egg dot sheets into `sprites/`. `npm run sprites:build` regenerates the sprite data from those sheets and the bundled Digimon UP collection. The build fails on missing or empty frames and incomplete mapped animation sequences.

`npm run highlight:build` rebundles Shiki, its grammars and the theme into `src/highlight.generated/`. `npm run image:build` redraws the demo egg in `assets/digitama.png`.

The game and drawing logic in `src/` is plain TypeScript with no host API. Only `hooks/` talks to Claude Code, so another agent harness needs only its own adapter.

## Credits

- [Shiki](https://github.com/shikijs/shiki) is bundled under the MIT License, Copyright (c) 2021 Pine Wu and (c) 2023 Anthony Fu.
- `assets/bat-ansi.tmTheme` is bat's `ansi` theme, used under the MIT License, Copyright (c) 2018-2021 bat-developers.

## License

The code is [MIT](../../LICENSE). It does not cover the sprites or the Digimon characters, whose owners [CREDITS.md](CREDITS.md) names.
