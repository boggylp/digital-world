# digital-world

Digimon Adventure flavored mods for Claude Code. One marketplace holds both.

| Plugin | What it does |
| --- | --- |
| [agent-digitama](plugins/agent-digitama/README.md) | A pixel partner above the prompt that hatches and digivolves as the context window fills |
| [digivice](plugins/digivice/README.md) | A watercolor-sky look with charts, flow graphs, inline images and clickable paths |

## Install

At the prompt of a Claude Code session, install either or both:

```text
/plugin install agent-digitama --marketplace boggylp/digital-world
/plugin install digivice --marketplace boggylp/digital-world
```

## Development

The plugins are npm workspaces under `plugins/`.

```sh
npm install
npm test
npm run typecheck
```

## License

The code is [MIT](LICENSE). It does not cover the sprites or the Digimon characters, whose owners [CREDITS.md](plugins/agent-digitama/CREDITS.md) names.
