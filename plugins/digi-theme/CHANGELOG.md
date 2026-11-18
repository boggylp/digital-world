# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.3.2]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.3.2
[0.3.1]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.3.1
[0.3.0]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.3.0
[0.2.0]: https://github.com/boggylp/digital-world/releases/tag/digi-theme--v0.2.0
[0.1.0]: https://github.com/boggylp/digital-world/releases/tag/digivice--v0.1.0
