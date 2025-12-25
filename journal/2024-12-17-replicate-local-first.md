---
title: "Building Replicate: An Engineering Journey Through Local-First Sync"
slug: replicate-local-first
description: The story of building an offline-first sync engine for Convex—from RxDB experiments to Yjs CRDTs, the Loro exploration, and the cursor problem that nearly broke everything.
tags:
  - replicate
  - offline-first
  - crdt
  - sync
  - convex
  - convex-component
  - engineering
  - local-first
publishDate: 2024-12-17
published: true
category: technical
---

# Building Replicate: An Engineering Journey Through Local-First Sync

Francis had been using Linear and Superhuman religiously, and he wanted our pre-launch product to have that same buttery-smooth, instant-everything feel. No spinners. No lag. Just pure speed.

The thing is, I'd never built a true sync engine for a web application. My only reference point was a Go CLI I'd written to sync markdown notes to my VPS. But with no users yet and a completely green field, we had the rare opportunity to get the architecture right from day one.

Unfortunately, we didn't start on day one. Our core application, Ledger, was originally being built with Replicache for sync, but as our timelines sped up for investors and partners, sync had to be sacrificed for the v1 release. We shipped without it, knowing we'd need to come back to this problem.

Francis's mandate was clear: when we do build sync, it needs to feel like Linear. Instant. Offline-capable. No compromises.

---

# The Local-First Manifesto

Before diving into the engineering, it's worth understanding why local-first matters—not just technically, but philosophically.

In 2019, Ink & Switch published what has become the defining essay on local-first software. Their core observation: cloud apps like Google Docs and Trello are popular because they enable collaboration, but they take away ownership and agency from users. If a service shuts down, your data goes with it.

They proposed seven ideals for local-first software:

1. **No spinners** - Work happens instantly, on your device
2. **Your work is not hostage to a server** - Data lives locally first
3. **The network is optional** - Full functionality offline
4. **Seamless collaboration** - Multiple users, no conflicts
5. **The Long Now** - Your data outlives any company
6. **Security and privacy by default** - You control access
7. **You retain ownership** - Export, migrate, delete freely

Reading this, I realized local-first isn't just a technical architecture—it's a user rights issue. And for Trestle, it's even more fundamental.

## The Trestle Context

At Trestle, we build software for human services organizations. Our users—case workers, intake specialists, field staff—often work in environments with unreliable connectivity:

- **Shelters** with overloaded WiFi serving hundreds of people
- **Client homes** in rural areas with no cellular coverage
- **Community centers** with spotty public networks
- **Field visits** to remote locations

When a worker spends 30 minutes completing an intake form and hits "Save" only to see a network error, that's not just frustrating—it's potentially hours of lost work and a client who has to repeat their trauma. For vulnerable populations, being asked to tell their story twice isn't just inconvenient; it's re-traumatizing.

This isn't hypothetical. We've heard these stories from our partners. Data that can't be lost. Forms that must work everywhere. Sync that happens when it can, not when you demand it.

**We needed:**
- Forms that save locally, always
- Automatic sync when connectivity returns
- No conflicts when multiple workers touch the same record
- Complete audit trail for compliance

The local-first ideals weren't academic principles for us—they were product requirements.

---

# Understanding the Problem Space

## Sync Engines vs Local-First

The terms "sync engine" and "local-first" get thrown around interchangeably, but they're not the same thing at all.

**Sync engines** are the WebSocket and reactive layer that keeps data flowing between client and server in real-time. Think of Convex's reactive subscriptions, Firebase's real-time database, or Zero Sync's automatic synchronization. These handle the *plumbing* of real-time data transport.

**Local-first** is an architectural philosophy where the user's device is the source of truth. Your app works offline, changes sync when connected, and most importantly, you need to handle *conflict resolution* when multiple clients make diverging changes offline.

Here's the key insight: **sync engines give you the transport layer. Local-first requires you to solve the hard problem of merging conflicting changes.**

Convex already gives us an excellent sync engine. Reactive queries, optimistic updates, WebSocket connections with automatic reconnection. What it doesn't give us out of the box is: what happens when User A and User B both edit the same document offline, then both come online?

## The Conflict Resolution Trilemma

When users edit data offline and sync later, conflicts are inevitable. User A changes a document's title while offline. User B changes the same document's status while offline. Both sync back to the server. What happens?

There are three main approaches:

### Last-Write-Wins (LWW)

The simplest approach: timestamp every change, and the most recent one wins.

```
User A (offline): title = "Meeting Notes" at 10:00:01
User B (offline): title = "Standup Notes" at 10:00:02

Result: "Standup Notes" wins, User A's change is silently lost
```

Simple to implement, but you lose data. User A's edit evaporates without warning. Great for simple use cases, unacceptable for collaborative editing or data that matters.

### Operational Transformation (OT)

Used by Google Docs and other real-time editors. Transform operations based on what other users have done. If User A inserts "hello" at position 5, and User B inserts "world" at position 3, OT transforms these operations so both edits survive in the correct order.

Powerful but incredibly complex. Order matters, and getting it wrong means data corruption. The algorithms are notoriously difficult to implement correctly—Google's Wave team famously struggled with OT bugs. And OT typically requires a central server to establish operation ordering, which breaks the local-first model.

### CRDTs (Conflict-free Replicated Data Types)

The mathematical approach. CRDTs guarantee that any two replicas that have seen the same set of updates will converge to the same state, regardless of the order those updates arrived. No central authority needed. No complex transformation logic. Just math that works.

**Key CRDT Properties:**
- **Commutative** - Order of operations doesn't matter: A + B = B + A
- **Associative** - Grouping doesn't matter: (A + B) + C = A + (B + C)
- **Idempotent** - Duplicates are safe: A + A = A

This means any device can apply any changes in any order and reach the same final state. It's almost magical when you first see it work.

The CRDT space has several major players:
- **Yjs**: Optimized for text editing, pure JavaScript, battle-tested
- **Automerge**: Optimized for JSON-like structured data, WASM-based
- **Loro**: Rust-first with WASM bindings, advanced algorithms

For our use case—structured documents in a collaborative environment with React Native as a target—the choice would become clear, but not before we learned some expensive lessons.

---

# The Landscape Exploration

Before writing a single line of code, I spent weeks understanding what I was actually building. The local-first space is littered with failed attempts and pivoted projects. I wanted to learn from them.

## ElectricSQL: The Rich-CRDT Pioneers

ElectricSQL caught my attention because they'd been through the full evolution of local-first architecture. They had two distinct approaches, and understanding both taught me crucial lessons about scope and complexity.

### The Legacy Architecture: Vaxine and Rich-CRDTs (2022-2024)

ElectricSQL's original vision was ambitious: bring the full power of PostgreSQL to the client with automatic conflict resolution. They built on **Vaxine**, a Rich-CRDT database based on **AntidoteDB**—an Erlang-based, planet-scale transactional database built on CRDT technology.

AntidoteDB itself has an impressive pedigree. It emerged from the SyncFree European research project and the follow-up LightKone project. The core team included researchers who literally invented CRDTs—Marc Shapiro, Nuno Preguiça, Carlos Baquero. This wasn't amateur hour.

**What made Rich-CRDTs "rich"?**

Standard CRDTs handle data type conflicts (concurrent edits to the same field), but they don't handle database-level constraints. What happens when:
- User A deletes a parent record while User B adds a child that references it?
- Two users both try to claim the last available ticket?
- A uniqueness constraint is violated by concurrent inserts?

Rich-CRDTs extended basic CRDTs with three key mechanisms:

**1. Compensations**

When a constraint violation is detected during merge, compensations automatically "undo" the violating operation and apply a corrective action. Think of it like a database trigger that fires during CRDT merge.

```erlang
% Pseudocode for compensation
on_merge(Operation) ->
    case check_constraints(Operation) of
        ok -> apply(Operation);
        {violation, Type} -> 
            compensate(Type, Operation),
            log_compensation(Operation)
    end.
```

For referential integrity, if a parent is deleted while a child still references it, the compensation might:
- Cascade delete the child (dangerous)
- Reassign the child to a "tombstone" parent (safer)
- Reject the delete and resurrect the parent (safest but surprising)

**2. Reservations**

Reservations solve the "last ticket" problem using an escrow pattern. Before going offline, a client can reserve constraint "slots" that guarantee their operations will succeed.

```
Online: Client A reserves 5 "available slots" for unique usernames
Offline: Client A creates 3 users with unique usernames
Sync: Server validates against reservation, accepts all 3
```

This is similar to how distributed systems handle inventory: pre-allocate stock to regions so each region can sell locally without coordination.

**3. Shadow Tables**

Vaxine used "shadow tables" to track the CRDT state alongside regular Postgres tables. Every table had a corresponding shadow table storing:
- Operation history for each row
- Vector clocks for causality tracking
- Tombstones for deleted records

PostgreSQL's logical replication (WAL + LSN) synced changes between the server and client SQLite databases.

### Why They Abandoned It

In July 2024, ElectricSQL announced "Electric Next"—a complete architectural pivot. The Rich-CRDT approach was gone, replaced by HTTP streaming with "shapes" (subsets of data that sync incrementally).

The reasons were instructive:

1. **Complexity explosion**: Rich-CRDTs required understanding both CRDT semantics AND relational database semantics. The intersection created edge cases that were hard to reason about and harder to debug.

2. **Performance overhead**: Shadow tables doubled storage requirements. Every write triggered CRDT operations plus Postgres operations plus replication.

3. **Developer experience**: Explaining compensations and reservations to developers who just wanted offline forms was a non-starter. The abstraction leaked constantly.

4. **Client-side Postgres is heavy**: Running SQLite with Postgres-compatible CRDT extensions on every client device added significant bundle size and complexity.

James Arthur (ElectricSQL CEO) wrote candidly about the pivot: the original architecture tried to solve too many problems at once. The new architecture focused on one thing—efficient data streaming from Postgres to clients—and let developers handle conflict resolution in application code.

### The Insight I Kept

Buried in ElectricSQL's legacy architecture was the key insight I needed: **the replication table pattern**.

PostgreSQL's logical replication uses a Write-Ahead Log (WAL) with LSN (Log Sequence Number) offsets. Changes are stored with monotonic identifiers. Clients track their position and request changes since their last checkpoint.

```sql
-- Simplified replication table pattern
CREATE TABLE replication_log (
    lsn BIGSERIAL PRIMARY KEY,
    table_name TEXT,
    operation TEXT,  -- INSERT, UPDATE, DELETE
    row_data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Client sync query
SELECT * FROM replication_log 
WHERE lsn > $client_last_lsn 
ORDER BY lsn;
```

This pattern is elegant:
1. **Replication table** - Stores changes with sequential identifiers
2. **Checkpoint-based sync** - Clients track position, request changes since checkpoint
3. **Time-ordered index** - Enables efficient incremental sync

The insight was: **adapt this pattern for Convex and add CRDTs for conflict resolution**. Don't try to bring all of Postgres's constraint semantics—just bring the replication table pattern.

While I liked Electric's streaming architecture, I didn't like the HTTP request experience. I wanted a clean WebSocket experience for an instant-feeling application. Convex already provides that.

## PowerSync: Production-Ready but Painful

PowerSync was the other major player I evaluated. Production-ready, established companies using it at scale, PostgreSQL logical replication to SQLite on every device.

But the developer experience was frustrating. Their authentication model required either a dedicated endpoint or static key pairs for JWT generation. Their write path required constant HTTP requests to a catch-all endpoint. After days of wrestling with their patterns, I realized we'd be fighting their opinions at every turn.

The lesson: production-readiness doesn't mean production-pleasant.

## Zero by Rocicorp

Zero deserves special mention. Aaron Boodman and the Rocicorp team have been thinking about sync engines longer than almost anyone. Their thesis is compelling: put a sync engine in front of your database and distribute your backend all the way to the main thread of the UI.

Their architecture is elegant—hybrid queries that span client and server, automatic caching, incremental sync. But Zero is its own stack, and we were already committed to Convex. The patterns were instructive even if we couldn't adopt them directly.

From Zero, I learned that the user experience problem and the developer implementation problem are two sides of the same coin. Users expect instant, offline-capable, conflict-free software because that's what native apps trained them to expect. Developers struggle to build it because the primitives are scattered across different libraries and paradigms.

## The Exploration's Conclusion

By the end of my research, I had clarity:

1. **We need a sync engine** (WebSocket/reactive layer) → Convex already gives us this
2. **We need conflict resolution** (CRDTs) → We'll need to build this
3. **We need efficient queries** (server-side) → Can't query CRDT bytes directly
4. **We need local persistence** (offline) → IndexedDB/SQLite for the client

The question was: how do we combine these without the complexity that killed ElectricSQL's first attempt?

---

# The RxDB Gamble

In mid-September, I started this repository with what seemed like a brilliant idea: be unopinionated.

## The "Flexibility" Philosophy

RxDB is a popular local-first database for JavaScript. It's designed to work with multiple storage backends, multiple sync protocols, and multiple conflict resolution strategies. The idea is beautiful: let developers choose what works for their use case.

My thinking was:
- Use RxDB for local storage and conflict resolution flexibility
- Use TanStack DB for reactive queries over that data
- Use Convex WebSockets for the sync transport layer
- Let developers plug in their own conflict resolution if they want

This would be the Swiss Army knife of sync solutions. Flexible, powerful, unopinionated.

## 34 Commits of Fighting Reality

The git history tells a brutal story. Over the next several weeks, I created 34 commits trying to make RxDB work with our stack:

```
5c23773: "Implement hybrid RxDB + Convex WebSocket architecture (WIP)"
c163699: "Fix RxDB replication errors and improve real-time sync"
f76980d: "Simplify RxDB replication to fix WebSocket sync issues"
702a5aa: "Fix: resolve all memory leaks and cleanup race conditions"
```

The problems kept mounting:

**Memory Leaks**: RxDB's replication protocol wasn't cleaning up subscriptions properly when working with Convex's reactive queries. Every page navigation leaked observers.

**Bundle Size**: RxDB brought its own WASM modules and IndexedDB adapters, adding significant weight to our client bundle. For a library meant to make things simple, it came with a lot of baggage.

**Impedance Mismatch**: RxDB wasn't designed for Convex's reactive model. We were fighting the framework at every integration point. RxDB expects to own the database; Convex expects to own the sync layer. Making them share responsibility was like forcing two territorial cats to share a bed.

**Complexity Without Benefit**: The "unopinionated" design meant we were configuring everything manually anyway. Where was the value in flexibility if we still needed to make all the hard decisions?

## The Realization

By mid-October, I had to admit the truth: being unopinionated was a feature, not a benefit.

I largely didn't see a reason for developers to have to pick a conflict resolution strategy and have multiple poor implementations. There just needs to be one fast implementation that is clearly incredible and has the least amount of data loss. Developers want to have fun building their app, not debugging sync protocols.

For a good product experience, you need opinions. You need to make the hard choices for your users so they can focus on their actual product.

RxDB was solving a problem we didn't have (supporting multiple databases and sync protocols) while creating problems we did have (complexity, bundle size, integration pain).

---

# The Automerge Revelation

On October 24th, I found the article that changed everything: "Automerge and Convex" on the Convex blog.

## The Guide's Key Insights

The article proposed a hybrid approach:

**1. Automerge CRDTs for conflict-free merging**
Instead of trying to be flexible about conflict resolution, just use Automerge. It works. It has IndexedDB support. It's production-ready.

**2. Convex for reactive sync**
Convex already handles the sync engine layer. Real-time WebSocket subscriptions, automatic reconnection, optimistic updates. Don't reinvent this.

**3. Store CRDT bytes on the server**
The critical insight: store Automerge documents as binary blobs in Convex. The server doesn't need to understand CRDTs. It just stores and serves bytes.

**4. Hybrid storage**
Not all data needs CRDTs. Use them for collaborative documents. Use regular Convex tables for everything else.

## The Pivot

That day, October 24th, I made the call: rip out RxDB, go all-in on Automerge + Convex.

Six commits that day tell the story:

```
c8f37c4: "Feat: add Convex storage component for CRDT binary data"
1e49827: "Docs: add architecture documentation for Automerge migration"
8eb37fc: "Refactor: remove RxDB-based implementation from core package"
3f0bef7: "Refactor: replace RxDB with clean Automerge implementation"
3835c01: "Refactor: complete migration from RxDB to Automerge architecture"
```

The decision wasn't just about switching libraries. It was about being opinionated for the benefit of our users.

---

# Why "Replicate"? The Replication Table Pattern

The name isn't accidental. It's a reference to one of the oldest patterns in database engineering.

## PostgreSQL's Replication Tables

PostgreSQL has had logical replication for decades. At its core is a simple pattern:

1. **Write-Ahead Log (WAL)** - Every change is logged before being applied
2. **Log Sequence Numbers (LSN)** - Each entry has a monotonically increasing identifier
3. **Replication Slots** - Clients track their position in the log
4. **Incremental Sync** - Clients request changes since their last position

ElectricSQL's legacy architecture (2022-2024) was built directly on this pattern. They created Vaxine, a Rich-CRDT database that extended PostgreSQL's logical replication with CRDT conflict resolution. The architecture used "shadow tables"—replication tables that tracked changes flowing between Postgres and client SQLite databases.

When ElectricSQL announced their July 2024 rewrite ("Electric Next"), they simplified away from the CRDT-native approach. But the replication table pattern they'd proven was sound.

## The Cornerstone Commit

That first commit on October 24th became the cornerstone of the entire architecture:

```
c8f37c4: "Feat: add Convex storage component for CRDT binary data"
```

This commit established a replication table in Convex—a component table that stores CRDT bytes with timestamp indexes for incremental sync. Every commit after refined this philosophy:

```
b197f4f: "refactor: update replication helpers and store for CRDT bytes"
87ff70b: "refactor: update component to use crdtBytes and split insert/update/delete API"
f934227: "Refactor: migrate storage component to replicate API"
4c6681d: "Fix: Import replication helpers from /replication to avoid Automerge on server"
```

The pattern we built:

```typescript
// The replication table schema
documents: defineTable({
  collectionName: v.string(),
  documentId: v.string(),
  crdtBytes: v.bytes(),        // CRDT binary data
  version: v.number(),         // Monotonic sequence
  timestamp: v.number(),       // For checkpoint queries
})
  .index('by_timestamp', ['collectionName', 'timestamp'])
```

This is PostgreSQL's replication table pattern, adapted for Convex with CRDT bytes instead of row changes.

## The Double Meaning

So why "Replicate"?

1. **The verb**: To replicate data across devices, offline and online
2. **The noun reference**: We replicated the replication table pattern itself

We took the battle-tested pattern that powers PostgreSQL logical replication, that ElectricSQL proved worked for local-first sync, and built it as a Convex component. The progression from that cornerstone commit is the story of refining this philosophy—making the replication table pattern work beautifully with CRDTs in the Convex ecosystem.

It's a tribute to the database engineers who figured this out decades ago. We're just standing on their shoulders, adding CRDTs on top.

## The Architecture: Replication Table + CRDTs

The Convex guide showed me how to use Automerge. ElectricSQL showed me the replication table pattern. The breakthrough was combining them.

Here's what I built: **a Postgres-style replication table that stores CRDT bytes instead of row changes**.

The pattern has three layers:

**1. Replication Table (Component)** - CRDT bytes with timestamp index
- Stores documents as opaque binary data
- Timestamp index enables checkpoint-based sync
- Server never parses CRDT bytes, just stores and serves them

**2. Main Application Tables** - Materialized documents for queries
- Stores the same documents as regular Convex rows
- Enables queries, joins, indexes, server-side logic
- Server understands the structure and can use it

**3. Client Store** - CRDT documents with local persistence
- Manages CRDTs locally
- Tracks unreplicated changes
- Merges incoming CRDT bytes automatically

Why both storage layers? It's like event sourcing:
- **Replication table** = Event log (CRDT bytes for conflict resolution)
- **Main tables** = Read model (materialized docs for efficient queries)

```mermaid
flowchart TB
    subgraph CLIENT["Client"]
        STORE[CRDT Document Store]
        TANSTACK[TanStack DB<br/>Query Cache]
        LOCAL[(Local Storage)]
    end

    subgraph SERVER["Convex Backend"]
        COMPONENT[(Replication Table<br/>CRDT bytes + timestamp)]
        MAIN[(Main Tables<br/>Materialized documents)]
    end

    STORE <--> TANSTACK
    STORE <--> LOCAL
    STORE -->|"sync CRDT bytes"| COMPONENT
    COMPONENT --> MAIN
    MAIN -->|"subscription"| TANSTACK
```

This is why it's called "Replicate"—we replicated the Postgres replication pattern in Convex, with CRDTs added.

---

# Evolution to Yjs: The Right Tool

The Automerge architecture worked, but we hit a snag: WASM in the Convex runtime.

## The WASM Problem

Automerge is written in Rust and compiled to WASM for JavaScript environments. This is great for performance in the browser—Rust is fast, and WASM is near-native speed.

But Convex functions run in an isolated JavaScript environment with specific constraints and costs. Understanding these costs was crucial to our decision.

### Convex Runtime Constraints

According to Convex's documentation, their runtimes have specific limits:

| Resource | Convex Runtime | Node.js Runtime |
|----------|---------------|-----------------|
| Memory | 64 MiB RAM | 512 MiB RAM |
| Execution Time (Query/Mutation) | 1 second | 1 second |
| Execution Time (Action) | 10 minutes | 10 minutes |
| Code Size | 32 MiB per deployment | 32 MiB per deployment |

The pricing model also matters:
- **Function calls**: $2 per additional 1,000,000 calls (Professional plan)
- **Action execution**: $0.30/GiB-hour (Professional plan)

Loading WASM modules in Convex means:
- **Larger function bundles**: WASM files are not small—they eat into that 32 MiB limit
- **Cold start latency**: WASM initialization happens on every cold start
- **Compute costs**: Every function call pays for WASM initialization time
- **Memory pressure**: WASM modules consume that precious 64 MiB

For a component meant to be mounted in user applications, we were adding overhead to every Convex function, even ones that didn't use CRDTs. The server doesn't need to understand CRDT operations—it just stores bytes. But with Automerge, the WASM came along for the ride.

### The Hidden Cost of WASM Crossing

There's another cost that benchmarks often miss: the JavaScript/WASM boundary. Every time you pass data between JS and WASM, there's serialization overhead. For a sync library that might process many small operations, this adds up.

```javascript
// Each of these crosses the JS/WASM boundary
const doc = Automerge.init();           // WASM call
Automerge.change(doc, d => {            // WASM call  
  d.title = "Hello";                    // Multiple WASM calls for property access
});
const bytes = Automerge.save(doc);      // WASM call with serialization
```

## Why Yjs Won

Yjs is pure JavaScript. No WASM, no Rust compilation, no binary artifacts. It's also:

- **Battle-tested** at massive scale (Notion, Figma reportedly use similar CRDT approaches)
- **Small bundle size** (~30KB minified, ~91KB when including all dependencies)
- **Rich ecosystem** with persistence providers, editor bindings, awareness protocol
- **Efficient encoding** using state vectors for minimal sync payloads

### Bundle Size Comparison

Based on the crdt-benchmarks repository (using the Automerge paper dataset: 182,315 insertions, 77,463 deletions, 259,778 total operations):

| Library | Snapshot Size | With Compression |
|---------|--------------|------------------|
| Yjs (yrs) | 227 KB | 91 KB |
| Loro | 273 KB | 132 KB |
| Diamond-types | 281 KB | 151 KB |
| Automerge | 293 KB | 129 KB |

Yjs has the smallest uncompressed size. With compression, it's also the smallest. For a library that loads on every page, this matters.

The migration was captured in a single breaking change commit:

```
2e012e7: "feat!: migrate from Automerge to Yjs with TanStack offline-transactions"
```

## State Vector Sync

Yjs introduced us to state vectors—a compact representation of "what changes has this client seen?" that enables efficient delta sync.

```javascript
// Full sync: exchange complete documents
const state1 = Y.encodeStateAsUpdate(ydoc1)
const state2 = Y.encodeStateAsUpdate(ydoc2)
Y.applyUpdate(ydoc1, state2)
Y.applyUpdate(ydoc2, state1)

// Efficient sync: exchange only differences
const stateVector1 = Y.encodeStateVector(ydoc1)
const stateVector2 = Y.encodeStateVector(ydoc2)
const diff1 = Y.encodeStateAsUpdate(ydoc1, stateVector2)
const diff2 = Y.encodeStateAsUpdate(ydoc2, stateVector1)
Y.applyUpdate(ydoc1, diff2)
Y.applyUpdate(ydoc2, diff1)
```

Instead of sending the full document on every sync, we send: "Here's what I've seen. What am I missing?" The server responds with only the deltas the client needs. For large documents with many edits, this is orders of magnitude more efficient.

---

# The Loro Tangent: When Faster Isn't Better

While working on Yjs integration, I discovered Loro—a newer CRDT library with some genuinely impressive properties. This became a multi-week exploration that, while ultimately not shipping to main, taught us important lessons about choosing the right tool.

## What Makes Loro Special

Loro implements several cutting-edge CRDT algorithms that address real problems with older approaches. Understanding these algorithms deeply influenced our thinking, even though we didn't ship Loro.

### The Fugue Algorithm: Solving Text Interleaving

Traditional list CRDTs (including early versions of Yjs) suffer from an "interleaving anomaly." This is a fundamental problem in collaborative text editing that wasn't fully solved until 2023.

**The Problem:**

When two users concurrently type at the same position, their text can become interleaved character-by-character:

```
Initial state: "Hello|World" (cursor at |)

User A types: "ABC"
User B types: "123"

Bad merge result: "H1A2B3CelloWorld"  // Interleaved!
Expected result: "HelloABC123World" or "Hello123ABCWorld"
```

This happens because older CRDTs assign each character a unique ID based on its parent character. When both users insert after the same parent, the merge algorithm alternates between them.

**The Fugue Solution:**

The Fugue paper ("The Art of the Fugue: Minimizing Interleaving in Collaborative Text Editing," arXiv:2305.00583) by Matthew Weidner, Joseph Gentle, and Martin Kleppmann introduced a new approach.

Instead of just tracking parent relationships, Fugue tracks "side" information—whether an insertion is to the left or right of its origin point. This creates a tree structure that preserves contiguous runs of text:

```
Traditional CRDT tree:
    H -> e -> l -> l -> o -> [insertion point]
                              ├── A (User A)
                              ├── B (User A)  
                              ├── C (User A)
                              ├── 1 (User B)
                              ├── 2 (User B)
                              └── 3 (User B)
    
    Merge order depends on IDs, may interleave

Fugue tree with side information:
    H -> e -> l -> l -> o -> [insertion point]
                              ├── (RIGHT) A -> B -> C (User A's run)
                              └── (RIGHT) 1 -> 2 -> 3 (User B's run)
    
    Merge preserves runs: "ABC" stays together, "123" stays together
```

The mathematical property is called **"maximal non-interleaving"**: concurrent insertions at the same position will never interleave character-by-character. They'll stay as contiguous blocks. One user's text comes before or after the other's, but never mixed.

### Peritext: Rich Text Formatting Done Right

Text is one thing. **Rich** text—with bold, italic, links, headings—is another. Peritext (from Ink & Switch) solves the problem of merging concurrent formatting changes.

**The Problem:**

```
Initial: "Hello World" (no formatting)

User A: Makes "Hello" bold
User B: Makes "World" italic

Expected: "**Hello** *World*"

But what about:
User A: Makes "Hello Wo" bold
User B: Makes "llo World" italic

Expected: "**He**" + "***llo Wo***" + "*rld*"  // Overlapping formatting
```

Peritext introduces the concept of **format spans** with explicit boundaries. Each formatting mark has:
- A start position (before or after a character)
- An end position (before or after a character)
- The formatting type and value

When formats overlap, Peritext's merge rules preserve user intent:
- If two users apply the same format, it merges naturally
- If two users apply conflicting formats (bold vs. not-bold), there are clear rules for which wins
- Overlapping ranges are handled without corruption

Loro combines Fugue (for text) with Peritext (for formatting), giving it excellent collaborative rich text properties.

### Movable Trees and Fractional Indexing

Loro also implements movable tree CRDTs based on Martin Kleppmann's research. Moving a subtree in a hierarchy is notoriously hard in distributed systems.

**The Problem:**

```
Initial tree:
Root
├── A
│   └── B
└── C

User 1: Moves B under C
User 2: Moves C under A

Result after naive merge:
Root
├── A
│   └── C      // Wait, C is under A now
│       └── B  // And B is under C
└── (C moved)  // But C was also moved under A?

This creates a cycle! A -> C -> B, but C -> A
```

Loro's movable tree CRDT uses timestamps and parent pointers to detect and resolve cycles. When a cycle would be created, the later move "wins" and the earlier move is effectively undone.

**Fractional Indexing for Siblings:**

Within a tree level, you need to order siblings. Traditional integer positions cause conflicts:

```
Siblings: [A at 0, B at 1, C at 2]

User 1: Insert X at position 1
User 2: Insert Y at position 1

Both now claim position 1. Who wins?
```

Fractional indexing solves this by creating positions between existing positions:

```
Initial: [A at 0.0, B at 1.0, C at 2.0]

User 1: Insert X between A and B → X at 0.5
User 2: Insert Y between A and B → Y at 0.25

Result: [A at 0.0, Y at 0.25, X at 0.5, B at 1.0, C at 2.0]
No conflict!
```

The math uses arbitrary-precision decimals (or special encodings) to always find a value between any two existing values. This is similar to how Google Docs handles paragraph ordering.

### The Performance Numbers

Loro's benchmarks are impressive. On the Automerge paper dataset (182,315 insertions, 77,463 deletions):

| Library | Snapshot Size | Update Size |
|---------|--------------|-------------|
| Loro | 273KB | 251KB |
| Yjs (Yrs) | 227KB | - |
| Diamond-types | 281KB | - |
| Automerge | 293KB | - |

With shallow snapshots (truncating history like Git's shallow clone), Loro achieves:

| Settings | Size |
|----------|------|
| Default | 63 KB |
| With compression | 54 KB |

That 54KB is smaller than anything else—at the cost of losing history.

## The loro Branch

I created a branch to explore Loro integration:

```
08b0b00: "feat: add Loro adapter layer and make component byte-agnostic"
4109978: "refactor: migrate collection layer from Yjs to Loro"
aeb9e76: "refactor: migrate persistence layer to store Loro snapshots directly"
894db9f: "refactor: complete platform-specific entry points for Loro migration"
39e148b: "refactor: update example apps for Loro migration"
```

The migration was architecturally clean—we'd designed the component to be byte-agnostic, so swapping CRDT libraries was mostly a matter of changing the client-side serialization.

## Why We Didn't Ship It

After getting Loro working, I had to confront an uncomfortable truth: **the theoretical performance advantages don't matter for our use case**.

Here's why:

**1. WASM in the Browser**

Loro is written in Rust and compiled to WASM. While Rust is faster than JavaScript for CRDT operations, WASM has overhead:
- Initial loading and parsing of the WASM module (~100-200ms on slow devices)
- Serialization costs crossing the JS/WASM boundary (every operation pays)
- Can't be tree-shaken; you pay for the entire WASM binary

For a sync library that runs on every page load, these costs add up. Yjs, being pure JavaScript, starts instantly and integrates seamlessly with bundlers.

**2. WASM in Convex**

More critically, running Loro in Convex functions would mean loading a WASM image into the Convex runtime on every function call. With:
- 64 MiB RAM limit for Convex runtime
- Cold start on every new function instance
- $0.30/GiB-hour for action execution

The compute costs would be significant—and we'd be paying those costs for operations the server doesn't even need to perform (it just stores bytes).

**3. Bundle Size Reality**

Loro's WASM bundle adds more weight than Yjs's JavaScript bundle:
- Loro WASM: ~500KB+ (varies by features)
- Yjs: ~30KB minified core

For mobile web users on slow connections, this difference is noticeable.

**4. Ecosystem Maturity**

Yjs has years of production use, extensive documentation, and a rich ecosystem of bindings:
- ProseMirror/TipTap for rich text
- Monaco for code editing
- Quill for WYSIWYG
- y-indexeddb, y-websocket, y-webrtc for persistence and transport

Loro is newer and, while promising, doesn't have the same integration story. When something breaks, there are fewer Stack Overflow answers and GitHub issues to reference.

## What We Learned from Loro

The Loro exploration wasn't wasted. We learned:

**Peer-Checking Compaction**: Loro's approach to garbage collection considers which peers have acknowledged which operations. This is more sophisticated than simple retention-date compaction, giving stronger consistency guarantees. We incorporated this thinking into our own compaction strategy.

**Client-Side Authoritative Compaction Fails**: With Loro, we explored having clients drive compaction decisions. This doesn't work well with Convex's model—function calls have compute costs, and client-side authority for storage decisions creates consistency challenges. Server-side compaction (with client hints) is the right pattern.

**Algorithm-Aware Trade-offs**: Not all CRDTs are equal. Fugue's non-interleaving guarantee is genuinely important for text editing. If we add collaborative rich-text editing as a first-class feature (not just synced documents), we might revisit Loro.

The `loro` branch remains in the repository as a technical curiosity and a reminder that faster benchmarks don't always mean better products.

---

# Component Authoring: Reverse Engineering the Future

One of the more surreal aspects of building Replicate was that we shipped version 1.0.0 *before* Convex publicly released their component authoring documentation.

## The Pre-Public Challenge

Convex components are a brilliant abstraction: self-contained modules with their own database tables, isolated function execution, and clean composition. When Convex announced components, the R2 storage component was one of the examples. But the authoring guide wasn't public yet.

We wanted to build Replicate as a proper component—not a library, not a bunch of copy-paste code, but a true component that developers could install with `bun add` and mount with `app.use()`. So we reverse-engineered it.

The process:
1. Clone the Convex R2 component example
2. Study the file structure and configuration patterns
3. Strip out R2-specific code, insert our CRDT sync logic
4. Regenerate the build system through trial and error
5. Test by mounting in a real application

This was before `npx convex codegen --component-dir` was documented. Before the authoring guide explained the `convex.config.ts` anatomy. We were cargo-culting from examples and praying.

The payoff was worth it. When Convex did release component authoring publicly, Replicate was already compatible. We'd guessed correctly on the patterns that would become standard.

## Build System Evolution

The build tooling for components went through its own journey, each phase teaching us something about the trade-offs in TypeScript library development:

### Phase 1: tsc (TypeScript Compiler)

Just the TypeScript compiler. Simple and correct, but:
- **Slow**: Full type-checking on every build
- **No bundling**: Outputs many small files
- **No optimization**: No tree-shaking, no minification
- **Dual output pain**: Generating both ESM and CJS required separate configs

```json
// tsconfig.json (Phase 1)
{
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true
  }
}
```

### Phase 2: rslib/rsbuild

Moved to Rslib (built on Rspack, the Rust-based Webpack alternative) for proper bundling:

```
142d04b: "feat: migrate core to Rslib and externalize Automerge as peer dependency"
```

Benefits:
- **Fast**: Rspack is significantly faster than Webpack
- **Dual ESM/CJS**: Native support for both module formats
- **Tree-shaking**: Dead code elimination
- **Externalization**: Peer dependencies excluded from bundle

```javascript
// rslib.config.js (Phase 2)
export default {
  lib: [
    { format: 'esm', syntax: 'es2021' },
    { format: 'cjs', syntax: 'es2019' }
  ],
  output: {
    externals: ['yjs', '@convex/component']
  }
};
```

### Phase 3: tsdown

Eventually settled on tsdown—a simpler alternative with excellent defaults:

```
7d9dbbd: "refactor: migrate to tsdown and simplify convexCollectionOptions API"
```

Why tsdown won:
- **Minimal configuration**: Sensible defaults for library authoring
- **Fast builds**: Uses esbuild under the hood
- **Clean DTS**: Proper TypeScript declaration bundling
- **Watch mode**: Fast iteration during development

```javascript
// tsdown.config.js (Phase 3)
export default {
  entry: ['src/index.ts', 'src/client.ts', 'src/server.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true
};
```

The lesson: start simple (tsc), add complexity when needed (rslib), then simplify when you understand your requirements (tsdown).

## Package Consolidation

The repository structure also evolved:

**Early: Separate Packages**
- `@trestleinc/convex-replicate-component` - Convex component
- `@trestleinc/convex-replicate-core` - Client utilities
- `@trestleinc/convex-replicate-react` - React bindings

**Current: Unified Package**
- `@trestleinc/replicate` - Everything, with entry points (`/client`, `/server`, `/convex.config`)

```
480da8f: "refactor!: merge component and core packages into unified @trestleinc/replicate"
05e7eae: "refactor: flatten monorepo structure (packages/replicate → root)"
```

The consolidation reduced confusion (one package to install, one version to track) and simplified the build process.

---

# The API Evolution: From Boilerplate to Elegance

One of the less visible but most important aspects of the project was the API design journey. Early versions required developers to understand Convex's type system, component internals, and the CRDT layer. By version 1.1.0, the surface area had shrunk dramatically.

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
export const versions = r.versions("tasks");

// Then wire up compaction manually
export const compact = r.compact("tasks", { threshold: 5_000_000 });
```

This worked, but required developers to:
- Import from `_generated` (internal knowledge)
- Understand the type parameter threading
- Export each function individually
- Configure compaction separately

## The Factory Pattern: Simpler Configuration

We moved to a factory pattern with destructuring:

```typescript
// Factory pattern: single configuration object
const r = replicate(components.replicate);

export const {
  stream,
  material,
  insert,
  update,
  remove,
  versions,
} = r<Task>({
  collection: "tasks",
  compaction: { threshold: 5_000_000 },
});
```

```
704b549: "refactor: simplify server API to factory pattern with replicate()"
```

This was better—one function call, destructured exports. But it still felt verbose.

## The Nested Object Pattern

We explored returning nested objects:

```typescript
// Nested objects: grouped by concern
export const tasks = replicate(components.replicate)<Task>({
  collection: "tasks",
  compaction: { threshold: 5_000_000 },
});

// Usage: api.tasks.stream, api.tasks.insert, etc.
```

```
dae9314: "feat: refactor API to nested object pattern"
```

## Current API: collection.create()

The current API uses Zod schemas for validation and a clean creation pattern:

```typescript
// convex/schema.ts
import { schema } from "@trestleinc/replicate/server";

export default defineSchema({
  tasks: schema.table({
    id: z.string(),
    text: z.string(),
    isCompleted: z.boolean(),
  }),
});

// convex/tasks.ts
import { replicate } from "@trestleinc/replicate/server";

export const tasks = replicate(components.replicate).collection("tasks", {
  compaction: { threshold: 5_000_000 },
});
```

And on the client:

```typescript
// Client: collection creation with type safety
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

```
2b76731: "feat: add SSR material prefetch and refactor collection.create() API"
```

The evolution prioritized:
- **Fewer imports** - Don't make users import from generated files
- **Type inference** - Let TypeScript do the work
- **Zod integration** - Validation at runtime, not just types
- **Familiar patterns** - TanStack-style APIs that React developers recognize

---

# The ProseMirror Challenge

Adding rich text support revealed a hidden complexity in our sync architecture.

## The Sync Loop Problem

TanStack DB has a clean reactive loop: collection changes → re-render → user sees update. Yjs integrates naturally—when the Y.Doc changes, TanStack DB's collection updates, React re-renders.

ProseMirror (and its derivatives like TipTap and BlockNote) doesn't fit this model. ProseMirror maintains its own internal document state. When you type, ProseMirror updates its state, then emits a transaction. The editor owns its state.

This creates a conflict with three competing sources of truth:
1. **Yjs Y.Doc** - The CRDT state, source of truth for sync
2. **ProseMirror EditorState** - The editor's internal state, source of truth for rendering
3. **TanStack DB Collection** - The reactive cache, source of truth for React

If we're not careful, we get infinite loops or dropped updates:

```
User types "A"
→ ProseMirror updates its state
→ y-prosemirror binding updates Y.Doc
→ Y.Doc triggers Yjs observer
→ Observer updates TanStack DB
→ TanStack DB triggers React re-render
→ React re-renders ProseMirror component
→ ProseMirror sees "new" state
→ Wait, is this a change? Let me update again...
→ INFINITE LOOP
```

## XmlFragment: The Special Type

Rich text in Yjs uses `Y.XmlFragment`—a special type designed for hierarchical document structures. Unlike regular `Y.Map` fields, XmlFragments:

- Preserve document hierarchy (paragraphs, headings, lists)
- Handle nested elements correctly
- Support formatting spans with proper merge semantics
- Must be "bound" to a Y.Doc before use

That last point caused bugs:

```typescript
// WRONG: XmlFragment used before binding
const fragment = new Y.XmlFragment();
fragment.insert(0, [new Y.XmlText("Hello")]);  // Error!

// CORRECT: Fragment must be in a doc first
const doc = new Y.Doc();
const fragment = doc.getXmlFragment("content");  // Now it's bound
fragment.insert(0, [new Y.XmlText("Hello")]);    // Works!
```

```
75c7f74: "fix: serialize Y.XmlFragment correctly on insert mutations"
cad5178: "fix: ensure XmlFragments are bound to Y.Doc before populating content"
```

## The Solution: Custom Sync Triggers

We extracted prose sync to a separate module with document-level tracking:

```
a30969c: "wip: extract prose sync to separate module with document-level tracking"
622cd42: "fix: prevent prose field corruption in subscription update cycle"
```

The pattern:

1. **ProseMirror changes emit to Yjs** via y-prosemirror binding
2. **Yjs changes are debounced** before syncing to Convex
3. **Sync writes to Convex**, which updates the subscription
4. **Subscription updates are filtered** to avoid round-tripping local changes

```typescript
// Prose-specific debounce configuration
const PROSE_DEBOUNCE_MS = 300;  // Batch rapid keystrokes

const debouncedSync = debounce((fieldName: string) => {
  const fragment = doc.getXmlFragment(fieldName);
  const bytes = Y.encodeStateAsUpdate(doc);
  syncToServer(bytes);
}, PROSE_DEBOUNCE_MS);

// Skip updates that originated locally
doc.on('update', (update, origin) => {
  if (origin === 'local') return;  // Skip our own changes
  debouncedSync(fieldName);
});
```

We also added debouncing specifically for prose fields—text editing generates many small changes in rapid succession, and batching them reduces sync overhead and prevents network saturation.

---

# The Cursor Problem

This is where things got interesting. And by interesting, I mean the kind of interesting that makes you question your career choices.

## The Discovery

We were seeing occasional sync issues. Documents that should have synced weren't showing up. The issue was intermittent and hard to reproduce—the worst kind of bug.

I opened a GitHub issue on the Convex community, and Ian (from the Convex team) dropped knowledge that changed everything:

> "Currently the 'check if there are new changes' uses the previous `_creationTime` as the cursor. Unfortunately, the previous query could have fetched results before an in-progress mutation commits, which could have started prior to what the latest document's `_creationTime` shows, meaning the next check will miss the commit."

In other words: **`_creationTime` is not monotonic**.

## Why _creationTime Can Be Out of Order

Convex uses **MVCC (Multi-Version Concurrency Control)** with **OCC (Optimistic Concurrency Control)**. Understanding this is crucial to understanding the bug.

### MVCC: Multiple Versions Exist Simultaneously

MVCC allows readers and writers to operate without blocking each other. When you read data, you see a consistent "snapshot" of the database at a particular point in time. When you write, you're creating a new version that will become visible to future readers.

This is great for performance—reads never block writes, writes never block reads.

### OCC: Optimistic Concurrency Control

Convex mutations run optimistically. Multiple mutations can execute in parallel:

1. Mutation starts, reads its data
2. Mutation does its work
3. Mutation attempts to commit
4. If no conflicts with other committed mutations, success
5. If conflicts detected, automatic retry

This is also great for throughput. But it means mutations don't commit in the order they started.

### The Timestamp Gap

Here's the problem visualized:

```
Time 0ms: Mutation A starts
          A reads data, begins work
          A will use _creationTime = 1000

Time 1ms: Mutation B starts  
          B reads data, begins work (fast operation)
          B will use _creationTime = 999  // Started later, but faster!

Time 2ms: Mutation B commits (_creationTime = 999)
          B is now visible to queries

Time 3ms: Client queries: "Give me docs where _creationTime > 998"
          Client sees: Mutation B (999)
          Client cursor now = 999

Time 4ms: Mutation A finally commits (_creationTime = 1000)
          A is now visible to queries

Time 5ms: Client queries: "Give me docs where _creationTime > 999"
          Client sees: Nothing new! A has _creationTime = 1000, but wait...
          
Actually A has _creationTime = 1000 which is > 999, so we should see it.
But if A's _creationTime was set BEFORE B's even though A committed AFTER...

The real issue: _creationTime is set when the mutation STARTS, not when it COMMITS.
```

Ian's note about the theoretical maximum skew: **up to 4 minutes**, though usually not more than seconds. This is based on mutation timeout limits and retry windows.

For most applications, you'd never notice. Mutations usually complete quickly and in rough order. But for a sync system that depends on "give me everything after timestamp X," even occasional gaps cause data loss.

## The Version Number Solution

Ian pointed to his prosemirror-sync component's approach:

```typescript
// prosemirror-sync schema
defineTable({
  // ...
  version: v.number(),  // Monotonically increasing
})

// In the mutation
const currentVersion = await ctx.db
  .query("documents")
  .order("desc")
  .first()
  ?.version ?? 0;

await ctx.db.insert("documents", {
  // ...
  version: currentVersion + 1,  // Explicit increment
});
```

Instead of relying on `_creationTime`, use a version number that's explicitly incremented within the transaction. This creates a **total ordering guarantee**—version 5 always comes after version 4.

### The Trade-off: Serialization

The trade-off is that concurrent inserts need to be serialized. If two mutations both try to increment the version:

```
Mutation A: reads version = 5, will write version = 6
Mutation B: reads version = 5, will write version = 6

Both try to commit with version = 6
Convex OCC detects conflict (both read version 5, both writing)
One mutation retries with fresh read
Result: A gets version 6, B (after retry) gets version 7
```

Convex's OCC will detect the conflict and retry one of them. This can cause write conflicts during contentious writes.

For most sync applications, this is fine. Sync operations aren't as contentious as, say, a real-time voting counter where thousands of users increment simultaneously. The occasional retry is worth the consistency guarantee.

### Why Not Just Use _id?

You might think: "Convex's `_id` is monotonically increasing, right?"

Actually, no. Convex IDs are designed for uniqueness, not ordering. They use a scheme that ensures global uniqueness across shards and time, but doesn't guarantee temporal ordering.

## The cursor Branch

We're implementing cursor-based sync with peer tracking in the `cursor` branch:

```
f62500d: "feat: implement cursor-based sync with peer tracking"
7ed7ec6: "feat: update client for cursor-based sync with peer tracking"
22ab876: "refactor: migrate sync protocol from checkpoint to cursor-based system"
```

### Peer Tracking

Peer tracking adds another dimension: not just "what version did we sync to?" but "which peers have acknowledged which versions?" This enables smarter compaction—we can safely delete old deltas once all active peers have confirmed receipt.

```typescript
// Server tracks peer progress
peers: defineTable({
  peerId: v.string(),
  lastMarkedVersion: v.number(),
  lastSeenAt: v.number(),
})

// Client marks progress
await ctx.runMutation(api.replicate.mark, {
  peerId: clientId,
  version: lastProcessedVersion,
});
```

```
a9b7782: "refactor: minimize public API surface and rename ack to mark"
```

The `mark` operation (formerly `ack`) lets clients signal which deltas they've processed. The server tracks this per-peer, enabling:

1. **Safe compaction**: Only delete deltas that ALL active peers have marked
2. **Stale peer detection**: Peers that haven't marked in X days are considered inactive
3. **Recovery optimization**: Know exactly what each peer is missing

---

# The Final Hurdle: React Native

Everything was working beautifully on the web. Then we tried React Native.

## The LevelDB Curse

Our persistence layer used LevelDB (via y-leveldb) for local storage. LevelDB is battle-tested, fast, and... depends on browser APIs that don't exist in React Native.

The build would fail with cryptic errors about missing `fs` modules, `Buffer` polyfills, and native dependencies. React Native's JavaScript environment is similar to a browser but not identical—close enough to confuse tools, different enough to break them.

```
Error: Unable to resolve module `fs` from `node_modules/level/...`
Error: Buffer is not defined
Error: Cannot read property 'IDBFactory' of undefined
```

## SQLite to the Rescue

The solution was to replace LevelDB with SQLite entirely:

```
f366136: "refactor: replace LevelDB with SQLite-only persistence"
```

SQLite is available everywhere:
- **Browser**: via WASM (sql.js) or OPFS (Origin Private File System)
- **React Native**: via native bindings (op-sqlite, expo-sqlite)
- **Node**: via better-sqlite3

We built a swappable persistence layer:

```
e2a236b: "refactor: add swappable persistence layer for React Native support"
8d264e7: "feat: add universal SQLite persistence with auto-platform detection"
```

The persistence provider auto-detects the platform and uses the appropriate SQLite implementation:

```typescript
// Auto-detection logic
function detectPlatform(): PersistenceProvider {
  if (typeof window !== 'undefined') {
    // Browser environment
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      return new OPFSSQLiteProvider();  // Modern browsers with OPFS
    }
    return new WASMSQLiteProvider();    // Fallback to sql.js WASM
  }
  
  if (isExpo()) {
    return new ExpoSQLiteProvider();    // Expo with expo-sqlite
  }
  
  if (isReactNative()) {
    return new OpSQLiteProvider();      // Bare RN with op-sqlite
  }
  
  return new BetterSQLiteProvider();    // Node.js with better-sqlite3
}

// Usage is identical across platforms
const persistence = createPersistence({
  database: "replicate",
  // Platform auto-detected
});
```

## The Expo Example

We built a complete Expo example app—an interval tracking application—to validate React Native support:

```
39053e2: "feat(expo): rewrite example with interval tracking app"
f5f6cfc: "docs: add React Native setup instructions"
3565e7e: "docs: update documentation for Expo example and API changes"
```

The interval tracker is a good test case because:
- Users track time across sessions (persistence matters)
- Multiple devices might track the same intervals (sync matters)
- Network connectivity is unreliable during activities (offline matters)

Watching the app sync across devices—phone to tablet, tablet to web—with no data loss was deeply satisfying after months of work.

---

# Architecture Deep Dive

Let me walk through the final architecture in detail.

## Dual-Storage Pattern

```mermaid
flowchart TB
    subgraph CLIENT["Client"]
        YDOC[Y.Doc<br/>CRDT State]
        TANSTACK[TanStack DB<br/>Query Cache]
        LOCAL[(SQLite<br/>Local Persistence)]
    end

    subgraph CONVEX["Convex Backend"]
        EVENTS[(Event Log<br/>CRDT deltas + version)]
        MATERIAL[(Main Table<br/>Materialized documents)]
    end

    YDOC <--> TANSTACK
    YDOC <--> LOCAL
    YDOC -->|"sync delta"| EVENTS
    EVENTS -->|"materialize"| MATERIAL
    MATERIAL -->|"subscription"| TANSTACK

    style EVENTS fill:#e3f2fd
    style MATERIAL fill:#c8e6c9
```

**Why both storage layers?**

| Layer | Purpose | Properties |
|-------|---------|------------|
| Event Log | History, conflict resolution, recovery | Append-only, versioned, CRDT bytes |
| Main Table | Queries, indexes, server logic | Current state, structured, fast lookups |

This is CQRS (Command Query Responsibility Segregation) applied to sync: the event log is the write model, the main table is the read model.

## Sync Protocol

```mermaid
sequenceDiagram
    participant C as Client
    participant Y as Yjs Doc
    participant S as Convex
    participant T as Main Table

    Note over C,Y: User edits offline
    C->>Y: collection.update()
    Y->>Y: Create CRDT delta
    Y-->>C: Optimistic UI update

    Note over Y,S: When online
    Y->>S: stream(delta, cursor)
    S->>S: Append to event log
    S->>S: Increment version
    S->>T: Upsert materialized doc
    T-->>C: Subscription update
    C->>S: mark(version)
```

## Recovery Mechanism

When a client reconnects after being offline:

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Convex

    Note over C,S: Recovery sync
    C->>C: Encode local state vector
    C->>S: recovery(stateVector, lastCursor)
    S->>S: Compute missing deltas since cursor
    S->>S: Also check state vector for gaps
    S-->>C: Return missing data
    C->>C: Apply deltas to local doc
    C->>C: Reconcile any phantoms
```

**State vectors** enable efficient sync—only missing data is transferred, not the full document. Combined with cursor-based tracking, we get both efficiency and correctness.

## Auto-Compaction

Without compaction, event logs grow unbounded. Every keystroke becomes a delta. Over time, a document could have thousands of deltas just to represent a single paragraph.

```mermaid
flowchart LR
    subgraph BEFORE["Before Compaction"]
        D1[Delta 1]
        D2[Delta 2]
        D3[Delta 3]
        D4[...]
        DN[Delta N]
    end

    TRIGGER{All peers marked?<br/>Size > threshold?}

    subgraph AFTER["After Compaction"]
        SNAP[Snapshot]
    end

    BEFORE --> TRIGGER
    TRIGGER -->|yes| AFTER
```

### Compaction Strategies Compared

We explored two approaches to compaction, informed by our Loro research:

**Retention-Date Compaction (Simpler)**

Delete deltas older than X days, regardless of peer acknowledgment.

```typescript
// Retention-date approach
const RETENTION_DAYS = 30;
const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);

await ctx.db
  .query("events")
  .filter(q => q.lt(q.field("timestamp"), cutoff))
  .collect()
  .then(events => events.forEach(e => ctx.db.delete(e._id)));
```

Pros:
- Simple to implement
- Predictable storage growth

Cons:
- **Can cause data loss** if a peer has been offline for more than the retention period
- No way to recover those deltas

**Peer-Checking Compaction (Our Approach)**

Only delete deltas that ALL active peers have acknowledged.

```typescript
// Peer-checking approach
const activePeers = await ctx.db
  .query("peers")
  .filter(q => q.gt(q.field("lastSeenAt"), activeCutoff))
  .collect();

const minMarkedVersion = Math.min(
  ...activePeers.map(p => p.lastMarkedVersion)
);

// Safe to compact: all active peers have seen these
await ctx.db
  .query("events")
  .filter(q => q.lt(q.field("version"), minMarkedVersion))
  .collect()
  .then(events => mergeIntoSnapshot(events));
```

Pros:
- **Never loses data** that an active peer needs
- Self-healing: inactive peers are ignored after a threshold

Cons:
- One slow peer can block compaction for everyone
- More complex state tracking

We chose peer-checking because data loss is unacceptable for our use case. A case worker who was offline for a month should still be able to sync without losing work.

### Why Client-Side Authoritative Compaction Fails

During the Loro exploration, we considered having clients decide when to compact:

```typescript
// BAD: Client-side authoritative compaction
// Client says: "I've processed everything, compact now!"
await client.requestCompaction();
```

This fails for several reasons:

1. **Race conditions**: Client A says "compact!" while Client B is mid-sync
2. **Compute costs**: Every client request triggers Convex function execution
3. **Trust issues**: Malicious client could request compaction to cause data loss
4. **Coordination complexity**: Multiple clients need to agree

Server-side compaction with client hints (via `mark`) is the right pattern. Clients report their progress; the server decides when compaction is safe.

---

# What We Learned

After hundreds of commits across multiple branches, three architectural pivots, and countless debugging sessions, here's what we took away:

## 1. Opinions Over Flexibility

The RxDB experiment taught us that flexibility isn't always a feature. When you're unopinionated, you force every user to make complex decisions about conflict resolution, storage backends, and sync protocols.

The better approach: make opinionated choices based on research, then make them work beautifully. Developers don't want to choose their CRDT library. They want their app to work offline and merge conflicts automatically.

## 2. The Replication Table Pattern is Battle-Tested

PostgreSQL's logical replication pattern (WAL + LSN offsets) has decades of production use. ElectricSQL showed how to adapt it. We combined it with CRDTs.

The pattern works because it's simple:
- Append-only event log with sequential identifiers
- Checkpoint-based incremental sync
- Separation of event storage and materialized state

Don't reinvent this. Adapt it.

## 3. CRDTs Solve the Hard Problem

The hard problem in local-first is conflict resolution. CRDTs solve it mathematically—any merge, any order, deterministic result.

The implementation details matter (Yjs vs Loro vs Automerge), but the core insight is the same: if you design your data structures to be commutative, associative, and idempotent, conflicts disappear.

## 4. Convex Handles Transport; We Handle Merging

This division of labor was key. Convex already provides:
- Real-time WebSocket subscriptions
- Optimistic updates
- Automatic reconnection
- Server-side logic and queries

We didn't need to build a sync engine. We needed to build a merge layer on top of an excellent sync engine.

## 5. Local-First is Both UX and Implementation Problem

From Zero Sync's philosophy: users expect instant, offline-capable, conflict-free software because native apps trained them to expect it. The implementation complexity is a developer problem, but the experience is a user expectation.

For Trestle's users—field workers entering data in unreliable conditions—local-first isn't a nice-to-have. It's the baseline expectation for software that respects their time and their clients' stories.

## 6. Platform Constraints Shape Architecture

The browser is not React Native is not Convex runtime. Each has different capabilities and constraints:

| Platform | Memory | Bundle Size Sensitivity | WASM Support |
|----------|--------|------------------------|--------------|
| Browser | Generous | High (affects load time) | Good |
| React Native | Limited | Medium | Poor |
| Convex Runtime | 64 MiB | Low | Adds cold start cost |

We couldn't just pick the theoretically best library. We had to pick the one that worked across all our target platforms without imposing unacceptable costs.

## 7. Timestamps Are Harder Than They Look

The cursor problem taught us that distributed timestamps are deceptively complex. MVCC and OCC are great for performance but create non-obvious ordering issues.

When you need total ordering, you must create it explicitly. Don't rely on system-generated timestamps unless you understand exactly how they're generated and when.

## 8. Rich Text Is Its Own Beast

ProseMirror integration revealed that not all data syncs the same way. Rich text has special requirements:
- Hierarchical structure (not just key-value)
- Formatting spans that overlap
- Editor state that competes with CRDT state
- High-frequency updates that need debouncing

If you're building a sync library, plan for rich text from the start. Retrofitting it is painful.

---

# The Road Ahead

Replicate is in production at Trestle, powering Ledger's offline-first forms. But there's more to build:

**Cursor-based sync** is landing soon—the work on the `cursor` branch represents months of research into correct, efficient sync primitives.

**Rich text as a first-class feature** is on the roadmap. The ProseMirror integration works, but there's room for a more integrated experience—possibly revisiting Loro's Fugue algorithm for text specifically.

**Conflict visualization** for debugging—when merges happen, developers should be able to see what was merged and how.

**React Native parity**—the Expo example works, but production apps will surface edge cases.

**Selective sync**—not every document needs to be on every device. Shapes-style filtering is coming.

The local-first revolution isn't coming. It's here. And if you're building collaborative software without offline-first architecture, you're already behind.

Welcome to the new standard.

---

# Appendix: Technical Reference

## Convex Runtime Limits (as of 2024)

| Resource | Convex Runtime | Node.js Runtime |
|----------|---------------|-----------------|
| Memory | 64 MiB | 512 MiB |
| Query/Mutation Time | 1 second | 1 second |
| Action Time | 10 minutes | 10 minutes |
| Code Size | 32 MiB/deployment | 32 MiB/deployment |
| Concurrent Queries | 16 (Free), 256 (Pro) | - |
| Concurrent Mutations | 16 (Free), 256 (Pro) | - |

## CRDT Library Comparison

| Library | Implementation | Bundle Size | Best For |
|---------|---------------|-------------|----------|
| Yjs | Pure JavaScript | ~30KB min | General purpose, wide ecosystem |
| Loro | Rust + WASM | ~500KB+ | Advanced algorithms (Fugue, Peritext) |
| Automerge | Rust + WASM | ~400KB+ | JSON-like documents |
| Diamond-types | Rust + WASM | ~300KB+ | Text editing specifically |

## Benchmark Data (Automerge Paper Dataset)

259,778 operations (182,315 insertions, 77,463 deletions):

| Library | Snapshot | Compressed | With GC |
|---------|----------|------------|---------|
| Yjs | 227 KB | 91 KB | 72 KB |
| Loro | 273 KB | 132 KB | N/A |
| Loro Shallow | 63 KB | 54 KB | - |
| Automerge | 293 KB | 129 KB | N/A |

---

# Resources & Further Reading

| Resource | Description |
|----------|-------------|
| [Local-First Software (Ink & Switch)](https://www.inkandswitch.com/local-first/) | The foundational essay that coined "local-first" |
| [Zero by Rocicorp](https://zero.rocicorp.dev/) | Sync engine for the web with elegant architecture |
| [Yjs Documentation](https://docs.yjs.dev/) | The CRDT library powering Replicate |
| [Loro](https://loro.dev/) | Next-gen CRDT with Fugue and movable trees |
| [Fugue Paper (arXiv:2305.00583)](https://arxiv.org/abs/2305.00583) | "The Art of the Fugue: Minimizing Interleaving" |
| [Peritext (Ink & Switch)](https://www.inkandswitch.com/peritext/) | Rich text CRDT research |
| [Convex Components](https://docs.convex.dev/components) | Building reusable Convex modules |
| [Convex Limits](https://docs.convex.dev/production/state/limits) | Runtime constraints |
| [prosemirror-sync](https://github.com/get-convex/prosemirror-sync) | Convex's collaborative editing component |
| [ElectricSQL Rich-CRDTs](https://electric-sql.com/blog/2022/05/03/introducing-rich-crdts) | The legacy architecture documentation |
| [AntidoteDB](https://github.com/AntidoteDB/antidote) | Planet-scale CRDT database (829 stars) |
| [crdt-benchmarks](https://github.com/dmonad/crdt-benchmarks) | Standard CRDT benchmark suite |

---

*Replicate is open-source and available under Apache-2.0 license. Built with Yjs, TanStack DB, and Convex.*

*Built at [Trestle](https://trestle.com)—software that amplifies human compassion.*
