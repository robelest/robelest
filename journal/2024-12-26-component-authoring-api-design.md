---
title: "Component Authoring: API Design Patterns for TypeScript Libraries"
slug: component-authoring-api-design
description: Opinionated patterns for authoring TypeScript components—builder APIs, nested exports, factory functions, and why tsdown won the build system battle.
tags:
  - typescript
  - api-design
  - convex-component
  - tsdown
  - builders
  - library-authoring
publishDate: 2024-12-26
published: true
category: technical
---

# Component Authoring: API Design Patterns for TypeScript Libraries

Building a library is fundamentally different from building an application. In an application, you control the entire context—the build system, the import structure, the runtime environment. In a library, you're a guest in someone else's house. Your code must work with their bundler, their TypeScript configuration, their framework opinions.

After shipping [Replicate](https://github.com/trestleinc/replicate), [Crane](/journal/crane-browser-automation), and [Bridge](/journal/bridge-reactive-data) as Convex components, patterns emerged. Not best practices from blog posts—patterns forged from production breakage, bundler incompatibilities, and developer experience complaints.

This is how we build component APIs.

---

# The API Design Philosophy

## Principle 1: Minimize Import Surface

Every import is a decision the user must make. Every decision is cognitive load. Every piece of cognitive load is friction that reduces adoption.

**Bad: Multiple imports for basic usage**

```typescript
import { ReplicateClient } from "@trestleinc/replicate/client";
import { ReplicateServer } from "@trestleinc/replicate/server";
import { schema } from "@trestleinc/replicate/schema";
import { defineCollection } from "@trestleinc/replicate/collection";
import type { Task } from "@trestleinc/replicate/types";
```

The user doesn't care about your internal architecture. They care about getting their job done.

**Good: Environment-scoped entry points**

```typescript
// Client code
import { collection } from "@trestleinc/replicate/client";

// Server code
import { replicate, schema } from "@trestleinc/replicate/server";

// Component config
import replicate from "@trestleinc/replicate/convex.config";
```

Three entry points. Client, server, config. That's it. Everything else is internal.

## Principle 2: Types Flow Downward

Users should never have to import types separately from the functions that use them. Types should be inferred from usage.

**Bad: Explicit type imports required**

```typescript
import { createTask, type Task, type TaskInput } from "@trestleinc/replicate";

const task: Task = createTask({ text: "..." } as TaskInput);
```

**Good: Types inferred from schema**

```typescript
import { schema, replicate } from "@trestleinc/replicate/server";

export default defineSchema({
  tasks: schema.table({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
});

// Type is inferred from schema definition
const r = replicate(components.replicate);
export const tasks = r.collection("tasks");
// tasks.insert() accepts { text: string, isCompleted: boolean }
```

The schema is the source of truth. Types derive from it. Users never write type annotations for library types.

## Principle 3: Errors at Definition Time, Not Runtime

If a configuration is invalid, it should fail when the code is written, not when the server starts.

**Bad: Runtime validation**

```typescript
const client = new ReplicateClient({
  collection: "tasks",
  compaction: { threshold: -1 }, // Invalid, but no error until runtime
});
```

**Good: TypeScript catches errors at compile time**

```typescript
const tasks = replicate(components.replicate).collection("tasks", {
  compaction: {
    threshold: -1, // TypeScript error: must be positive number
  },
});
```

This requires careful type design. Optional fields with defaults, discriminated unions for mutually exclusive options, branded types for constrained values. The work happens in your type definitions so users never see a runtime exception for configuration errors.

---

# The Builder Pattern

Builders are the cleanest way to construct complex objects with optional parameters. They're self-documenting—each method name describes what it does.

## Why Builders Beat Configuration Objects

Configuration objects require users to understand the entire schema upfront:

```typescript
// Configuration object: user must know all options
const blueprint = {
  name: "submit-intake",
  inputs: [
    { name: "portalUrl", type: "string", required: true },
    { name: "firstName", type: "string", required: true },
  ],
  tiles: [
    { type: "NAVIGATE", url: "{{portalUrl}}" },
    { type: "AUTH" },
    { type: "TYPE", instruction: "first name field", variable: "firstName" },
    { type: "CLICK", instruction: "submit button" },
  ],
};
```

Builders guide users through construction:

```typescript
// Builder: IDE guides through each step
const blueprint = new Builder("submit-intake")
  .input("portalUrl", "string", true)
  .input("firstName", "string", true)
  .navigate("{{portalUrl}}")
  .auth()
  .type("first name field", { variable: "firstName" })
  .click("submit button")
  .build();
```

With a builder:
- IDE autocomplete shows available methods
- Method signatures document the parameters
- Invalid sequences can be prevented by return types
- The final `.build()` call returns the immutable result

## Builder Implementation Pattern

```typescript
class Builder<TInputs extends Record<string, InputDef> = {}> {
  private readonly name: string;
  private readonly inputs: Map<string, InputDef> = new Map();
  private readonly tiles: Tile[] = [];

  constructor(name: string) {
    this.name = name;
  }

  input<K extends string, T extends InputType>(
    name: K,
    type: T,
    required: boolean = false
  ): Builder<TInputs & Record<K, InputDef<T>>> {
    this.inputs.set(name, { name, type, required });
    // Return new type that includes this input
    return this as Builder<TInputs & Record<K, InputDef<T>>>;
  }

  navigate(url: string): this {
    this.tiles.push({ type: "NAVIGATE", url });
    return this;
  }

  auth(): this {
    this.tiles.push({ type: "AUTH" });
    return this;
  }

  type(
    instruction: string,
    value: { literal: string } | { variable: keyof TInputs & string }
  ): this {
    this.tiles.push({ type: "TYPE", instruction, ...value });
    return this;
  }

  click(instruction: string): this {
    this.tiles.push({ type: "CLICK", instruction });
    return this;
  }

  build(): Blueprint<TInputs> {
    return {
      name: this.name,
      inputs: Object.fromEntries(this.inputs) as TInputs,
      tiles: [...this.tiles],
    };
  }
}
```

The key insight: **the builder's generic type parameter evolves as methods are called**. When you call `.input("firstName", "string", true)`, the return type gains knowledge of that input. Later, when you call `.type("...", { variable: "firstName" })`, TypeScript can verify that "firstName" is a valid variable name.

This is type-level programming in service of developer experience.

## Builder State Machines

For complex workflows, builders can enforce valid sequences:

```typescript
// State machine via return types
class FormBuilder<State extends "empty" | "hasFields" | "validated"> {
  addField(name: string): FormBuilder<"hasFields"> {
    // ...
    return this as unknown as FormBuilder<"hasFields">;
  }

  validate(): State extends "hasFields" ? FormBuilder<"validated"> : never {
    // ...
  }

  build(): State extends "validated" ? Form : never {
    // ...
  }
}

// Usage
new FormBuilder()
  .addField("name")
  .validate()  // OK: we have fields
  .build();    // OK: we've validated

new FormBuilder()
  .build();    // TypeScript error: cannot build empty form

new FormBuilder()
  .addField("name")
  .build();    // TypeScript error: must validate first
```

This pattern prevents entire classes of bugs. Users can't call methods in the wrong order because the types don't allow it.

---

# Nested API Exports

When your library has multiple related functions, group them logically. Users should be able to destructure what they need.

## The Factory Pattern

A factory function creates a configured instance that exposes related methods:

```typescript
// Server-side factory
export function replicate(component: ReplicateComponent) {
  return {
    collection<T extends DocumentType>(
      name: string,
      options?: CollectionOptions
    ) {
      return {
        stream: createStreamQuery(component, name),
        material: createMaterialQuery(component, name),
        insert: createInsertMutation(component, name),
        update: createUpdateMutation(component, name),
        remove: createRemoveMutation(component, name),
        recovery: createRecoveryQuery(component, name),
      };
    },
  };
}

// Usage
const r = replicate(components.replicate);
export const tasks = r.collection<Task>("tasks");

// Convex API becomes:
// api.tasks.stream
// api.tasks.insert
// api.tasks.update
// etc.
```

The factory pattern has several benefits:

1. **Single configuration point**: Component reference is passed once, not to every function
2. **Grouped exports**: Related functions live together in the API
3. **Type inference**: The collection's document type flows to all methods
4. **Extensibility**: New methods can be added without changing the call site

## Client-Side Collection Pattern

On the client, the pattern mirrors the server but focuses on reactive state:

```typescript
import { collection } from "@trestleinc/replicate/client";

export const tasksCollection = collection.create({
  name: "tasks",
  api: api.tasks,
  getKey: (task) => task.id,
});

// Usage in components
function TaskList() {
  const tasks = useLiveQuery(tasksCollection.query());

  const addTask = () => {
    tasksCollection.insert({
      id: crypto.randomUUID(),
      text: "New task",
      isCompleted: false,
    });
  };

  // ...
}
```

The collection object becomes the interface for all operations on that data type. No need to import separate hooks or functions.

## Namespace Pattern

For larger APIs, use TypeScript namespaces to group related functionality:

```typescript
// Internal organization
export namespace schema {
  export function table<T extends TableDefinition>(def: T) {
    return {
      ...def,
      _createdAt: v.number(),
      _updatedAt: v.number(),
      _version: v.number(),
    };
  }

  export function field<T extends FieldType>(type: T, options?: FieldOptions) {
    return { type, ...options };
  }
}

// Usage
import { schema } from "@trestleinc/replicate/server";

export default defineSchema({
  tasks: schema.table({
    text: schema.field("string", { indexed: true }),
    isCompleted: schema.field("boolean"),
  }),
});
```

Namespaces feel old-fashioned compared to ES modules, but they're perfect for grouping related utilities under a single import. The user imports `schema` once and gets access to all schema helpers via dot notation.

---

# The tsdown Decision

We tried three build systems before landing on tsdown. Each taught us what we actually needed.

## Phase 1: Pure tsc

TypeScript's built-in compiler is the simplest option:

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "module": "ESNext",
    "target": "ES2021"
  }
}
```

**Problems we hit:**

1. **No bundling**: Every source file becomes a dist file. Users import your internal structure.
2. **Dual ESM/CJS pain**: Separate tsconfig files, separate builds, separate package.json exports.
3. **Slow**: Full type-checking on every build, even when you just changed a comment.
4. **No tree-shaking**: Dead code stays in the bundle.

For a simple utility library, tsc is fine. For a component with multiple entry points and platform considerations, it's inadequate.

## Phase 2: Rslib (Rspack)

We moved to Rslib, built on Rspack (the Rust-based Webpack alternative):

```javascript
// rslib.config.js
export default {
  lib: [
    { format: "esm", syntax: "es2021" },
    { format: "cjs", syntax: "es2019" },
  ],
  output: {
    externals: ["yjs", "convex"],
  },
  dts: {
    bundle: true,
  },
};
```

**What worked:**
- Fast builds (Rust-based)
- Dual ESM/CJS output
- Proper externalization of peer dependencies
- Tree-shaking

**What didn't:**
- Complex configuration for multiple entry points
- DTS bundling was fragile
- Heavy dependency tree for what we needed

Rslib is excellent for applications. For libraries with specific .d.ts requirements, it was overkill.

## Phase 3: tsdown

tsdown is a minimal library bundler built on esbuild with first-class TypeScript declaration support:

```typescript
// tsdown.config.ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client/index.ts",
    server: "src/server/index.ts",
    "convex.config": "src/component/convex.config.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  external: ["convex", "yjs", "@tanstack/db"],
  treeshake: true,
});
```

**Why tsdown won:**

### 1. Declaration Files That Work

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

Each entry point gets its own declaration file. No manual splitting, no declaration bundling issues.

### 2. Multiple Entry Points Are First-Class

```typescript
entry: {
  index: "src/index.ts",
  client: "src/client/index.ts",
  server: "src/server/index.ts",
}
```

This maps directly to package.json exports:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./client": {
      "import": "./dist/client.js",
      "require": "./dist/client.cjs",
      "types": "./dist/client.d.ts"
    },
    "./server": {
      "import": "./dist/server.js",
      "require": "./dist/server.cjs",
      "types": "./dist/server.d.ts"
    }
  }
}
```

No gymnastics. The entry points you define become the exports your users import.

### 3. Externalization Just Works

```typescript
external: ["convex", "yjs", "@tanstack/db"]
```

Peer dependencies stay external. No bundled duplicates, no version conflicts. Users' bundlers resolve these from their own node_modules.

### 4. Fast Enough

tsdown uses esbuild under the hood. Builds complete in milliseconds, not seconds. Watch mode is instant.

### 5. Minimal Configuration

The entire config is ~15 lines. No plugins, no loaders, no complex chains. It does what library authors need and nothing more.

## The tsdown Pattern for Components

For Convex components specifically, this configuration works:

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    // Main entry (re-exports from client/server for convenience)
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

  // Externalize Convex and any other peer deps
  external: [
    "convex",
    "convex/server",
    "convex/values",
    /^@convex\//,
  ],

  // Tree-shake unused exports
  treeshake: true,

  // Source maps for debugging
  sourcemap: true,
});
```

---

# API Evolution Lessons

## Start Verbose, Then Simplify

Early APIs should be explicit. You can always add convenience methods later; removing complexity is harder.

**Version 0.1: Explicit everything**

```typescript
const r = replicate<DataModel>(components.replicate, internal);
export const stream = r.stream("tasks");
export const material = r.material("tasks");
export const insert = r.insert("tasks");
export const update = r.update("tasks");
export const remove = r.remove("tasks");
```

**Version 1.0: Factory pattern**

```typescript
const r = replicate(components.replicate);
export const tasks = r.collection("tasks");
// Exports: tasks.stream, tasks.insert, etc.
```

The verbose version taught us which operations users actually needed. The factory version emerged from patterns of use.

## Defaults Should Be Aggressive

If 90% of users want the same configuration, make it the default. Don't make them specify it.

**Bad: Required configuration for common case**

```typescript
const tasks = replicate(components.replicate).collection("tasks", {
  compaction: { enabled: true, threshold: 5_000_000 },
  versioning: { enabled: true },
  timestamps: { enabled: true },
});
```

**Good: Sensible defaults, override when needed**

```typescript
// Defaults: compaction enabled at 5MB, versioning on, timestamps on
const tasks = replicate(components.replicate).collection("tasks");

// Override only what you need
const logs = replicate(components.replicate).collection("logs", {
  compaction: { threshold: 50_000_000 }, // Higher threshold for logs
});
```

The goal is zero configuration for the common case.

## Breaking Changes Should Be Obvious

When you must break compatibility, make it impossible to miss:

```typescript
// Version 1.x
export function replicate(component) { ... }

// Version 2.0: Function signature changed
export function replicate(component, options) { ... }  // BAD: silent breakage

// Better: New function name
export function createReplicate(component, options) { ... }

// Best: Factory that guides migration
export const replicate = {
  /** @deprecated Use replicate.create() */
  (component: Component) { ... },

  create(component: Component, options?: Options) { ... }
};
```

TypeScript's deprecation warnings help, but nothing beats a clear rename for major changes.

---

# The Schema Helper Pattern

One pattern that emerged across all our components: schema helpers that inject required fields.

## The Problem

Convex components need specific fields for internal operation. Users shouldn't have to remember them:

```typescript
// Without helper: user must add internal fields
export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    // Required for replicate:
    _version: v.number(),
    _createdAt: v.number(),
    _updatedAt: v.number(),
    _crdtBytes: v.optional(v.bytes()),
  }),
});
```

This is error-prone. Forget a field and you get runtime errors.

## The Solution

A schema helper that auto-injects required fields:

```typescript
// In your library
export const schema = {
  table<T extends Record<string, Validator>>(fields: T) {
    return defineTable({
      ...fields,
      _version: v.number(),
      _createdAt: v.number(),
      _updatedAt: v.number(),
      _crdtBytes: v.optional(v.bytes()),
    }).index("by_version", ["_version"]);
  },
};

// User code: clean and focused
import { schema } from "@trestleinc/replicate/server";

export default defineSchema({
  tasks: schema.table({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
});
```

The user defines business logic. The library handles infrastructure.

## Implementation Details

```typescript
import { defineTable, type TableDefinition } from "convex/server";
import { v, type Validator } from "convex/values";

type InternalFields = {
  _version: Validator<number>;
  _createdAt: Validator<number>;
  _updatedAt: Validator<number>;
  _crdtBytes: Validator<ArrayBuffer | undefined>;
};

export const schema = {
  table<T extends Record<string, Validator>>(
    fields: T
  ): TableDefinition<T & InternalFields> {
    const withInternal = {
      ...fields,
      _version: v.number(),
      _createdAt: v.number(),
      _updatedAt: v.number(),
      _crdtBytes: v.optional(v.bytes()),
    };

    return defineTable(withInternal)
      .index("by_version", ["_version"])
      .index("by_created", ["_createdAt"]);
  },
};
```

The return type includes both user fields and internal fields, so TypeScript knows the full schema.

---

# Error Messages Matter

When something goes wrong, the error message is your documentation.

## Bad: Generic Errors

```typescript
throw new Error("Invalid configuration");
```

The user has no idea what's wrong or how to fix it.

## Good: Specific, Actionable Errors

```typescript
throw new Error(
  `Collection "${name}" not found in schema.\n\n` +
  `Available collections: ${available.join(", ")}\n\n` +
  `Make sure you've defined this collection using schema.table() in your schema.ts:\n\n` +
  `  import { schema } from "@trestleinc/replicate/server";\n\n` +
  `  export default defineSchema({\n` +
  `    ${name}: schema.table({ ... }),\n` +
  `  });`
);
```

Include:
1. What went wrong
2. The context (which collection, what value)
3. What options are available
4. How to fix it with example code

## Pattern: Error Factories

```typescript
const errors = {
  collectionNotFound(name: string, available: string[]) {
    return new Error(
      `Collection "${name}" not found.\n` +
      `Available: ${available.join(", ")}`
    );
  },

  invalidThreshold(value: number) {
    return new Error(
      `Compaction threshold must be positive, got: ${value}`
    );
  },

  missingComponent() {
    return new Error(
      `Replicate component not mounted.\n\n` +
      `Add to convex/convex.config.ts:\n\n` +
      `  import replicate from "@trestleinc/replicate/convex.config";\n` +
      `  app.use(replicate);`
    );
  },
};
```

Centralized error messages are easier to maintain and test.

---

# Conclusion

Component authoring is API design for developers. The patterns that work:

1. **Minimize imports** - Three entry points: client, server, config
2. **Types flow downward** - Infer from schemas, don't require explicit type imports
3. **Builders for complex construction** - Guide users through valid configurations
4. **Factories for grouped operations** - Related functions live together
5. **tsdown for the build** - Clean declarations, multiple entry points, minimal config
6. **Schema helpers inject internals** - Users focus on business logic
7. **Errors are documentation** - Specific, actionable, with examples

The goal is invisible infrastructure. Users should think about their product, not your library's architecture.

When someone installs your component, adds one line to their config, and starts building features immediately—that's the bar.

---

# Resources

| Resource | Description |
|----------|-------------|
| [tsdown](https://github.com/nicksrandall/tsdown) | Minimal TypeScript library bundler |
| [Convex Components Guide](https://docs.convex.dev/components) | Official component authoring docs |
| [Replicate](https://github.com/trestleinc/replicate) | Reference implementation of these patterns |
| [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) | For builder type patterns |
| [Package.json exports](https://nodejs.org/api/packages.html#exports) | Modern entry point configuration |

---

*Built at [Trestle](https://trestle.com)—software that amplifies human compassion.*
