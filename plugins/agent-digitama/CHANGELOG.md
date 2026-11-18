# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-18

### Added

- The partner in the Claude Code desktop app, drawn as vector pixel art above the prompt.

### Changed

- Every form draws at the same height, from babies to Megas.
- The Veemon and Salamon lines use the Digimon UP sprites, like the other lines.
- Salamon's line digivolves to Magnadramon, because the Digimon UP sprites have no Ophanimon.

- The image partner in the terminal takes 4 columns by 2 rows, half its earlier width and height.

## [0.1.0] - 2026-11-14

### Added

- A pixel Digimon partner in the band above the prompt that hatches on your first prompt and digivolves from Baby to Mega as the context window fills.
- Plugin settings for the context percentage where each stage starts, defaulting to Baby II at 5%, Rookie at 10%, Champion at 30%, Ultimate at 50% and Mega at 70%.
- Six partner lines to choose from with `/agent-digitama <name>`: Agumon, Gabumon, Biyomon, Palmon, Salamon and Veemon.
- Reactions to the session: a hop when a turn completes, a red flash when a tool call fails, and an amber pulse when Claude needs you.
- Detailed image sprites in Ghostty, kitty and iTerm2, with text-cell sprites in other terminals.

[0.2.0]: https://github.com/boggylp/digital-world/releases/tag/agent-digitama--v0.2.0
[0.1.0]: https://github.com/boggylp/digital-world/releases/tag/agent-digitama--v0.1.0
