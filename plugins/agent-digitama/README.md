# agent-digitama

A pixel Digimon partner that lives above the prompt in Claude Code. Every session hatches an egg, and the partner digivolves as the context window fills, so you can read how full the context is at a glance.

## Install

At the prompt of a Claude Code terminal session:

```text
/plugin install agent-digitama --marketplace boggylp/digital-world
```

Answer `y` to add the marketplace, then pick a scope. The partner appears in the band above the prompt.

Requirements: Claude Code with mods (tested on 2.1.316) and a truecolor terminal. The partner appears only in terminal sessions.

Ghostty, kitty and compatible iTerm2 sessions use image rendering. Other terminals use text cells. If Claude refuses image updates, the partner falls back to text cells for that session.

| Renderer | Minimum band width | Minimum band height |
| --- | --- | --- |
| Image | 8 columns | 4 rows |
| Text cells | 24 columns | 8 rows |

The partner hides when the band cannot fit its renderer. Inside multiplexers, image rendering follows Claude's documented [`CLAUDE_CODE_FORCE_TERMINAL_IMAGES`](https://code.claude.com/docs/en/plugins/mods/gallery.md) setting. Enable it only when the complete terminal path supports images.

## How the partner grows

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

## Reactions

- **Turn complete:** a Digimon UP partner hops, and a dot-sprite partner cheers.
- **Tool call fails:** a Digimon UP partner flashes red, and a dot-sprite partner flinches.
- **Claude needs you:** a Digimon UP partner pulses amber, and a dot-sprite partner turns angry.

Claude Code hides the band while a dialog is open, so a question or permission dialog covers the signal.

## Choose a partner

```text
/agent-digitama Veemon
```

New sessions hatch the saved partner's egg. The current session keeps its partner. Run `/agent-digitama` with no name to see the saved partner and the choices: Agumon, Gabumon, Biyomon, Palmon, Salamon, Veemon. Without a saved choice, the partner is Agumon.

## Sprites

[Digimon UP](https://github.com/dannyphang/digimon-up-sprites) supplies the walking and idle animations for the Agumon, Gabumon and Palmon lines, plus Biyomon from Rookie onward. The image renderer preserves the artwork on a compact canvas. The text fallback uses half-block characters. Each form keeps one scale across its animation frames.

| Renderer | Pixel canvas |
| --- | --- |
| Image | 80×80 |
| Text cells | 24×16 |

Eggs, Biyomon's early forms, Salamon and Veemon use Tortoiseshel's [Full Color Digimon Dot Sprites](https://withthewill.net/threads/full-color-digimon-dot-sprites.25843/) with their original artwork, scaled evenly for image rendering. Both sets are bundled for offline use. See [CREDITS.md](CREDITS.md).

A line joins the roster only when the set has every stage from egg to Mega. Tentomon, Gomamon and Patamon lack a Baby I sprite.

The full original collection remains in [assets/digimon-up/](assets/digimon-up/). [UPSTREAM.md](assets/digimon-up/UPSTREAM.md) explains its frame names and animation sequences.

## Development

```sh
npm install                # at the repository root
npm test                   # at the repository root: unit tests in tests/agent-digitama
claude plugin test .       # mod tests against the engine
npm run typecheck
claude --plugin-dir .      # a session with the working copy
```

`npm run sprites:fetch` downloads the dot sheets into `sprites/`. `npm run sprites:build` regenerates the sprite data from the bundled dot sheets and Digimon UP collection. The build fails on missing or empty frames and incomplete mapped animation sequences.

The game logic in `src/` is plain TypeScript with no host API. Only `hooks/` talks to Claude Code, so another agent harness needs only its own adapter.

## License

The code is [MIT](../../LICENSE). It does not cover the sprites or the Digimon characters, whose owners [CREDITS.md](CREDITS.md) names.
