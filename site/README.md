# Aphelion Wiki Site

Astro Starlight site for Aphelion workflow documentation (Cloudflare Pages deployment TBD).

## Development

```bash
cd site
node ../scripts/sync-wiki.mjs  # sync docs/wiki/*/*.md -> src/content/docs/*/*.md
npm run dev
```

Dev server starts at `http://localhost:4321`.

> Node.js 22 required (`site/.nvmrc`). If your host uses a different
> version or you hit WSL/Windows-npm path issues, use the Docker-based
> build described below.

## Docker-based build (optional)

Works on any host with Docker. Cloudflare Pages does not use these files
— they only exist to make local builds reproducible.

```bash
docker compose run --rm --service-ports site-dev      # hot-reload dev at http://localhost:4321
docker compose run --rm site-build                    # one-shot production build into site/dist
docker compose run --rm --service-ports site-preview  # preview built site at http://localhost:4321
```

> `--service-ports` is required so that the container's port 4321 is
> published on the host. Without it, Windows browsers cannot reach the
> server running inside WSL.

Or build an image directly with the multi-stage `site/Dockerfile`:

```bash
docker build -f site/Dockerfile --target build -t aphelion-site-build .
docker run --rm -v "$PWD/site/dist:/out" aphelion-site-build sh -c "cp -r /app/site/dist/. /out/"
```

## Build

```bash
cd site
npm ci
npm run build  # prebuild フックが sync-wiki.mjs を自動実行
```

手動でコンテンツ同期のみ行う場合:

```bash
cd site
npm run sync-wiki
```

Output: `site/dist/`

## Cloudflare Pages

| Item | Value |
|------|-------|
| Framework preset | Astro |
| Build command | `cd site && npm ci && npm run build` |
| Build output directory | `site/dist` |
| Root directory | `/` (repo root) |
| Node.js version | 22 |

## Directory Structure

```
site/
├── astro.config.mjs         # i18n, customCss configuration
├── package.json
├── tsconfig.json
├── public/                  # static assets directory (currently empty)
└── src/
    ├── content/
    │   ├── config.ts        # Starlight content collection definition
    │   └── docs/            # output target of sync-wiki.mjs
    │       ├── en/*.md      # synced from docs/wiki/en/
    │       └── ja/*.md      # synced from docs/wiki/ja/
    └── styles/
        └── custom.css       # accent CSS variables (light/dark)
```

## Related

- Wiki SSOT: `../docs/wiki/en/` and `../docs/wiki/ja/`
- Sync script: `../scripts/sync-wiki.mjs` (created by developer phase)
