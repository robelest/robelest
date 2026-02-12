# robelestifanos.com

Personal portfolio and journal site for Robel Estifanos. Built with SvelteKit 2, Svelte 5, TypeScript, and Tailwind CSS v4. Statically generated at build time and hosted entirely on Convex.

## Tech Stack

- **Framework**: SvelteKit 2 with `adapter-static` (SSG)
- **UI**: Svelte 5 (runes), Tailwind CSS v4
- **Backend**: Convex (database, file storage, hosting)
- **Content**: Journal entries as markdown in `journal/`, compiled to PDFs via Typst, synced to Convex
- **Reactivity**: `convex-svelte` for live client-side query subscriptions after hydration

## Prerequisites

- [Bun](https://bun.sh) (package manager and runtime)
- [Typst](https://typst.app) CLI (for PDF compilation during sync)
- Convex account with dev and prod deployments configured

## Setup

```sh
bun install
cp .env.example .env.local  # configure CONVEX_DEPLOYMENT and PUBLIC_CONVEX_URL
```

## Development

```sh
bun run dev:convex  # start Convex dev backend (watches convex/ for changes)
bun run dev         # start SvelteKit dev server
```

## Deployment

Full pipeline: sync journal content to Convex, build static site, upload to Convex storage.

```sh
bun run deploy:dev  # sync + build + upload to dev
bun run deploy      # sync + build + upload to production
```

Individual steps if needed:

```sh
bun run sync        # sync journal markdown + PDFs to Convex dev
bun run sync:prod   # sync journal markdown + PDFs to Convex production
bun run build       # build static site to build/
bun run deploy:convex  # deploy Convex backend functions to production
```

## Project Structure

```
src/           SvelteKit app (routes, components, styles)
convex/        Convex backend (schema, queries, http handler, self-hosting)
journal/       Markdown source files for journal entries
scripts/       Sync script (markdown -> Convex + Typst -> PDF)
static/        Static assets (favicons, images)
```
