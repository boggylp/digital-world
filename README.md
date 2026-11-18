# digital-world

Digimon Adventure flavored mods for Claude Code. One marketplace holds both.

| Plugin | What it does |
| --- | --- |
| [agent-digitama](plugins/agent-digitama/README.md) | A pixel partner above the prompt that hatches and digivolves as the context window fills |
| [digi-theme](plugins/digi-theme/README.md) | A watercolor-sky look with charts, flow graphs, inline images and clickable paths |

## Install

At the prompt of a Claude Code session, install either or both:

```text
/plugin install agent-digitama --marketplace boggylp/digital-world
/plugin install digi-theme --marketplace boggylp/digital-world
```

## Development

The plugins are npm workspaces under `plugins/`. Their unit tests live in `tests/<plugin>/` so the installed plugins ship without them.

```sh
npm install
npm test
npm run typecheck
```

## Releases

Each plugin has its own version, set only in its `.claude-plugin/plugin.json`. Claude Code updates an installed plugin only when that string changes.

To release a plugin:

1. Raise `version` in its `plugin.json`: patch for fixes, minor for new features, major for breaking changes.
2. Add the release to its `CHANGELOG.md`.
3. Land the change on `main`, then run `claude plugin tag --push` in the plugin folder. It creates a `<plugin>--v<version>` tag.

## License

The code is [MIT](LICENSE). It does not cover the sprites or the Digimon characters, whose owners [CREDITS.md](plugins/agent-digitama/CREDITS.md) names.
