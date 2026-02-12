# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Personal portfolio and journal site for Robel Estifanos ([robelestifanos.com](https://robelestifanos.com)), built with SvelteKit 2, Svelte 5, TypeScript, and Tailwind CSS v4. The site is statically generated (SSG) at build time and hosted via Convex self-hosting.

## Development Commands

- `bun run dev` - Start SvelteKit dev server. **Do not run this — it's handled manually by another process.**
- `bun run dev:convex` - Start Convex dev backend
- `bun run build` - Build static site to `build/`
- `bun run check` - Run svelte-check for type errors
- `bun run sync` - Sync journal markdown files to Convex dev
- `bun run sync:prod` - Sync journal markdown files to Convex production
- `bun run deploy:dev` - Build and upload to Convex dev (`giddy-koala-536.convex.site`)
- `bun run deploy` - Build and upload to Convex production (`quick-okapi-750.convex.site`)
- `bun run deploy:convex` - Deploy Convex backend functions to production

## Architecture

### Stack
- **Framework**: SvelteKit 2 with `@sveltejs/adapter-static` (pure SSG, no runtime server)
- **UI**: Svelte 5 with runes (`$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **Backend**: Convex (database, queries, file storage)
- **Reactivity**: `convex-svelte` for client-side reactive queries after hydration
- **Hosting**: Convex self-hosting (`@convex-dev/self-hosting`) — static files uploaded to Convex storage and served via `convex/http.ts`
- **Content**: Journal entries stored as markdown in `journal/`, synced to Convex via `scripts/sync.ts`

### Project Structure
- `src/` - SvelteKit application source
  - `app.css` - Global styles with Tailwind v4 imports and Rose Pine theme CSS variables
  - `app.html` - Document shell template
  - `app.d.ts` - SvelteKit type declarations
  - `lib/` - Shared library code
    - `components/` - Svelte components (Header, Footer, UpdateBanner, StarHeader, etc.)
    - `utils.ts` - General utility functions
    - `utils/date.ts` - Date formatting
    - `utils/markdown.ts` - Marked + KaTeX markdown renderer
  - `routes/` - SvelteKit file-based routes
    - `+layout.js` - Root layout config (`export const prerender = true`)
    - `+layout.svelte` - Root layout with Convex setup and UpdateBanner
    - `+page.svelte` - Home page
    - `journal/+page.svelte` - Journal list with tag filtering
    - `journal/[slug]/+page.svelte` - Journal entry detail with TOC and mermaid diagrams
- `convex/` - Convex backend
  - `http.ts` - HTTP handler serving static files with path resolution (exact -> /path/index.html -> /path.html -> 404)
  - `schema.ts` - Database schema
  - `journal.ts` - Journal query functions (list, getBySlug, listSlugs)
  - `staticHosting.ts` - Self-hosting deployment tracking
  - `convex.config.ts` - Convex config with self-hosting component
- `static/` - Static assets (favicons, images, robots.txt)
- `journal/` - Markdown source files for journal entries
- `scripts/sync.ts` - Script to sync journal markdown to Convex database

### Data Flow
1. **Build time**: `+page.server.ts` files use `ConvexHttpClient` to fetch data from Convex and bake it into static HTML
2. **Client-side**: After hydration, `convex-svelte`'s `useQuery` takes over with reactive subscriptions for live updates
3. **Deploy**: `vite build` prerenders all pages to `build/`, then `@convex-dev/self-hosting upload` pushes files to Convex storage

### Design System

**Rose Pine Theme** (CSS custom properties in `src/app.css`):
- `--color-th-base` - Background
- `--color-th-surface` - Surface/card backgrounds
- `--color-th-border` - Borders
- `--color-th-muted` - Muted/secondary text
- `--color-th-subtle` - Subtle text
- `--color-th-text` - Primary text
- `--color-th-accent` - Accent color
- `--color-th-accent-hover` - Accent hover state

Font: Newsreader / Crimson Pro via `var(--font-display)`.

### Deployments
- **Dev**: `giddy-koala-536.convex.site` (Convex URL: `giddy-koala-536.convex.cloud`)
- **Prod**: `quick-okapi-750.convex.site` (Convex URL: `gallant-squirrel-294.convex.cloud`)

## Development Guidelines

- Use `bun` (not npm/yarn) for all package management and script execution
- Maintain the Rose Pine color scheme using `th-*` CSS custom properties
- Use Svelte 5 runes syntax (`$state`, `$derived`, `$effect`, `$props`) — not legacy `let`/`export let`
- Keep the editorial/minimalist aesthetic with Ethiopian heritage influences
- Static assets go in `static/`, not `public/`
- When adding new routes, they are automatically prerendered (root layout sets `prerender = true`)
- Dynamic routes (like `[slug]`) need an `entries()` export in their `+page.server.ts` to enumerate all values at build time
- The upload tool is slow (~2 `npx convex run` calls per file). Run `upload` separately from `vite build` if the combined deploy script times out.
