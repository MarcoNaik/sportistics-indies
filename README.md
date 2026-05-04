# Sportistics — Volleyball Coach PWA + 4 Struere Agents

A volleyball-club tool for coaches: roster, schedule, callups (per-match availability), training-load tracking, live event recording, per-player stats. The frontend is a React + Vite + Zustand SPA with Spanish UI strings and English domain types. The backend is [Struere](https://struere.dev) — 5 entity types, 4 agents (chat widget, WhatsApp inbound, voice outbound, email cron), 1 role, 12 custom tools, and 1 cron trigger that orchestrates all four agents end-to-end.

This repo serves two audiences:

- **HACK@LATAM workshop attendees (Tue May 6, 30 min)**: a starter kit you can fork, extend, and ship a volleyball-adjacent PWA from in a weekend.
- **Struere team + community**: the canonical worked example referenced from the [Struere Voice Agent Cookbook](https://docs.struere.dev/integrations/voice-cookbook). Every pattern in the cookbook (dual-mode voice agent, sync-time lints, `agent.chat` orchestration, flat-tuple storage for agent-driven entities) is exercised here on real volleyball domain data.

## Branches as workshop steps

The repo's three feature branches are the workshop's three steps. Each branch is a strict extension of the previous; `main` is the same commit as `03-agent-automations`.

| Branch | Step | What's added |
|---|---|---|
| `main` | Final state | Everything below combined (`origin/main` == `03-agent-automations`) |
| `01-struere-setup` | Step 1 | Struere CLI installed, project scaffolded with `struere init`, `struere-developer` skill loaded |
| `02-cloud-database` | Step 2 | 5 entity types defined; SPA rewired off mocks through the Struere SDK; `.env.example` + dev API key |
| `03-agent-automations` | Step 3 | 4 agents + 12 tools + 1 role + 1 cron trigger + chat widget wired to `coach-stats` — equals `main` |

Workshop attendees can `git checkout <branch>` to see the state at any step. Each branch transition is paired with one of the prompts below: paste **Prompt 1** into Claude Code starting from `main` to land on `01-struere-setup`, **Prompt 2** to go from `01-struere-setup` to `02-cloud-database`, **Prompt 3** to go from `02-cloud-database` to `03-agent-automations`. The prompts in this README are byte-identical to the ones used in the live workshop.

## Quick start

```bash
git clone https://github.com/MarcoNaik/sportistics-indies.git
cd sportistics-indies
bun install
cp .env.example .env.local   # fill in VITE_STRUERE_API_KEY (see "Setup walkthrough")
bun run dev
```

The SPA boots on `main` (final state) with an empty UI — entities are read from your Struere dev environment, and a fresh environment has no rows. Add a Player, Match, or Training Session through the UI and it will persist; reload the page and it stays. That's the green light: the SPA is reading and writing through Struere.

## Prerequisites & accounts to create

Tick these off before you start step 1. Items 1–4 are mandatory for the SPA + the `coach-stats` chat widget; items 5–7 are mandatory for the WhatsApp + voice + email agents (steps 4–6 of the setup walkthrough below).

- [ ] **Bun ≥ 1.2** — https://bun.sh — used for everything; never npm in this repo.
- [ ] **Struere account + at least one organization** — https://struere.dev. The workshop assumes the **Pro plan** since 4 agents > free-tier cap of 3.
- [ ] **Struere CLI ≥ 0.14.8** — `bun install -g struere@latest`. The 0.14.8 release added sync-time lints that catch the most common voice-agent misconfigurations before you ever run an agent. Older versions need extra type casts and a `.struere/` patch loop that this material no longer covers.
- [ ] **`struere-developer` skill** in your Claude Code (or any agent harness with skill support) — `npx skills add MarcoNaik/struere-skill --all --yes` (run from this repo's root). The skill is the SDK source of truth: `defineData`, `defineAgent`, `entity.query` semantics, and CLI workflow live there. The three workshop prompts assume it's loaded.
- [ ] **Twilio account + one outbound-capable phone number** — https://twilio.com. Powers `voice-suplente` (the agent that calls a substitute when a starter cancels).
- [ ] **Kapso/WhatsApp Business connection** — https://kapso.io. Powers `whatsapp-callup`. Set up via `bunx struere whatsapp enable` + `bunx struere whatsapp setup` from inside `struere/` (commands below).
- [ ] **Resend account** — https://resend.com. Powers `email.send` for the weekly digest agent.
- [ ] **OpenAI API key with Realtime API access** — required for `voice-suplente`. Configured at the org level on the Struere backend, not in this repo.

## Setup walkthrough

The end-to-end path from a fresh clone to a fully integrated workspace. Run these in order.

### 1. Repo + frontend

```bash
git clone https://github.com/MarcoNaik/sportistics-indies.git
cd sportistics-indies
bun install
cp .env.example .env.local
bun run dev
```

`bun run dev` will fail-fast until `VITE_STRUERE_API_KEY` is filled in (step 3). Leave the dev server running once it's healthy — never restart it manually during the workshop; the prompts assume it stays up.

### 2. Struere project + login

```bash
struere logout
struere login            # opens a browser; complete the login
cd struere
struere init             # only on a fresh repo; this clone retains the project — use `struere pull` instead
struere pull             # pulls down the current cloud state
bunx struere sync        # validates everything passes the 0.14.8+ sync-time lints
```

If `bunx struere sync` fails with `Access denied: you are not a member of organization X`, you logged in as the wrong account. Run `struere logout && struere login` again under the org-admin account.

### 3. Create the dev API key for the SPA

```bash
cd struere
bunx struere keys create --name "vite-spa-dev" --env development --json
```

Copy the `key` field from the JSON output and paste it into `.env.local` at the project root:

```bash
VITE_STRUERE_API_KEY=sk_...
```

`.env.local` is `.gitignore`d. **Never commit it.**

### 4. Connect Twilio (powers `voice-suplente`)

Grab `Account SID` and `Auth Token` from the Twilio Console, and provision a voice-capable phone number. Then bind the number directly to the `voice-suplente` agent:

```bash
bunx struere integration twilio \
  --account-sid <SID> \
  --auth-token <TOKEN> \
  --phone-number <+E164> \
  --agent voice-suplente \
  --yes
```

`--yes` skips the confirmation prompt. No router file is needed unless you want to customize `voiceConfig` — the cookbook walks both paths: https://docs.struere.dev/integrations/voice-cookbook.

### 5. Connect WhatsApp via Kapso (powers `whatsapp-callup`)

```bash
cd struere
bunx struere whatsapp enable --environment development
bunx struere whatsapp setup --environment development
bunx struere whatsapp set-agent --slug whatsapp-callup --environment development
```

The middle command opens a Kapso hosted setup link in your browser — complete the WhatsApp Business handshake there, then return to the terminal.

### 6. Connect Resend (powers `weekly-digest`)

Create a Resend account and grab an API key + a verified `from` email. Then:

```bash
bunx struere integration resend \
  --api-key <KEY> \
  --from-email <EMAIL> \
  --yes
```

### 7. Verify everything is healthy

```bash
bunx struere status
bunx struere doctor
```

`status` should show **4 agents, 5 entity types, 1 role, 12 tools, 1 trigger**. `doctor` should show no errors. Any sync warnings about `whatsapp.send` / `voice.call` / `email.send` not being connected are expected if you skipped a step above — the warnings are workshop-host setup gaps, not code bugs.

## The three prompts

Each prompt is a single message you paste into Claude Code (or any agent harness with the `struere-developer` skill loaded) at the start of a working session. The agent does the rest. The prompts defer to https://docs.struere.dev for canonical patterns — they give the volleyball-specific context but assume the implementing agent has read the cookbook before writing voice-agent code.

> **Required reading before running these prompts.** Voice agents → https://docs.struere.dev/integrations/voice-cookbook ; platform gotchas (filter syntax, soft-delete, closed schema) → https://docs.struere.dev/platform/gotchas ; per-integration footguns are on each integration's page. Voice failure modes specifically: https://docs.struere.dev/integrations/voice#footguns.

Branches and prompts pair 1-to-1:

| Step | Branch | Prompt |
|------|--------|--------|
| 1 | `01-struere-setup` | Struere onboarding |
| 2 | `02-cloud-database` | Define entities + wire SPA through Struere |
| 3 | `03-agent-automations` | Build 4 agents + chat widget |

---

### **Prompt 1 — Struere setup**

> Branch you're on: `main` → ends on `01-struere-setup`.
> Time: ~2 min.

Paste this into Claude Code (with the `struere-developer` skill installed) starting from branch `main`. The agent will land you on `01-struere-setup`.

```
I want to set up a Struere project (https://struere.dev) — an AI agent platform where I define agents, data types, roles, and automations as TypeScript code.

## Environment Setup

Before running any commands, ensure bun is in your PATH:
  export PATH="$HOME/.bun/bin:$PATH"

If `bun --version` still fails, install bun first:
  curl -fsSL https://bun.sh/install | bash

## Step 1: Install the Struere CLI
  bun install -g struere

## Step 2: Authenticate and initialize the project
First, ensure a fresh login (logout first to clear any stale tokens):
  struere logout
  struere login
(This opens a browser — wait for me to complete the login)

Then initialize the project:
  struere init
(This will ask me to select an organization if I have more than one — let me choose)

Then pull any existing configurations:
  struere pull

## Step 3: Install the Struere developer skill
Run: npx skills add MarcoNaik/struere-skill --all --yes
If npx is not found, try: $HOME/.bun/bin/bunx skills add MarcoNaik/struere-skill --all --yes

After completing these steps, show me the project structure and summarize what was set up. If any step fails, show me the error and suggest a fix.

Documentation: https://docs.struere.dev/llms.txt
```

---

### **Prompt 2 — Define entities and wire the SPA**

> Branch you're on: `01-struere-setup` → ends on `02-cloud-database`.
> Time: ~5 min.

Paste this into Claude Code (with the `struere-developer` skill installed) starting from branch `01-struere-setup`. The agent will land you on `02-cloud-database`.

```
You are building the storage layer of Sportistics on Struere. Requires Struere CLI ≥ 0.14.8 — older versions need additional casts and patches that this prompt does not cover; assume 0.14.8 throughout. The frontend (Vite + React + Zustand) currently runs on in-memory mocks. After this prompt, the SPA reads and writes through Struere instead. The `struere-developer` skill at `.claude/skills/struere-developer` is the SDK source of truth — consult it for `defineData`, `entity.query` semantics, and CLI workflow. Do not duplicate skill content; reference it.

For SDK gotchas that aren't covered below, see https://docs.struere.dev/platform/gotchas.

Read these files first to ground yourself in the domain and decisions:
- `CONTEXT.md` (domain glossary — Player, ClubMatch, MatchCallup, TrainingSession, VolleyballEvent)
- `docs/adr/0001-callup-availability-as-source-of-truth.md` (in-memory MatchCallup keeps its `availability` map shape — do not normalize it inside the frontend)
- `src/domain/types.ts`, `src/domain/callup.ts`, `src/domain/training.ts`, `src/domain/player.ts` (existing domain modules)
- `src/store/useStore.ts` (the Zustand store you will rewrite)
- `src/App.tsx` and `src/main.tsx`
- `struere/struere.json` (the project config the previous prompt created)

Then build, in order:

1. **Entity types in `struere/entity-types/`** — one file per slug, default-exporting `defineData(...)`. Five slugs:
   - `player` — mirrors the `Player` type (`name`, `number`, `aliases[]`, `position`, `category`, `status`, `phone`, `guardianName`, `guardianPhone`, `notes`). `searchFields: ['name', 'number', 'aliases']`. Required: `name`, `number`, `position`.
   - `club-match` — mirrors `ClubMatch` (`date`, `time`, `opponent`, `location`, `competition`, `status` enum scheduled|live|finished, `notes`). Required: `date`, `time`, `opponent`.
   - `callup` — flat-tuple shape `{ matchId, playerId, availability, notes? }`. Each `matchId` and `playerId` declares `references: 'club-match'` and `references: 'player'` respectively. Availability is the enum pending|available|unavailable|maybe. ONE row per `(matchId, playerId)` pair. This is the architectural decision in ADR-0002 — agents naturally update individual tuples without read-modify-write of a whole list.
   - `training-session` — array-of-records form: `{ date, time, focus, location, loads: Array<{ playerId, present, minutes, rpe, fatigue, pain, notes? }>, notes? }`. Different access pattern than callup (the coach views all loads of a session together; no agent updates a single load tuple-at-a-time).
   - `volleyball-event` — mirrors `VolleyballEvent` (`matchId` references `club-match`, `playerId` references `player`, `sequence`, `createdAt`, `teamSide`, `playerName`, `actionType`, `result`, `pointFor`, `source`, `rawTranscript`, `notes`).
   Add a barrel file `struere/entity-types/index.ts` re-exporting each slug — Struere picks them up.

2. **Sync to dev**: `cd struere && bunx struere sync`. Then `bunx struere status` and confirm five entity types are registered.

3. **ADR for the flat-Callup decision** — write `docs/adr/0002-flat-callup-tuples-at-storage.md`. One paragraph, prose style, no internal headings — match ADR-0001's tone exactly. Cite ADR-0001 as the in-memory shape decision and explain that ADR-0002 is the storage-side complement: per-tuple rows on the wire, `Record<playerId, Availability>` in memory, with the Callup module as the only mediator between the two shapes. Note that TrainingSession does NOT follow the same flattening — its access pattern is whole-session, no per-load agent activity.

4. **Add the SDK as a runtime dep on the SPA**: from project root (NOT `struere/`), run `bun add struere@^0.14.8`. The CLI binary is global; the runtime package needs to be a project dep so `import { StruereClient } from 'struere/client'` resolves.

5. **Configure the API key for the Vite app**:
   - Verify `.gitignore` at project root covers `*.local` (so `.env.local` is not committed). Add the pattern if missing.
   - Create `.env.example` at project root with `VITE_STRUERE_API_KEY=` and a one-line comment.
   - Generate a development key: `cd struere && bunx struere keys create --name "vite-spa-dev" --env development --json`. Take the `key` field from the JSON output and write it to `.env.local` as `VITE_STRUERE_API_KEY=...`. NEVER commit `.env.local`.

6. **Build the typed client wrapper at `src/lib/struere.ts`**:
   - One `StruereClient` instance from the `struere/client` subpath (NOT the bare `struere` import — `struere` is the CLI/SDK author API, `struere/client` is the consumer SDK). Pass `apiKey: import.meta.env.VITE_STRUERE_API_KEY as string`.
   - Per-entity namespaces: `struere.player`, `struere.clubMatch`, `struere.callup`, `struere.trainingSession`, `struere.volleyballEvent`.
   - Each (except callup): `list, get, create, update, remove`. The Struere SDK returns `Entity<T> = { id, data: T }`; flatten to `{ id, ...data }` on read and lift back on write so the call sites in the store look like plain CRUD on domain types.
   - **`callup`** does NOT expose generic `get/create/update/remove`. It exposes: `list`, `setAvailability`, `removeEntry`, `removeForMatch`, `removeForPlayer`. `list` aggregates the flat rows back into the in-memory `MatchCallup[]` shape via `Callup.fromRows`. `setAvailability(matchId, playerId, value)` queries by `(matchId, playerId)` (use `filters: { 'data.matchId': matchId, 'data.playerId': playerId }`), updates if found, else creates. `removeForMatch(matchId)` and `removeForPlayer(playerId)` `Promise.all`-delete every matching tuple — used by the cascades in the store.
   - For `trainingSession`, route through `Training.fromRow` / `Training.toRow` projection helpers in `src/domain/training.ts` (the in-memory shape has `loads: Record<playerId, TrainingLoad>`; the storage row has `loads: TrainingLoad[]`). Add those helpers in step 7.
   - Pass `status: 'active'` on every `list` and `query` call — soft-deleted tombstones must not surface in the UI.
   - Export a `chat(params)` helper that wraps `client.chat(...)` — Prompt 3 will use it.

7. **Domain projection helpers** — extend the existing modules; do not create new files:
   - `src/domain/callup.ts`: add the `CallupRow` type (`{ id, matchId, playerId, availability, notes? }`), `Callup.fromRows(rows): MatchCallup[]` (group by `matchId`, last-wins on duplicate `(matchId, playerId)` since the storage layer is last-write-wins), `Callup.toRows(callup): CallupRow[]` (split a `MatchCallup` into tuples). Also add `Callup.create(callups, matchId)` (returns the list with an empty `MatchCallup` appended if not present) and `Callup.removePlayerEverywhere(callups, playerId)` (drops the player from every callup's `availability` map).
   - `src/domain/training.ts`: add the `TrainingSessionRow` type (with `loads: TrainingLoad[]`), `Training.fromRow(row): TrainingSession`, `Training.toRow(session): TrainingSessionRow`. Also add `Training.setLoad(sessions, sessionId, playerId, partial)` (returns the new sessions list) and `Training.removePlayerEverywhere(sessions, playerId)`.
   - Add round-trip tests in `src/domain/callup.test.ts` and `src/domain/training.test.ts`. The Callup test must include the duplicate-tuple last-wins case explicitly — two rows with the same `(matchId, playerId)` and different `availability` must collapse to the last row's value.

8. **Rewrite `src/store/useStore.ts`**:
   - Drop the `mocks.ts` seed import. Initial entity arrays empty.
   - Add `status: 'idle' | 'loading' | 'ready' | 'error'` and `error: string | null`.
   - Add a `loadAll()` action that fans out 5 `struere.*.list()` calls in parallel and sets `status: 'ready'` on success, `status: 'error'` with the message on failure.
   - Convert every mutation to async pessimistic — `await struere.*` first, then `set(...)` with the result. Order matters: persist, then mirror.
   - **`removePlayer` cascade**: `Promise.all([struere.callup.removeForPlayer(id), ...trainingSessionUpdates, struere.player.remove(id)])`. The training updates come from `Training.removePlayerEverywhere` — only the sessions whose loads actually changed.
   - **`addMatch`** does `struere.clubMatch.create()`. DO NOT create an empty callup row on the server — empty `MatchCallup` is the natural absence of rows in the flat storage model. The in-memory `Callup.create` mirror is fine.
   - Cascade on `removeMatch`: `struere.callup.removeForMatch(id)` then `struere.clubMatch.remove(id)`.

9. **Rewrite `src/App.tsx`**:
   - `useEffect(() => { useStore.getState().loadAll(); }, []);` — call via `getState()`, not via a selector that depends on `loadAll`. In Zustand v5 `useStore((s) => s.loadAll)` returns a fresh function reference each render and re-fires the effect on every render. The empty-deps `getState()` form is the only correct one.
   - While `status === 'idle' || 'loading'`, render a centered "Cargando…" splash.
   - While `status === 'error'`, render a rose card with the error and a "Reintentar" button calling `useStore.getState().loadAll()`.
   - Render the existing `<BrowserRouter>` only when `status === 'ready'`.

10. **Defensive service-worker unregister in `index.html`** — earlier PWA experiments leave SW registrations on `localhost:5173`, which intercepts fetches and breaks dev. Add a small inline `<script>` near the top of `<body>` that, on page load, calls `navigator.serviceWorker.getRegistrations()` and unregisters every one. Idempotent, no-op when there are none.

11. **SDK code patterns the agent must follow (0.14.8):**
    - **Filter syntax**: prefix domain JSON fields with `data.` in `entity.query` / `client.data.query` / `scopeRules` — e.g., `filters: { 'data.matchId': id }`. Top-level columns (`id`, `type`, `status`, `createdAt`, `updatedAt`) stay bare. Equality is default; `$eq | $neq | $in | $contains | $gt | $lt | $gte | $lte | $exists` are available.
    - **Soft-delete**: pass `status: 'active'` on every `list`/`query` so tombstones don't surface (the entity-level `status` column, distinct from any domain `status` field).
    - The `defineData` schema is closed: no `additionalProperties`, `if/then/else`, or `oneOf/allOf` — the flat-Callup decision is partly because `Record<id, X>` cannot be persisted under that closed schema.

12. **Verify end-to-end**:
    - From project root: `bunx tsc --noEmit` clean.
    - From `struere/`: `bunx tsc --noEmit` clean.
    - `bun test src/domain/callup.test.ts src/domain/training.test.ts` green (round-trip + duplicate-tuple last-wins case).
    - `cd struere && bunx struere sync` reports the 5 entity types as registered.
    - `bun run dev`, hard-reload the browser. You should see the brief "Cargando…", then an empty UI (no entities yet — that is correct). Add a player via the Roster page; the create persists; reloading the page shows the player still present. That is the green light: the SPA is reading and writing through Struere.

The final repo state for `02-cloud-database` matches the branch on disk. Commit the work to `02-cloud-database` when verification is green. UI copy stays Spanish; identifiers stay English; bun, never npm; no comments in any code you write.
```

---

### **Prompt 3 — Define 4 agents + tools + role + chat widget**

> Branch you're on: `02-cloud-database` → ends on `03-agent-automations`.
> Time: ~5 min.

Paste this into Claude Code (with the `struere-developer` skill installed) starting from branch `02-cloud-database`. The agent will land you on `03-agent-automations`.

```
You are building the agent layer of Sportistics on Struere. Five entity types exist (`player`, `club-match`, `callup`, `training-session`, `volleyball-event`) and the SPA reads/writes through `src/lib/struere.ts`. Now you are adding 4 agents that act on those entities across chat, WhatsApp, voice, and cron+email — and wiring the existing chat widget in the SPA to the first one. The `struere-developer` skill at `.claude/skills/struere-developer` is the SDK source of truth — consult it for `defineAgent`, `defineTools`, `defineRole`, `defineTrigger`, and the agent runtime's tool-call shape. Do not duplicate skill content.

Read these files first to ground yourself:
- `Indies x Struere Workshop - Architecture.md` lines 21–78 (the per-agent specs — names, channels, tools, system-prompt skeletons)
- `CONTEXT.md` (domain glossary — used in the agent system prompts)
- `src/lib/struere.ts` — the SPA wrapper. The `set_availability` tool must mirror its `setAvailability` upsert logic exactly so SPA writes and agent writes agree on the same row.
- `src/components/AgentPanel.tsx` — the existing chat widget. Disabled input + Send + suggestions + Sparkles icon are already in place. You are enabling them.
- `src/store/useStore.ts` — only to confirm what mutations exist; agents bypass the store and go straight to entities.

Then build, in order:

1. **Four agents in `struere/agents/`** — one file per slug, default-exporting `defineAgent(...)`. Spanish system prompts, terse, instruction-heavy. Use `{{organizationName}}`, `{{currentTime}}`, `{{threadContext.channel}}`, `{{threadContext.params.*}}` template variables where relevant. **Every agent MUST declare `roles: ['coach-bot']`** in its `defineAgent` config — that's the agent-role binding in 0.14.8+. **Read the voice cookbook before writing voice-agent code: https://docs.struere.dev/integrations/voice-cookbook.** Slugs:
   - **`coach-stats`** — read-only DB widget. `roles: ['coach-bot']`. Tools: `query_stats`, `query_player`, `query_match`, `list_players`, `list_matches`. System prompt explains the entities the agent can read, the tools, and the rules: use `query_player` to resolve a name to an id before calling `query_stats({ playerId })`; for "último partido" use `list_matches({ status: 'finished' })` and take the most recent; never invent data. `firstMessageSuggestions` are three Spanish coach questions ("¿Quién marcó más puntos este mes?", "¿Cuántos jugadores hay activos?", "¿Cómo terminó el último partido?"). `model: { model: 'openai/gpt-5-mini', temperature: 0.3 }`.
   - **`whatsapp-callup`** — WA inbound. `roles: ['coach-bot']`. Tools: `get_player_by_phone`, `list_matches`, `set_availability`, `whatsapp.send`, `agent.chat`. System prompt FORCES this order: extract phone → `get_player_by_phone` → if null, send "no te tengo registrado" via `whatsapp.send` and stop → `list_matches({ status: 'scheduled' })` and take the first → parse the player's natural-language reply into available|unavailable|maybe → `set_availability({ matchId, playerId, value })` → `whatsapp.send` confirming. The hint to call `list_matches` is load-bearing: without it the agent invents matchIds. On `value === 'unavailable'`, AFTER confirming, call `agent.chat({ agentSlug: 'voice-suplente', message: 'El jugador <name> canceló para el partido <matchId> (<date> vs <opponent>). Llama a un suplente activo y confírmalo.' })`. `temperature: 0.2`.
   - **`voice-suplente`** — Twilio outbound. `roles: ['coach-bot']`. Tools (5, at the cap): `get_replacement_candidates`, `set_availability`, `voice.call`, `list_matches`, `list_players`. Spanish rioplatense, frases cortas. Operates in two modes: orchestrator (text, invoked via `agent.chat` from `whatsapp-callup` — pick a candidate, call `voice.call`, end) and voice-session (inside the live OpenAI Realtime call — silent setup → greet once → branches → never re-greet). Follow the dual-mode pattern from the cookbook (https://docs.struere.dev/integrations/voice-cookbook); we use the single-agent two-mode shape for volleyball (the cookbook walks both paths). Pass `agentSlug: 'voice-suplente'` to `voice.call` — the SDK lints this at sync time in 0.14.8; per-integration footguns: https://docs.struere.dev/integrations/voice#footguns. Volleyball-specific anchors for the prompt: cache nearest-match opponent + date during silent setup (otherwise the agent hallucinates rivals); greeting is `"Hola, soy el bot del coach de {{organizationName}}. Tenemos un partido el <date> contra <opponent> y necesitamos un suplente. ¿Podés jugar?"`; confirmations call `set_availability({ matchId, playerId, value: 'available' })` then end; one sentence per turn, max 3 names if listing the squad, never speak IDs aloud. The current `struere/agents/voice-suplente.ts` is the canonical illustrative reference for exact Spanish phrasing — read it before writing the prompt; attendees write their own. `model: { model: 'openai/gpt-5-mini', temperature: 0.4 }`.
   - **`weekly-digest`** — cron Sunday 20:00 in `America/Santiago`. `roles: ['coach-bot']`. Tools: `build_digest`, `email.send`. System prompt: compute `from = currentTime - 7 days at 00:00:00Z`, `to = currentTime` → `build_digest({ from, to })` returns `{ body, counts }` → `email.send({ to, subject: 'Resumen semanal Sportistics', text: body })`. The destination email comes from `threadContext.params.coachEmail`; if empty or missing `@`, fall back to `coach@sportistics.dev`. Validate the `@` BEFORE calling `email.send`. Declare `threadContextParams: [{ name: 'coachEmail', type: 'string', required: false, description: '...' }]`. `temperature: 0.3`.

   Each agent gets the sensible default `maxTokens: 4096` — do not override unless you have a measured reason. The `whatsapp-callup` agent in particular needs the full default: it does multi-step reasoning, several tool calls, and `agent.chat` orchestration.

2. **Ten custom tools in `struere/tools/index.ts`** — single file, all custom tools. Default-export `defineTools([...])`. Schemas in JSON Schema; handlers `async (args, context, struere, fetch) => ...`. Pull row data with `(e.data ?? e)` and lift `id` to the top so handlers return clean records.
   - `query_stats({ matchId?, playerId?, fromDate?, toDate? })` — `entity.query({ type: 'volleyball-event', limit: 1000, status: 'active' })`, then filter in JS. Aggregate per `playerId`: `points` (actionType === 'point'), `kills` (result === 'kill'), `aces` (result === 'ace'), `errors` (result === 'error'), `total`. Return `{ count, byPlayer }` sorted by `points` desc.
   - `query_player({ name?, number?, phone? })` — substring match on name (case-insensitive), exact on number, exact on `phone` OR `guardianPhone`. Filter in JS.
   - `query_match({ matchId })` — `entity.get({ id: matchId })` for the match; `entity.query({ type: 'callup', filters: { 'data.matchId': matchId } })` for the callup rows; `entity.query({ type: 'volleyball-event', filters: { 'data.matchId': matchId } })` for events; derive `score: { home, away }` from `pointFor`. Return `{ match, callups, score, eventCount }`.
   - `list_players({ status? })` — needed because `query_player` is search-by-attribute, not list-all. Fetch with `status: 'active'` (entity-level soft-delete), then filter in JS by `data.status === status` if a status is passed.
   - `list_matches({ status? })` — same pattern, filter by `data.status` (scheduled|live|finished). Sort by `date` ascending.
   - `get_player_by_phone({ phone })` — fetch active players, return the first whose `phone` OR `guardianPhone` matches. Return `{ player: ... | null }`.
   - `set_availability({ matchId, playerId, value })` — `entity.query({ type: 'callup', filters: { 'data.matchId': matchId, 'data.playerId': playerId }, limit: 1 })` → if found, `entity.update`; else `entity.create`. Mirror the SPA wrapper's `struere.callup.setAvailability` exactly.
   - `get_replacement_candidates({ matchId })` — `entity.query({ type: 'callup', filters: { 'data.matchId': matchId } })` → collect used `playerId`s → `entity.query({ type: 'player' })` → filter in JS to `data.status === 'active'` and `!usedIds.has(p.id)`.
   - `query_events_range({ from, to })` — fetch events; filter in JS by `createdAt >= from && createdAt <= to`.
   - `build_digest({ from, to })` — pure markdown formatter. Internally fetches events / matches / training sessions / players; computes top scorers (top 3 by point+kill+ace count), finished matches in the week, upcoming matches after `to`, training pain reports (`pain >= 5`). Returns `{ body, counts: { events, finishedMatches, upcomingMatches, painReports } }`. The `weekly-digest` agent calls this ONCE per run instead of orchestrating the queries itself — that's why the system prompt forbids `entity.query` and `query_events_range` in that agent.

3. **Role at `struere/roles/coach-bot.ts`**:
   - `defineRole({ name: 'coach-bot', description: '...', policies: [{ resource: 'player', actions: ['list', 'read'], effect: 'allow' }, { resource: 'club-match', actions: ['list', 'read'], effect: 'allow' }, { resource: 'volleyball-event', actions: ['list', 'read'], effect: 'allow' }, { resource: 'training-session', actions: ['list', 'read'], effect: 'allow' }, { resource: 'callup', actions: ['list', 'read', 'create', 'update', 'delete'], effect: 'allow' }] })`. Policies grant: read on every entity slug, plus create/update/delete on `callup`.
   - **Do NOT add `agentAccess` to the role.** That field is a dashboard ACL — it controls which humans holding this role can chat with these agents from the dashboard UI. It is NOT a permission grant and NOT the agent-role binding. The actual agent-role binding goes on the agent side (next step), via `defineAgent({ roles: [...] })`.

4. **Cron trigger at `struere/triggers/weekly-digest-cron.ts`**:
   - `defineTrigger({ name: 'Weekly Digest Cron', slug: 'weekly-digest-cron', description: '...', on: { schedule: '0 20 * * 0', timezone: 'America/Santiago' }, actions: [{ tool: 'agent.chat', args: { agent: 'weekly-digest', message: 'Compila el resumen de la semana y envíalo por email al coach.' } }] })`.

5. **Wire `src/components/AgentPanel.tsx` to `coach-stats`**:
   - The current AgentPanel has Sparkles icon, "Asistente" title, three pre-baked Spanish suggestion buttons, an input, and a Send button — the input/Send are deliberately disabled. The chat infrastructure was built waiting for an agent to plug in. You are flipping the switch.
   - State: `messages: Array<{ id, role: 'user' | 'agent', text: string }>`, `input: string`, `pending: boolean`, `error: string | null`, `threadId: string | undefined`. Persist `threadId` across turns so the agent gets the same conversation thread.
   - Enable the input and Send. Make the three suggestion buttons click-to-send (same path as form submit).
   - `send(text)` wraps `chat({ agentSlug: 'coach-stats', message: text, threadId })` — `chat` is exported from `src/lib/struere.ts` and wraps `client.chat`. On success, append the agent message and update `threadId` from the response. On failure, surface the error.
   - Render messages as bubbles: user right-aligned `bg-brand text-white rounded-br-sm`, agent left-aligned `bg-slate-100 text-slate-900 rounded-bl-sm`. Empty state when `messages.length === 0` (the existing `EmptyState` block is fine — keep its Sparkles + suggestions). "pensando…" indicator while `pending`. Rose error banner above the form on failure.
   - The mobile FAB drawer reuses the same `messages/input/pending/error/threadId` state — share `bodyProps` between the desktop sidebar and the mobile drawer so both surfaces show the same conversation.

6. **Sync to dev**: `cd struere && bunx struere sync`. Confirm 4 agents + 1 trigger + 1 role registered. The 3 integration warnings about `whatsapp.send` / `voice.call` / `email.send` not being connected are EXPECTED if Kapso / Twilio / Resend integrations aren't connected at the dashboard yet — those are workshop-host setup steps, not code bugs. Then `bunx tsc --noEmit` clean from both project root and `struere/`.

   **Twilio + voice agent:** bind the Twilio phone number directly to the agent — `bunx struere integration twilio --account-sid <SID> --auth-token <TOKEN> --phone-number <+E164> --agent voice-suplente --yes`. No router file is needed unless you customize `voiceConfig`; the cookbook walks both paths.

7. **Smoke test the read-only widget end-to-end**: `cd struere && bunx struere chat coach-stats --message "¿cuántos jugadores activos tengo?" --json` should answer with a count grounded in `list_players({ status: 'active' })`, not a permission error and not an invented number. The `--json` output in 0.14.8 includes `executionMeta.toolCalls` directly (the actual tool calls fired during the run), so attendees can verify the tool path without any extra debug flag. Then `bun run dev` and ask the same question through the AgentPanel — the answer should match.

The final repo state for `03-agent-automations` matches the branch on disk. Commit when sync is green and the smoke test passes. UI copy Spanish; identifiers English; bun, never npm; no comments in any code.
```

## Domain & architecture

The full glossary lives in [`CONTEXT.md`](./CONTEXT.md). Compressed view:

**Five entity types** (Struere = the database; the SPA reads/writes through the SDK, so agents and the UI share one source of truth):

- **Player** — a person on the club's roster. `category` ∈ Sub-14 | Sub-16 | Sub-18 | Adult; Youth players require `guardianName` + `guardianPhone`. `status` ∈ active | injured | inactive.
- **ClubMatch** — a scheduled match (`date`, `time`, `opponent`, `location`, `competition`, `status` ∈ scheduled | live | finished).
- **Callup** — flat-tuple `(matchId, playerId, availability)` row. Availability ∈ pending | available | unavailable | maybe. One row per pair. **Absence of a row = the player is not in the callup at all** (distinct from `pending`).
- **TrainingSession** — array-of-records: one entity per session, with a `loads[]` array (one entry per attending player containing `present`, `minutes`, `rpe`, `fatigue`, `pain`).
- **VolleyballEvent** — something that happened in a live match (`actionType`, `result`, `pointFor`, `playerId`, `matchId`). Aggregates into `PlayerStats` — never stored, always derived.

**Two architectural decisions** (full prose in [`docs/adr/`](./docs/adr/)):

- [**ADR 0001**](./docs/adr/0001-callup-availability-as-source-of-truth.md): `MatchCallup.availability` (the in-memory dict keyed by player) is the only source of truth in the frontend. The earlier `playerIds[]` field is gone. A player is in the callup iff they have an entry in `availability`.
- [**ADR 0002**](./docs/adr/0002-flat-callup-tuples-at-storage.md): Storage adapter (Struere) keeps Callup as one row per `(matchId, playerId)` tuple, even though in-memory it's a `Record<playerId, Availability>`. This gives agents atomic single-tuple updates without read-modify-write of an entire callup. The Callup module in `src/domain/callup.ts` is the only mediator between the two shapes (`fromRows` / `toRows`). TrainingSession does **not** follow this pattern — the access pattern is whole-session (the Carga UI shows the full session at once) and there's no agent updating individual loads tuple-at-a-time.

**Four agents** (deeper material in [`struere/CLAUDE.md`](./struere/CLAUDE.md)):

1. **`coach-stats`** — read-only Spanish chat widget mounted on every routed page in the SPA. Reads players, matches, events; aggregates stats on the fly.
2. **`whatsapp-callup`** — WhatsApp inbound. Player texts `voy` / `no puedo` / `capaz`; agent matches phone → player → next scheduled match → updates the Callup tuple → confirms.
3. **`voice-suplente`** — Twilio outbound + OpenAI Realtime. Picks an active player not in the callup; phone rings; agent asks "¿podés jugar?"; on yes, sets the player's availability to `available`. Single agent, dual mode (orchestrator text turn + voice session) per the cookbook.
4. **`weekly-digest`** — Cron Sunday 20:00 `America/Santiago`. `build_digest` aggregates the week's events, finished matches, upcoming matches, training pain reports; `email.send` ships it to the coach.

**The surprise orchestration** (the workshop closer): a single WhatsApp cancellation flows through all four agents — `whatsapp-callup` parses "no puedo", marks the player `unavailable`, then calls `agent.chat({ agentSlug: 'voice-suplente', ... })`; `voice-suplente` picks a candidate and dials out; if the substitute says yes, `set_availability` flips them to `available`; the next Sunday cron picks up the change in the digest. Four agents, one real coach problem, end-to-end.

## Testing the agents

Recipes for each. Run from the repo root unless noted.

**`coach-stats`** (no integration dependencies — the easiest to demo):
- Open the SPA, click the Sparkles icon (desktop sidebar) or the floating action button (mobile).
- Click any of the three Spanish suggestions, or type your own. Try `¿Quién marcó más puntos?`, `¿Cuántos jugadores hay activos?`, `¿Cómo terminó el último partido?`.
- CLI smoke test: `cd struere && bunx struere chat coach-stats --message "¿cuántos jugadores activos tengo?" --json` and verify `executionMeta.toolCalls` includes `list_players`.

**`whatsapp-callup`** (needs Kapso connected — see step 5 of the setup walkthrough):
- **First step**: ensure a Player record's `phone` matches your real E.164 number. `cd struere && bunx struere data update <player-id> --data '{"phone":"+...."}'`.
- Send a WhatsApp from your phone to the connected business number. Try `voy`, `no puedo`, `capaz`. The agent should reply confirming and the corresponding Callup tuple should flip in the UI on next page load.

**`voice-suplente`** (needs Twilio connected — see step 4 of the setup walkthrough):
- **First step**: pick an active Player NOT in the next callup, set their `phone` to your real E.164 number (same `bunx struere data update` command as above).
- Trigger via `bunx struere chat voice-suplente --message "Llama a un suplente para el próximo partido"`, or trigger via WhatsApp orchestration by replying `no puedo` from a Player who IS in the next callup.
- Phone rings within 10–20s. Spanish rioplatense, one sentence per turn.

**`weekly-digest`** (needs Resend connected — see step 6 of the setup walkthrough):
- Ad-hoc: `bunx struere chat weekly-digest --message "Compila el digest"`.
- Scheduled: the cron fires Sunday 20:00 `America/Santiago`. To verify the trigger is registered: `bunx struere triggers list`.

## ADRs

- [`docs/adr/0001-callup-availability-as-source-of-truth.md`](./docs/adr/0001-callup-availability-as-source-of-truth.md) — `MatchCallup.availability` is the only collection; the original `playerIds[]` field was dropped because the two collections drifted. A player is in the callup iff they have an entry in `availability`.
- [`docs/adr/0002-flat-callup-tuples-at-storage.md`](./docs/adr/0002-flat-callup-tuples-at-storage.md) — Storage persists `Callup` as one row per `(matchId, playerId)` tuple so agents can update a single entry atomically; the in-memory dict shape from ADR 0001 still holds at the domain interface, with `fromRows` / `toRows` as the only mediator.

## License / credits

Workshop authored by Marco Gómez ([Struere](https://struere.dev)) for **HACK@LATAM** (May 15–17, 2026). Live workshop session: Tue May 6, 8:00 AM Sydney time, online, 30 min.

This repo is also the canonical worked example for the [Struere Voice Agent Cookbook](https://docs.struere.dev/integrations/voice-cookbook). When the cookbook says "see the Sportistics example," it means this repository.

Built with Bun, React 19, Vite, Zustand, Tailwind 4, and Struere SDK 0.14.8.
