# agent-digitama

A pixel Digimon partner that lives above the prompt in Claude Code. Every session hatches an egg, and the partner digivolves as the context window fills, so you can read how full the context is at a glance.

## Install

At the prompt of a Claude Code terminal session:

```text
/plugin install agent-digitama --marketplace boggylp/agent-digitama
```

Answer `y` to add the marketplace, then pick a scope. The partner appears in the band above the prompt.

Requirements: a Claude Code build with mods (tested on 2.1.310) and a truecolor terminal. The band draws in the terminal only, not in the desktop app, VS Code or mobile. It hides itself when the band is narrower than 16 columns or shorter than 8 rows.

## How the partner grows

The form follows the session's context usage:

| Context used | Stage | Agumon line |
| --- | --- | --- |
| Before the first prompt | Digitama | Digitama |
| 0% | Baby I | Botamon |
| 5% | Baby II | Koromon |
| 10% | Rookie | Agumon |
| 30% | Champion | Greymon |
| 55% | Ultimate | MetalGreymon |
| 80% | Mega | WarGreymon |

The egg hatches on your first prompt. When compaction frees context, the partner de-digivolves to the stage that matches, but never below Rookie once it got there.

## Reactions

- **Turn complete:** the partner cheers.
- **Tool call fails:** the partner flinches.
- **Claude needs you:** the partner turns angry. Claude Code hides the band while a dialog is open, so a question or permission dialog covers the signal.

## Choose a partner

```text
/agent-digitama Veemon
```

New sessions hatch the saved partner's egg. The current session keeps its partner. Run `/agent-digitama` with no name to see the saved partner and the choices: Agumon, Gabumon, Biyomon, Palmon, Salamon, Veemon. Without a saved choice, the partner is Agumon.

## Sprites

The 16×16 sprites are Tortoiseshel's [Full Color Digimon Dot Sprites](https://withthewill.net/threads/full-color-digimon-dot-sprites.25843/), bundled so the partner works offline. Each sprite is two pixels per terminal cell, drawn with half-block characters, which makes the partner 16 columns by 8 rows. A smaller partner stops reading as its Digimon, so the partner keeps the sprite's full resolution. See [CREDITS.md](CREDITS.md).

A line joins the roster only when the set has every stage from egg to Mega. Tentomon, Gomamon and Patamon lack a Baby I sprite.

## Development

```sh
npm install
npm test                  # core unit tests (vitest)
claude plugin test .      # mod tests against the engine
npm run typecheck
claude --plugin-dir .     # run a session with the working copy
```

`npm run sprites:fetch` downloads the roster's sheets into `sprites/`, and `npm run sprites:build` regenerates `src/sprites.generated.ts` from them. The build fails when a sheet lacks a frame the partner needs.

The game logic in `src/` is plain TypeScript with no host API. Only `hooks/` talks to Claude Code, so another agent harness needs only its own adapter.

## License

The code is [MIT](LICENSE). It does not cover the sprites or the Digimon characters, whose owners [CREDITS.md](CREDITS.md) names.
