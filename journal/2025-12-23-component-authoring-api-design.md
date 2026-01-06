---
title: "Component Authoring: The API Design Journey"
slug: component-authoring-api-design
description: How we evolved the API design and build system for Trestle's Convex components—from reverse-engineering undocumented patterns to shipping before the official docs existed.
tags:
  - components
  - architecture
publishDate: 2025-12-23
published: false 
---

# Component Authoring: The API Design Journey

We shipped Replicate 1.0.0 before Convex publicly released their component authoring documentation. That single fact shaped everything about how we approach library design.

When you're building in the dark, you can't copy best practices from a guide. You reverse-engineer from examples, cargo-cult from working code, and learn the hard way which patterns survive production. The lessons that emerged weren't abstract principles—they were scars from broken builds, bundler incompatibilities, and APIs that made developers curse our names.

This is the story of how we built component APIs at Trestle.

---

# The Pre-Public Challenge

In late 2024, Convex announced components—self-contained modules with isolated tables and clean composition. The R2 storage component was one of the examples. But the authoring guide wasn't public yet.

We wanted Replicate to be a *proper* component. Not a library. Not copy-paste code. A real component that developers could install with `bun add` and mount with `app.use()`.

So we reverse-engineered it.

The process was ugly:

1. Clone the Convex R2 component example
2. Study file structure and configuration patterns
3. Strip R2-specific code, insert our CRDT sync logic
4. Regenerate the build system through trial and error
5. Test by mounting in a real application

This was before `npx convex codegen --component-dir` was documented. Before the authoring guide explained the `convex.config.ts` anatomy. We were guessing and praying.

The payoff was worth it. When Convex did release component authoring publicly, Replicate was already compatible. We'd guessed correctly on the patterns that would become standard.

But we'd also learned something more valuable: when you build without guardrails, you discover which constraints actually matter.

---

# The Build System Journey

The build tooling went through three phases. Each taught us something about the trade-offs in TypeScript library development.

## Phase 1: Pure tsc

We started with TypeScript's built-in compiler. Simple and correct, but:

- **Slow**: Full type-checking on every build
- **No bundling**: Outputs many small files
- **No optimization**: No tree-shaking, no minification
- **Dual output pain**: ESM and CJS required separate configs

For a simple utility library, tsc is fine. For a component with multiple entry points and platform considerations, it's inadequate.

## Phase 2: Rslib

We moved to Rslib (built on Rspack) for proper bundling:

```
142d04b: feat: migrate core to Rslib and externalize Automerge as peer dependency
```

Benefits were immediate:
- **Fast**: Rspack is significantly faster than Webpack
- **Dual ESM/CJS**: Native support for both module formats
- **Tree-shaking**: Dead code elimination
- **Externalization**: Peer dependencies excluded from bundle

But Rslib is designed for applications. For libraries with specific `.d.ts` requirements, it was overkill. The configuration kept growing. DTS bundling was fragile.

## Phase 3: tsdown

Eventually we landed on tsdown—a minimal library bundler built on esbuild with first-class TypeScript declaration support:

```
7d9dbbd: refactor: migrate to tsdown and simplify convexCollectionOptions API
```

Why tsdown won:

**1. Declaration Files That Work**

Convex components require `.d.ts` files that match the exact export structure. Many bundlers mangle declarations or skip them entirely. tsdown generates clean, accurate declarations by design.

```
dist/
├── index.js
├── index.d.ts       # Types for main entry
├── client.js
├── client.d.ts      # Types for client entry
├── server.js
├── server.d.ts      # Types for server entry
└── convex.config.js
```

**2. Multiple Entry Points Are First-Class**

```typescript
entry: {
  index: "src/index.ts",
  client: "src/client/index.ts",
  server: "src/server/index.ts",
}
```

This maps directly to package.json exports. No gymnastics.

**3. Minimal Configuration**

The entire config is ~15 lines. No plugins, no loaders. It does what library authors need and nothing more.

The lesson: start simple (tsc), add complexity when needed (rslib), then simplify when you understand your requirements (tsdown).

---

# The API Evolution

One of the less visible but most important journeys was the API design. Early versions required developers to understand Convex's type system, component internals, and the CRDT layer. By version 1.1.0, the surface area had shrunk dramatically.

## The Early Days: Type System Gymnastics

The original API required significant boilerplate:

```typescript
// Early version: lots of manual wiring
import { replicate } from "@trestleinc/replicate/server";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

// User had to understand the type system
const r = replicate<DataModel>(components.replicate, internal);

// Explicit function exports
export const stream = r.stream("tasks");
export const material = r.material("tasks");
export const insert = r.insert("tasks");
export const update = r.update("tasks");
export const remove = r.remove("tasks");

// Wire up compaction manually
export const compact = r.compact("tasks", { threshold: 5_000_000 });
```

This worked, but required developers to:
- Import from `_generated` (internal knowledge)
- Understand the type parameter threading
- Export each function individually
- Configure compaction separately

Developers cursed us. Rightfully.

## The Nested Object Pattern

We refactored to return nested objects:

```
dae9314: feat: refactor API to nested object pattern
```

```typescript
// Nested objects: grouped by concern
export const tasks = replicate(components.replicate)<Task>({
  collection: "tasks",
  compaction: { threshold: 5_000_000 },
});

// Usage: api.tasks.stream, api.tasks.insert, etc.
```

Better. One function call, grouped exports. But still verbose.

## The collection.create() API

The current API uses a clean creation pattern:

```
2b76731: feat: add SSR material prefetch and refactor collection.create() API
```

```typescript
// convex/schema.ts
import { schema } from "@trestleinc/replicate/server";

export default defineSchema({
  tasks: schema.table({
    id: v.string(),
    text: v.string(),
    isCompleted: v.boolean(),
  }),
});

// convex/tasks.ts
import { replicate } from "@trestleinc/replicate/server";

export const tasks = replicate(components.replicate).collection("tasks");
```

And on the client:

```typescript
import { collection } from "@trestleinc/replicate/client";

const tasks = collection.create({
  api: api.tasks,
  getKey: (task) => task.id,
});

// Usage
tasks.insert({ id: uuid(), text: "New task", isCompleted: false });
tasks.update(id, (draft) => { draft.isCompleted = true });
tasks.delete(id);
```

The evolution prioritized:
- **Fewer imports** - Don't make users import from generated files
- **Type inference** - Let TypeScript do the work
- **Familiar patterns** - TanStack-style APIs that developers recognize

---

# Minimizing Public API Surface

A turning point came when we realized: every export is a commitment.

```
a9b7782: refactor: minimize public API surface and rename ack to mark
```

This commit was about more than renaming `ack` to `mark`. It was about asking: what do users actually need?

The answer was less than we thought.

**Before**: 15+ exports from the server package
**After**: 3 exports—`replicate`, `schema`, and the component config

Everything else became internal. If users don't need it, don't expose it. If you expose it, you're promising to maintain it forever.

The hardest part was deleting things that "might be useful someday." Someday never comes. What comes is the support ticket asking why the undocumented function changed between versions.

---

# Pattern Propagation

The patterns we developed in Replicate didn't stay there. When we built Bridge (reactive data binding for forms) and Crane (browser automation), we had a decision: start fresh or reuse?

We chose reuse.

```
81fd121: refactor: remove BridgeClient class, match replicate pattern
```

This commit in Bridge tells the story. We had built a `BridgeClient` class—because that's what the original design called for. Then we looked at Replicate's factory pattern and realized: the class was unnecessary ceremony.

The factory pattern won:

```typescript
// Replicate pattern
const r = replicate(components.replicate);
export const tasks = r.collection("tasks");

// Bridge adopted it
const b = bridge(components.bridge);
export const intakes = b.deliverable("intakes");

// Crane adopted it
const c = crane(components.crane);
export const blueprints = c.blueprint("submit-form");
```

Same structure. Same mental model. Same imports pattern (`/client`, `/server`, `/convex.config`).

When a developer learns one Trestle component, they've learned all of them. That's not accident—it's the result of propagating patterns that work.

---

# Package Consolidation

Early on, we had multiple packages:

- `@trestleinc/convex-replicate-component` - The Convex component
- `@trestleinc/convex-replicate-core` - Client utilities
- `@trestleinc/convex-replicate-react` - React bindings

Three packages meant three versions to track, three changelogs to maintain, three npm publishes to coordinate. It was a nightmare.

```
480da8f: refactor!: merge component and core packages into unified @trestleinc/replicate
05e7eae: refactor: flatten monorepo structure (packages/replicate → root)
```

These commits marked the consolidation: one package, multiple entry points.

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./client": "./dist/client.js",
    "./server": "./dist/server.js",
    "./convex.config": "./dist/convex.config.js"
  }
}
```

One install. One version. Clean entry points for different contexts.

The monorepo structure still exists in the repository (for examples and illustrations), but the published package is unified. Developers don't need to care about our internal organization.

---

# What We Learned

After shipping three components, each with their own API evolution, here's what stuck:

## Minimize Import Surface

Every import is a decision the user must make. Every decision is cognitive load. Every piece of cognitive load is friction.

Three entry points: client, server, config. That's it. Everything else is internal.

## Types Flow Downward

Users should never import types separately from the functions that use them. Types should be inferred from usage.

The schema is the source of truth. Types derive from it. Users never write type annotations for library types.

## Errors at Definition Time

If a configuration is invalid, it should fail when the code is written, not when the server starts.

This requires careful type design—optional fields with defaults, discriminated unions for mutually exclusive options, branded types for constrained values. The work happens in your type definitions so users never see a runtime exception for configuration errors.

## Start Verbose, Then Simplify

Early APIs should be explicit. You can always add convenience methods later; removing complexity is harder.

Our verbose v0.1 taught us which operations users actually needed. The factory pattern emerged from patterns of use.

## Defaults Should Be Aggressive

If 90% of users want the same configuration, make it the default.

Compaction enabled at 5MB? Default. Versioning on? Default. Timestamps on? Default.

Zero configuration for the common case. Escape hatches for the edge cases.

---

# The tsdown Pattern for Components

For anyone building Convex components, this configuration works:

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    // Main entry (re-exports for convenience)
    index: "src/index.ts",

    // Environment-specific entries
    client: "src/client/index.ts",
    server: "src/server/index.ts",

    // Convex component configuration
    "convex.config": "src/component/convex.config.ts",
  },

  format: ["esm", "cjs"],
  dts: true,
  clean: true,

  // Externalize Convex and peer deps
  external: [
    "convex",
    "convex/server",
    "convex/values",
    /^@convex\//,
  ],

  treeshake: true,
  sourcemap: true,
});
```

Each entry point gets its own declaration file. No manual splitting, no declaration bundling issues. The entry points you define become the exports your users import.

---

# The Goal

Component authoring is API design for developers. When someone installs your component, adds one line to their config, and starts building features immediately—that's the bar.

The goal is invisible infrastructure. Users should think about their product, not your library's architecture.

Everything else is implementation detail.

---

# Resources

| Resource | Description |
|----------|-------------|
| [tsdown](https://github.com/nicksrandall/tsdown) | Minimal TypeScript library bundler |
| [Convex Components Guide](https://docs.convex.dev/components) | Official component authoring docs |
| [Replicate](https://github.com/trestleinc/replicate) | Reference implementation of these patterns |
| [Package.json exports](https://nodejs.org/api/packages.html#exports) | Modern entry point configuration |

---

*Built at [Trestle](https://trestle.com)—software that amplifies human compassion.*
