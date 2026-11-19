# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-11-20

### Fixed

- The transcript no longer says the `classic.Notification` hook was skipped. Claude Code hands some notifications past user plugins, so the partner now pulses amber from question and permission requests alone.

## [0.4.0] - 2026-11-19

### Breaking

- `agent-digitama` is folded into `digi-theme`, so uninstall `agent-digitama`. `digi-theme` now draws the partner and answers `/agent-digitama`. Choose the partner and set the stage percentages again, because `agent-digitama` kept them under its own name.

### Added

- The pixel Digimon partner above the prompt, which hatches and digivolves as the context window fills.

## [0.3.3] - 2026-11-18

### Fixed

- Terminal code colors use Claude Code's theme keys, which follow the terminal palette under the ANSI themes. 0.3.2 passed a color form the engine refuses, so replies with code fell back to plain rendering.

## [0.3.2] - 2026-11-18

### Fixed

- Terminal code colors come from the terminal's own palette instead of Claude Code's fixed colors.

## [0.3.1] - 2026-11-18

### Fixed

- Terminal code colors follow VS Code's grammars, so variables stay plain, parameters and keys get their own color, and TOML keys look alike inside and outside braces.

## [0.3.0] - 2026-11-18

### Added

- Code blocks in the terminal are colored with the terminal's own ANSI palette, keys and punctuation included.

## [0.2.0] - 2026-11-18

### Breaking

- The plugin is renamed from `digivice` to `digi-theme`, and its tour command from `/digivice` to `/digi-theme`.

### Added

- Replies in the Claude Code desktop app get the same headings, code frames, flow trees and links as the terminal, with charts drawn as vector graphics and local PNG images shown inline.

## [0.1.0] - 2026-11-14

### Added

- Bar, line, sparkline and pie charts drawn in the terminal from fenced chart blocks in Claude's replies.
- Mermaid flowcharts and `flow` blocks drawn as colored trees.
- Inline PNG images in Ghostty, kitty, WezTerm and iTerm2, with a clickable link everywhere else.
- Clickable file paths in replies, and a link to each file a `Write` or `Edit` changes.
- A watercolor summer-sky theme and backdrop in the desktop and mobile apps.
- `/digivice` shows a tour of everything the theme draws.

## [agent-digitama 0.2.3] - 2026-11-18

### Fixed

- `npm run sprites:fetch` fetches only the egg sheets, so it no longer fails on forms that have no dot sheet.

## [agent-digitama 0.2.2] - 2026-11-18

### Fixed

- The image partner stays an image when a frame is refused while its row is hidden, as during a permission prompt.

## [agent-digitama 0.2.1] - 2026-11-18

### Changed

- The image partner in the terminal takes 8 columns by 4 rows again.

## [agent-digitama 0.2.0] - 2026-11-18

### Added

- The partner in the Claude Code desktop app, drawn as vector pixel art above the prompt.

### Changed

- Every form draws at the same height, from babies to Megas.
- The Veemon and Salamon lines use the Digimon UP sprites, like the other lines.
- Salamon's line digivolves to Magnadramon, because the Digimon UP sprites have no Ophanimon.

- The image partner in the terminal takes 4 columns by 2 rows, half its earlier width and height.

## [agent-digitama 0.1.0] - 2026-11-14

### Added

- A pixel Digimon partner in the band above the prompt that hatches on your first prompt and digivolves from Baby to Mega as the context window fills.
- Plugin settings for the context percentage where each stage starts, defaulting to Baby II at 5%, Rookie at 10%, Champion at 30%, Ultimate at 50% and Mega at 70%.
- Six partner lines to choose from with `/agent-digitama <name>`: Agumon, Gabumon, Biyomon, Palmon, Salamon and Veemon.
- Reactions to the session: a hop when a turn completes, a red flash when a tool call fails, and an amber pulse when Claude needs you.
- Detailed image sprites in Ghostty, kitty and iTerm2, with text-cell sprites in other terminals.

[0.4.0]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.4.0
[0.3.3]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.3.3
[0.3.2]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.3.2
[0.3.1]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.3.1
[0.3.0]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.3.0
[0.2.0]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.2.0
[0.1.0]: https://github.com/boggylp/digital-world/releases/tag/digivice--v0.1.0
[agent-digitama 0.2.3]: https://github.com/boggylp/digital-world/releases/tag/agent-digitama--v0.2.3
[agent-digitama 0.2.2]: https://github.com/boggylp/digital-world/releases/tag/agent-digitama--v0.2.2
[agent-digitama 0.2.1]: https://github.com/boggylp/digital-world/releases/tag/agent-digitama--v0.2.1
[agent-digitama 0.2.0]: https://github.com/boggylp/digital-world/releases/tag/agent-digitama--v0.2.0
[agent-digitama 0.1.0]: https://github.com/boggylp/digital-world/releases/tag/agent-digitama--v0.1.0
