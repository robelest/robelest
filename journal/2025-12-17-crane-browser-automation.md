---
title: "Zero-Knowledge Browser Automation: Secure Blueprint Execution"
slug: crane-browser-automation
description: A Convex component for browser automation with declarative blueprints, zero-knowledge credential vault, and AI-powered element detection.
tags:
  - convex
  - components
  - automation
publishDate: 2025-12-17
published: false 
---

# Abstract

Many critical systems lack APIs. Government portals, legacy applications, and third-party services often require manual data entry through web interfaces. Traditional automation solutions either expose credentials insecurely or require complex infrastructure.

This paper presents **Crane**, a [Convex component](https://docs.convex.dev/components) for browser automation with a zero-knowledge credential vault. Install via npm and mount with `app.use(crane)`. Define automation workflows as declarative blueprints (sequences of tiles). Credentials are encrypted client-side and only decrypted during execution - the server never sees plaintext secrets. AI-powered element detection (via Stagehand) eliminates brittle CSS selectors.

The result is secure, maintainable automation for systems without APIs - as a drop-in Convex component.

---

# What is a Convex Component?

[Convex components](https://docs.convex.dev/components) are reusable, self-contained modules that add functionality to any Convex application. They:

- **Install via npm** - `bun add @trestleinc/crane`
- **Mount in your app** - `app.use(crane)` in `convex.config.ts`
- **Provide typed APIs** - Full TypeScript support with generated types
- **Run in isolation** - Separate tables, no schema conflicts
- **Compose together** - Multiple components work side-by-side

Crane follows this pattern. Install it, mount it, and you have a complete browser automation system with a secure credential vault.

---

# The Problem

## The API-less Integration Problem

Organizations must submit data to external systems that lack APIs:
- Government portals (benefits systems, regulatory filings)
- Legacy enterprise applications
- Third-party services with web-only interfaces

Workers spend hours manually entering the same data across multiple systems.

```mermaid
flowchart LR
    subgraph INTERNAL["Internal System"]
        DATA["Client Data"]
    end

    subgraph EXTERNAL["External Portals (No APIs)"]
        PORTAL1["Portal A"]
        PORTAL2["Portal B"]
        PORTAL3["Portal C"]
    end

    DATA -->|"Manual entry"| PORTAL1
    DATA -->|"Manual entry"| PORTAL2
    DATA -->|"Manual entry"| PORTAL3

    style PORTAL1 fill:#ffcdd2
    style PORTAL2 fill:#ffcdd2
    style PORTAL3 fill:#ffcdd2
```

## The Credential Security Problem

Traditional automation approaches have credential problems:

| Approach | Problem |
|----------|---------|
| Hardcoded in scripts | Exposed in source control |
| Environment variables | Accessible to all processes |
| Secret managers | Server-side decryption exposes plaintext |
| Browser extensions | User-specific, not automatable |

What we need is automation where credentials are:
- Encrypted client-side before storage
- Decrypted only at execution time
- Never visible to the server in plaintext

---

# Why We Built This

## The Trestle Context

At Trestle, we build software for human services organizations - case management systems for nonprofits, government agencies, and community organizations. Our users must submit data to external systems that lack APIs:

- **HMIS portals** - HUD's Homeless Management Information System requires manual data entry
- **Benefits systems** - State welfare systems with web-only interfaces
- **Funder portals** - Foundation grant reporting through custom web forms
- **Coordinated entry** - Regional housing systems with no integration options

**The pain points:**
- Workers spend hours copying data from our system into external portals
- Portal logins are shared across teams (security nightmare)
- Manual entry introduces transcription errors
- No audit trail of what was submitted and when

**What we needed:**
- Declarative automation that non-developers can understand
- Zero-knowledge credential storage (we never see client passwords)
- AI-powered element detection (portals change layouts frequently)
- Full audit trail with screenshots

Crane was built as a Convex component so any Convex application can add secure browser automation without building a credential vault from scratch.

---

# The Solution

## Declarative Blueprints + Zero-Knowledge Vault

Crane separates concerns:

1. **Blueprints** - Declarative automation workflows (what to do)
2. **Executor** - Orchestrates tile execution (how to run)
3. **Vault** - Zero-knowledge credential storage (secure secrets)
4. **Adapter** - Pluggable browser interface (swappable backends)

```mermaid
flowchart TB
    subgraph CLIENT["Client (Browser)"]
        BUILDER["Blueprint Builder"]
        VAULT_UI["Vault UI<br/>Encrypt credentials client-side"]
    end

    subgraph SERVER["Server (Actions)"]
        EXECUTOR["Executor<br/>Orchestrates tiles"]
        PROVIDER["Credential Provider<br/>Decrypts on demand"]
    end

    subgraph STORAGE["Database"]
        BLUEPRINTS["blueprints<br/>Tile sequences"]
        CREDS["credentials<br/>Encrypted only"]
    end

    subgraph BROWSER["Browser Automation"]
        ADAPTER["BrowserAdapter"]
        STAGEHAND["Stagehand 3<br/>AI-powered"]
    end

    CLIENT --> STORAGE
    STORAGE --> SERVER
    SERVER --> BROWSER
    VAULT_UI -->|"encrypted"| CREDS
    PROVIDER -->|"decrypts"| CREDS
```

---

# Installation

## 1. Install the Package

```bash
# Using bun (recommended)
bun add @trestleinc/crane

# Using npm
npm install @trestleinc/crane
```

## 2. Mount the Component

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import crane from "@trestleinc/crane/convex.config";

const app = defineApp();
app.use(crane);

export default app;
```

## 3. Create the Client

```typescript
// convex/lib/crane.ts
import { CraneClient } from "@trestleinc/crane/server";
import { components } from "./_generated/api";

export const crane = new CraneClient(components.crane);
```

That's it. The component creates its own tables for blueprints, credentials, and executions - isolated from your application's schema.

---

# Usage

## Create a Blueprint

Blueprints are declarative automation workflows built with the Builder API:

```typescript
import { Builder } from "@trestleinc/crane/client";

const submitIntake = new Builder("submit-intake")
  .input("portalUrl", "string", true)
  .input("firstName", "string", true)
  .input("lastName", "string", true)
  .input("dateOfBirth", "string", true)

  .navigate("{{portalUrl}}")
  .auth()  // Domain-based credential lookup
  .type("first name field", { variable: "firstName" })
  .type("last name field", { variable: "lastName" })
  .type("date of birth field", { variable: "dateOfBirth" })
  .click("submit button")
  .screenshot()
  .extract("confirmation number", "confirmationNumber")

  .build();

// Store in database
await ctx.runMutation(api.crane.blueprints.create, submitIntake);
```

## Set Up the Vault

Credentials are encrypted client-side before storage:

```typescript
import { setupVault, saveCredential, unlockVault } from "@trestleinc/crane/client";

// One-time setup (client-side)
await setupVault(masterPassword, ctx);

// Save credentials (client-side encryption)
const { vaultKey } = await unlockVault(masterPassword, vault);
await saveCredential(vaultKey, {
  label: "HMIS Portal",
  domain: "portal.hmis.gov",
  fields: [
    { key: "username", value: "user@org.com", type: "username" },
    { key: "password", value: "secret123", type: "password" },
  ],
}, ctx);
```

## Execute a Blueprint

```typescript
import { Executor, createStagehandAdapter, createVaultCredentialProvider } from "@trestleinc/crane/server";

// Create browser adapter
const adapter = await createStagehandAdapter({
  blueprintId: "submit-intake",
  contextId: vault.browserbaseContextId,
});

try {
  const executor = new Executor(components.crane, adapter);
  const result = await executor.run(ctx, "submit-intake", {
    portalUrl: "https://portal.hmis.gov",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
  }, {
    credentials: createVaultCredentialProvider(ctx, orgId, vaultKey),
  });

  console.log("Confirmation:", result.outputs.confirmationNumber);
} finally {
  await adapter.close();
}
```

## Integration with Bridge (Optional)

Register Crane as a Bridge callback for reactive automation:

```typescript
import { bridgeClient } from "./bridge";
import { Executor, createStagehandAdapter, createVaultCredentialProvider } from "@trestleinc/crane/server";

// Register Crane as a Bridge callback
bridgeClient.registerCallback("automation", async (ctx, deliverable, context) => {
  const adapter = await createStagehandAdapter({
    blueprintId: deliverable.callbackConfig.blueprintId,
    contextId: vault.browserbaseContextId,
  });

  try {
    const executor = new Executor(components.crane, adapter);
    const result = await executor.run(ctx, deliverable.callbackConfig.blueprintId, {
      portalUrl: deliverable.callbackConfig.portalUrl,
      firstName: context.variables.firstName,
      lastName: context.variables.lastName,
      dateOfBirth: context.variables.dateOfBirth,
    }, {
      credentials: createVaultCredentialProvider(ctx, orgId, vaultKey),
    });

    return result;
  } finally {
    await adapter.close();
  }
});
```

---

# Technical Deep Dive

## Blueprint Structure

A blueprint is a **sequence of tiles** (automation steps):

```mermaid
flowchart LR
    subgraph BLUEPRINT["Blueprint: Submit Form"]
        T1["NAVIGATE<br/>{{url}}"]
        T2["AUTH<br/>domain lookup"]
        T3["TYPE<br/>name field"]
        T4["CLICK<br/>submit"]
        T5["SCREENSHOT"]
        T6["EXTRACT<br/>confirmation"]
    end

    T1 --> T2 --> T3 --> T4 --> T5 --> T6
```

## Tile Types

| Type | Parameters | Description |
|------|------------|-------------|
| `NAVIGATE` | `url` | Go to URL (supports `{{variable}}`) |
| `CLICK` | `instruction` | Click element (natural language) |
| `TYPE` | `instruction`, `value`/`variable`/`credentialId` | Type into field |
| `EXTRACT` | `instruction`, `outputVariable`, `schema?` | Extract data |
| `SCREENSHOT` | `fullPage?` | Capture screenshot |
| `WAIT` | `ms` or `condition` | Wait for time/condition |
| `SELECT` | `instruction`, `value` | Select dropdown option |
| `AUTH` | *(domain-based)* | Login using stored credentials |
| `FORM` | `fields[]` | Fill multiple fields |

## Credential Vault Architecture

### Key Hierarchy

```mermaid
flowchart TB
    subgraph USER["Interactive Access"]
        MP["Master Password<br/>(never stored)"]
        MK["Master Key<br/>PBKDF2(password, salt)"]
        MP -->|"derives"| MK
    end

    subgraph VAULT["Vault Keys"]
        VK["Vault Key<br/>(random 256-bit)"]
        MK -->|"decrypts"| VK
        VK -->|"encrypts"| CREDS["Encrypted Credentials<br/>AES-256-GCM"]
    end

    subgraph AUTOMATION["Automated Access"]
        M2M["M2M Token<br/>OAuth client_credentials"]
        MKEY["Machine Key<br/>(encrypted with vault key)"]
        M2M -->|"authorizes"| MKEY
        MKEY -->|"decrypts via vault"| CREDS
    end
```

### Security Model

| Server Never Sees | Server Stores |
|-------------------|---------------|
| Master password | Encrypted vault key |
| Master key (derived) | Encrypted machine key |
| Vault key (plaintext) | Encrypted credentials |
| Credential plaintext | Salt, iterations |
| | Verification hash |

### Encryption Details

- **Algorithm**: AES-256-GCM
- **Key derivation**: PBKDF2 with 100,000 iterations
- **Salt**: Random 256-bit per vault
- **IV**: Random 96-bit per credential

## AI-Powered Element Detection

Crane uses Stagehand 3's observe-act pattern for reliable element detection:

```mermaid
sequenceDiagram
    participant E as Executor
    participant S as Stagehand
    participant LLM as LLM (Gemini)
    participant B as Browser

    Note over E,B: OBSERVE phase (LLM call)
    E->>S: observe("login button")
    S->>LLM: Identify element
    LLM-->>S: Element selector + metadata
    S-->>E: ObserveResult[]

    Note over E,B: ACT phase (NO LLM - fast)
    E->>S: act(observeResult)
    S->>B: Direct DOM interaction
    B-->>S: Action complete
    S-->>E: ActResult
```

**Benefits over CSS selectors:**
- Natural language instructions ("click the submit button")
- Resilient to UI changes
- No maintenance when layouts change
- Cached observations for repeated runs

## Execution Flow

```mermaid
sequenceDiagram
    participant T as Trigger
    participant E as Executor
    participant V as Vault
    participant A as BrowserAdapter
    participant P as Portal

    T->>E: run(blueprintId, variables)
    E->>E: Fetch blueprint
    E->>E: Create execution record

    loop Each Tile
        E->>E: Interpolate variables

        alt AUTH tile
            E->>V: getCredentialByDomain(domain)
            V-->>E: Decrypted credentials
        end

        E->>A: Execute tile action
        A->>P: Browser interaction
        P-->>A: Result
        A-->>E: Tile result

        alt SCREENSHOT tile
            E->>E: Store artifact
        end
    end

    E->>E: Update execution status
    E-->>T: ExecutionResult
```

## Browser Adapter Interface

Crane uses a pluggable adapter pattern for browser control:

```typescript
interface BrowserAdapter {
  navigate(url: string): Promise<void>;
  act(instruction: string): Promise<{ success: boolean }>;
  extract<T>(instruction: string, schema?: unknown): Promise<T>;
  screenshot(options?: { fullPage?: boolean }): Promise<Buffer>;
  currentUrl(): Promise<string>;
  close(): Promise<void>;
}
```

**Available adapters:**
- `createStagehandAdapter()` - AI-powered (recommended)
- `createPlaywrightAdapter()` - Direct Playwright control
- Custom adapters for specialized needs

## Persistent Browser Contexts

Browser state (cookies, localStorage) persists across executions:

```mermaid
%%{init: {'theme': 'neutral'}}%%
stateDiagram-v2
    [*] --> NoContext: First execution
    NoContext --> CreateContext: Create context
    CreateContext --> StoreId: Save context ID

    StoreId --> UseContext: Next execution
    UseContext --> CheckAuth: Load context
    CheckAuth --> LoggedIn: Cookies valid
    CheckAuth --> RunAuth: Cookies expired
    RunAuth --> LoggedIn: AUTH tile
    LoggedIn --> Execute: Run tiles
    Execute --> PersistState: persist=true
    PersistState --> [*]
```

Benefits:
- Skip login on subsequent runs
- Maintain session state
- Reduce execution time

---

# Component Ecosystem

Crane is part of a family of Convex components that work together:

| Component | Purpose | Integration |
|-----------|---------|-------------|
| **[Bridge](/journal/bridge-reactive-data)** | Reactive data pipelines | Deliverables trigger blueprint execution |
| **[TSP](/journal/tsp-data-contracts)** | Data contracts | Stack submissions executed via blueprints |
| **[Taxonomy](/journal/taxonomy-data-governance)** | Data governance | Credential access respects clearance levels |
| **[Replicate](/journal/replicate-local-first)** | Offline-first sync | Automation requires online vault access |

Each component is independently installable. Use one, some, or all - they compose cleanly because each runs in isolated tables.

---

# Conclusion

Browser automation shouldn't compromise security. By combining declarative blueprints with a zero-knowledge credential vault:

1. **Drop-in installation** - `npm install` and `app.use()`
2. **Declarative workflows** - Blueprints are data, not code
3. **Zero-knowledge credentials** - Server never sees plaintext
4. **AI-powered detection** - Natural language, not brittle selectors
5. **Pluggable backends** - Swap browser engines as needed
6. **Persistent contexts** - Maintain session state across runs

The pattern applies universally: government portal submissions, legacy system integration, web scraping, automated testing. Any Convex application that needs to automate web interfaces benefits from secure credential handling.

Install the component, define your blueprints, and automate securely.
