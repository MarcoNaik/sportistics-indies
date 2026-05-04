# Sportistics — Volleyball Coach PWA + 4 Struere Agents

<details open>
<summary><strong>🇬🇧 English</strong></summary>

Workshop project for HACK@LATAM and the canonical Voice Agent Cookbook reference.

## What this is

A volleyball-club tool for coaches (roster, schedule, callups, training-load, live events, per-player stats) built as a React + Vite + Zustand SPA on top of [Struere](https://struere.dev) — 5 entity types, 4 agents, 1 role, 12 custom tools, 1 cron trigger. Spanish UI strings, English domain types. This repo is the canonical worked example referenced from the [Struere Voice Agent Cookbook](https://docs.struere.dev/integrations/voice-cookbook): every cookbook pattern (dual-mode voice agent, sync-time lints, `agent.chat` orchestration, flat-tuple storage) is exercised here on real volleyball data.

## Branches as workshop steps

The three feature branches are the three workshop steps; each is a strict extension of the previous, and `main` == `03-agent-automations`.

| Branch | Step | What's added |
|---|---|---|
| `main` | Final state | Everything below combined (`origin/main` == `03-agent-automations`) |
| `01-struere-setup` | Step 1 | Struere CLI installed, project scaffolded with `struere init`, `struere-developer` skill loaded |
| `02-cloud-database` | Step 2 | 5 entity types defined; SPA rewired off mocks through the Struere SDK; `.env.example` + dev API key |
| `03-agent-automations` | Step 3 | 4 agents + 12 tools + 1 role + 1 cron trigger + chat widget wired to `coach-stats` — equals `main` |

`git checkout <branch>` to see any step's state. Pair each transition with one prompt below: **Prompt 1** (`main` → `01-struere-setup`), **Prompt 2** (`01-struere-setup` → `02-cloud-database`), **Prompt 3** (`02-cloud-database` → `03-agent-automations`). The prompts are byte-identical to the live workshop's.

## Quick start

```bash
git clone https://github.com/MarcoNaik/sportistics-indies.git
cd sportistics-indies
bun install
cp .env.example .env.local   # fill in VITE_STRUERE_API_KEY (see "Setup walkthrough")
bun run dev
```

The SPA boots empty on `main` — entities come from your Struere dev environment, and a fresh one has no rows. Add a Player, Match, or Training Session through the UI; reload — it persists. That's the green light.

## Prerequisites & accounts to create

Items 1–4 are mandatory for the SPA + `coach-stats`; 5–7 are for WhatsApp + voice + email agents.

- [ ] **Bun ≥ 1.2** — https://bun.sh — never npm in this repo.
- [ ] **Struere account + organization** — https://struere.dev. Pro plan (4 agents > free-tier cap).
- [ ] **Struere CLI ≥ 0.14.8** — `bun install -g struere@latest`. 0.14.8 added sync-time lints; older versions need workarounds this material no longer covers.
- [ ] **`struere-developer` skill** — `npx skills add MarcoNaik/struere-skill --all --yes` from repo root. SDK source of truth; the prompts assume it's loaded.
- [ ] **Twilio account + outbound voice number** — https://twilio.com. Powers `voice-suplente`.
- [ ] **Kapso/WhatsApp Business** — https://kapso.io. Powers `whatsapp-callup`.
- [ ] **Resend account** — https://resend.com. Powers `email.send` for the weekly digest.
- [ ] **OpenAI API key with Realtime API access** — for `voice-suplente`, configured org-level on Struere.

## Setup walkthrough

Run in order from a fresh clone.

1. **Repo + frontend.** `bun run dev` fail-fasts until step 3 fills `VITE_STRUERE_API_KEY`. Leave it running.
   ```bash
   git clone https://github.com/MarcoNaik/sportistics-indies.git && cd sportistics-indies && bun install && cp .env.example .env.local && bun run dev
   ```
2. **Struere project + login.** `struere init` is for fresh repos; this clone has the project — use `pull`.
   ```bash
   struere logout && struere login
   cd struere && struere pull && bunx struere sync
   ```
3. **Create the dev API key for the SPA**, then paste it into `.env.local` (gitignored — never commit).
   ```bash
   cd struere && bunx struere keys create --name "vite-spa-dev" --env development --json
   # copy the `key` field → VITE_STRUERE_API_KEY=sk_... in .env.local
   ```
4. **Connect Twilio** (powers `voice-suplente`). Bind the number directly to the agent.
   ```bash
   bunx struere integration twilio --account-sid <SID> --auth-token <TOKEN> --phone-number <+E164> --agent voice-suplente --yes
   ```
5. **Connect WhatsApp via Kapso** (powers `whatsapp-callup`). The middle command opens a Kapso hosted setup link.
   ```bash
   cd struere
   bunx struere whatsapp enable --environment development
   bunx struere whatsapp setup --environment development
   bunx struere whatsapp set-agent --slug whatsapp-callup --environment development
   ```
6. **Connect Resend** (powers `weekly-digest`).
   ```bash
   bunx struere integration resend --api-key <KEY> --from-email <EMAIL> --yes
   ```
7. **Verify.** `status` should show **4 agents, 5 entity types, 1 role, 12 tools, 1 trigger**. Sync warnings about `whatsapp.send` / `voice.call` / `email.send` are expected if you skipped a step.
   ```bash
   bunx struere status && bunx struere doctor
   ```

If `bunx struere sync` errors with `Access denied: you are not a member of organization X`, you logged in as the wrong account — `struere logout && struere login` again.

## Domain & architecture

Full glossary in [`CONTEXT.md`](./CONTEXT.md).

**Five entity types** (Struere = the database; SPA + agents share one source of truth):

- **Player** — roster person; `category` Sub-14|Sub-16|Sub-18|Adult (Youth requires `guardianName`+`guardianPhone`); `status` active|injured|inactive.
- **ClubMatch** — scheduled match (`date`, `time`, `opponent`, `location`, `competition`, `status` scheduled|live|finished).
- **Callup** — flat-tuple `(matchId, playerId, availability)`; availability pending|available|unavailable|maybe; absence-of-row = not in callup.
- **TrainingSession** — array-of-records: one entity per session with `loads[]` (per attending player: `present`, `minutes`, `rpe`, `fatigue`, `pain`).
- **VolleyballEvent** — match action (`actionType`, `result`, `pointFor`, `playerId`, `matchId`); `PlayerStats` is derived, never stored.

**Two ADRs** (full prose in [`docs/adr/`](./docs/adr/)):

- [**ADR 0001**](./docs/adr/0001-callup-availability-as-source-of-truth.md) — `MatchCallup.availability` is the only source of truth in the frontend; the old `playerIds[]` is gone.
- [**ADR 0002**](./docs/adr/0002-flat-callup-tuples-at-storage.md) — Storage keeps Callup as one row per `(matchId, playerId)` even though in-memory it's a `Record<playerId, Availability>`. `Callup.fromRows`/`toRows` is the only mediator. TrainingSession does NOT follow this pattern (whole-session access).

**Four agents** (deeper material in [`struere/CLAUDE.md`](./struere/CLAUDE.md)):

- **`coach-stats`** — chat widget (read-only Spanish, every routed page); reads players/matches/events, aggregates stats on the fly.
- **`whatsapp-callup`** — WhatsApp inbound; `voy`/`no puedo`/`capaz` → phone match → next match → updates Callup tuple → confirms.
- **`voice-suplente`** — Twilio outbound + OpenAI Realtime; calls a non-callup active player asking "¿podés jugar?"; on yes, sets availability `available`. Single agent, dual mode (orchestrator + voice session).
- **`weekly-digest`** — cron Sunday 20:00 `America/Santiago`; `build_digest` → `email.send` to coach.

**Surprise orchestration** (the workshop closer): `whatsapp-callup` (parses "no puedo", marks `unavailable`) → `agent.chat` → `voice-suplente` (picks candidate, dials, sets `available` on yes) → next Sunday `weekly-digest` picks up the change. Four agents, one coach problem, end-to-end.

## Testing the agents

**`coach-stats`** (no integration deps):
```bash
cd struere && bunx struere chat coach-stats --message "¿cuántos jugadores activos tengo?" --json   # expect executionMeta.toolCalls includes list_players
```
Or open the SPA, click the Sparkles icon (sidebar) / FAB (mobile), use a suggestion or type `¿Quién marcó más puntos?`.

**`whatsapp-callup`** (needs Kapso — step 5). First update a Player's `phone` to your real E.164:
```bash
cd struere && bunx struere data update <player-id> --data '{"phone":"+...."}'
# then text voy / no puedo / capaz to the connected business number
```

**`voice-suplente`** (needs Twilio — step 4). Pick an active Player NOT in the next callup, set their phone as above, then:
```bash
bunx struere chat voice-suplente --message "Llama a un suplente para el próximo partido"
# or trigger via WhatsApp orchestration: reply `no puedo` from a Player IN the next callup. Phone rings 10–20s.
```

**`weekly-digest`** (needs Resend — step 6):
```bash
bunx struere chat weekly-digest --message "Compila el digest"   # ad-hoc
bunx struere triggers list                                       # verify cron registered (Sun 20:00 America/Santiago)
```

## ADRs

- [`docs/adr/0001-callup-availability-as-source-of-truth.md`](./docs/adr/0001-callup-availability-as-source-of-truth.md) — `MatchCallup.availability` is the only collection; `playerIds[]` was dropped because the two drifted.
- [`docs/adr/0002-flat-callup-tuples-at-storage.md`](./docs/adr/0002-flat-callup-tuples-at-storage.md) — Storage persists `Callup` as one row per `(matchId, playerId)` so agents can update one entry atomically; the in-memory dict from ADR 0001 still holds via `fromRows`/`toRows`.

## License / credits

Workshop authored by Marco Gómez ([Struere](https://struere.dev)) for **HACK@LATAM** (May 15–17, 2026). Live session: Tue May 6, 8:00 AM Sydney time, online, 30 min.

This repo is the canonical worked example for the [Struere Voice Agent Cookbook](https://docs.struere.dev/integrations/voice-cookbook).

Built with Bun, React 19, Vite, Zustand, Tailwind 4, and Struere SDK 0.14.8.

## The three prompts

These are AI-instruction prompts you copy-paste into Claude Code (with the `struere-developer` skill loaded) at the start of a working session. The agent does the rest. The prompts defer to https://docs.struere.dev for canonical patterns — they give the volleyball-specific context but assume the implementing agent has read the cookbook before writing voice-agent code.

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

</details>

<details>
<summary><strong>🇪🇸 Español</strong></summary>

Proyecto del workshop para HACK@LATAM y referencia canónica del Voice Agent Cookbook.

## Qué es esto

Una herramienta para coaches de un club de voley (plantel, agenda, convocatorias, carga de entrenamiento, eventos en vivo, stats por jugador) construida como SPA en React + Vite + Zustand sobre [Struere](https://struere.dev) — 5 tipos de entidad, 4 agentes, 1 rol, 12 custom tools, 1 cron trigger. Strings de UI en español, tipos de dominio en inglés. Este repo es el ejemplo canónico referenciado desde el [Struere Voice Agent Cookbook](https://docs.struere.dev/integrations/voice-cookbook): cada patrón del cookbook (voice agent dual-mode, lints en sync-time, orquestación con `agent.chat`, almacenamiento en flat-tuples) está ejercitado acá sobre datos reales del voley.

## Ramas como pasos del workshop

Las tres feature branches son los tres pasos del workshop; cada una es extensión estricta de la anterior, y `main` == `03-agent-automations`.

| Rama | Paso | Qué se agrega |
|---|---|---|
| `main` | Estado final | Todo lo de abajo combinado (`origin/main` == `03-agent-automations`) |
| `01-struere-setup` | Paso 1 | Struere CLI instalado, proyecto scaffoldeado con `struere init`, skill `struere-developer` cargado |
| `02-cloud-database` | Paso 2 | 5 tipos de entidad definidos; SPA recableada de los mocks al SDK de Struere; `.env.example` + dev API key |
| `03-agent-automations` | Paso 3 | 4 agentes + 12 tools + 1 rol + 1 cron trigger + widget de chat conectado a `coach-stats` — equivale a `main` |

`git checkout <branch>` para ver el estado de cualquier paso. Aparejá cada transición con un prompt de abajo: **Prompt 1** (`main` → `01-struere-setup`), **Prompt 2** (`01-struere-setup` → `02-cloud-database`), **Prompt 3** (`02-cloud-database` → `03-agent-automations`). Los prompts son byte-idénticos a los del workshop en vivo.

## Inicio rápido

```bash
git clone https://github.com/MarcoNaik/sportistics-indies.git
cd sportistics-indies
bun install
cp .env.example .env.local   # completá VITE_STRUERE_API_KEY (mirá "Paso a paso de configuración")
bun run dev
```

La SPA arranca vacía en `main` — las entidades vienen de tu entorno de dev de Struere, y un entorno fresco no tiene filas. Agregá un Player, Match o Training Session desde la UI; recargá — se persiste. Esa es la luz verde.

## Requisitos y cuentas a crear

Los ítems 1–4 son obligatorios para la SPA + `coach-stats`; 5–7 son para los agentes de WhatsApp + voz + email.

- [ ] **Bun ≥ 1.2** — https://bun.sh — nunca npm en este repo.
- [ ] **Cuenta de Struere + organización** — https://struere.dev. Plan Pro (4 agentes > cap del free-tier).
- [ ] **Struere CLI ≥ 0.14.8** — `bun install -g struere@latest`. 0.14.8 sumó lints en sync-time; las versiones más viejas necesitan workarounds que este material ya no cubre.
- [ ] **Skill `struere-developer`** — `npx skills add MarcoNaik/struere-skill --all --yes` desde la raíz del repo. Fuente de verdad del SDK; los prompts asumen que está cargado.
- [ ] **Cuenta de Twilio + número outbound de voz** — https://twilio.com. Potencia `voice-suplente`.
- [ ] **Kapso/WhatsApp Business** — https://kapso.io. Potencia `whatsapp-callup`.
- [ ] **Cuenta de Resend** — https://resend.com. Potencia `email.send` para el digest semanal.
- [ ] **API key de OpenAI con acceso a Realtime API** — para `voice-suplente`, configurada a nivel de organización en Struere.

## Paso a paso de configuración

Corré en orden desde un clone fresco.

1. **Repo + frontend.** `bun run dev` va a fail-fast hasta que el paso 3 complete `VITE_STRUERE_API_KEY`. Dejalo corriendo.
   ```bash
   git clone https://github.com/MarcoNaik/sportistics-indies.git && cd sportistics-indies && bun install && cp .env.example .env.local && bun run dev
   ```
2. **Proyecto de Struere + login.** `struere init` es para repos frescos; este clone ya tiene el proyecto — usá `pull`.
   ```bash
   struere logout && struere login
   cd struere && struere pull && bunx struere sync
   ```
3. **Crear la dev API key para la SPA**, después pegala en `.env.local` (gitignored — nunca lo commitees).
   ```bash
   cd struere && bunx struere keys create --name "vite-spa-dev" --env development --json
   # copiá el campo `key` → VITE_STRUERE_API_KEY=sk_... en .env.local
   ```
4. **Conectar Twilio** (potencia `voice-suplente`). Atá el número directo al agente.
   ```bash
   bunx struere integration twilio --account-sid <SID> --auth-token <TOKEN> --phone-number <+E164> --agent voice-suplente --yes
   ```
5. **Conectar WhatsApp vía Kapso** (potencia `whatsapp-callup`). El comando del medio abre un link de setup hosteado por Kapso.
   ```bash
   cd struere
   bunx struere whatsapp enable --environment development
   bunx struere whatsapp setup --environment development
   bunx struere whatsapp set-agent --slug whatsapp-callup --environment development
   ```
6. **Conectar Resend** (potencia `weekly-digest`).
   ```bash
   bunx struere integration resend --api-key <KEY> --from-email <EMAIL> --yes
   ```
7. **Verificar.** `status` debería mostrar **4 agents, 5 entity types, 1 role, 12 tools, 1 trigger**. Los warnings de sync sobre `whatsapp.send` / `voice.call` / `email.send` se esperan si salteaste un paso.
   ```bash
   bunx struere status && bunx struere doctor
   ```

Si `bunx struere sync` falla con `Access denied: you are not a member of organization X`, te logueaste con la cuenta equivocada — `struere logout && struere login` de nuevo.

## Dominio y arquitectura

Glosario completo en [`CONTEXT.md`](./CONTEXT.md).

**Cinco tipos de entidad** (Struere = la base de datos; SPA + agentes comparten una sola fuente de verdad):

- **Player** — persona del plantel; `category` Sub-14|Sub-16|Sub-18|Adult (Youth requiere `guardianName`+`guardianPhone`); `status` active|injured|inactive.
- **ClubMatch** — partido agendado (`date`, `time`, `opponent`, `location`, `competition`, `status` scheduled|live|finished).
- **Callup** — flat-tuple `(matchId, playerId, availability)`; availability pending|available|unavailable|maybe; ausencia-de-fila = no está en la convocatoria.
- **TrainingSession** — array-of-records: una entidad por sesión con `loads[]` (por jugador presente: `present`, `minutes`, `rpe`, `fatigue`, `pain`).
- **VolleyballEvent** — acción del partido (`actionType`, `result`, `pointFor`, `playerId`, `matchId`); `PlayerStats` se deriva, nunca se almacena.

**Dos ADRs** (prosa completa en [`docs/adr/`](./docs/adr/)):

- [**ADR 0001**](./docs/adr/0001-callup-availability-as-source-of-truth.md) — `MatchCallup.availability` es la única fuente de verdad en el frontend; el viejo `playerIds[]` desapareció.
- [**ADR 0002**](./docs/adr/0002-flat-callup-tuples-at-storage.md) — El storage guarda Callup como una fila por `(matchId, playerId)` aunque en memoria sea un `Record<playerId, Availability>`. `Callup.fromRows`/`toRows` es el único mediador. TrainingSession NO sigue este patrón (acceso de sesión completa).

**Cuatro agentes** (material más profundo en [`struere/CLAUDE.md`](./struere/CLAUDE.md)):

- **`coach-stats`** — widget de chat (read-only en español, en cada página rutada); lee players/matches/events, agrega stats al vuelo.
- **`whatsapp-callup`** — WhatsApp inbound; `voy`/`no puedo`/`capaz` → matchea phone → próximo partido → actualiza tupla de Callup → confirma.
- **`voice-suplente`** — Twilio outbound + OpenAI Realtime; llama a un Player active no convocado preguntando "¿podés jugar?"; si dice sí, setea availability `available`. Un solo agente, dual mode (orchestrator + sesión de voz).
- **`weekly-digest`** — cron domingo 20:00 `America/Santiago`; `build_digest` → `email.send` al coach.

**Orquestación sorpresa** (el cierre del workshop): `whatsapp-callup` (parsea "no puedo", marca `unavailable`) → `agent.chat` → `voice-suplente` (elige candidato, disca, setea `available` si dice sí) → el siguiente `weekly-digest` del domingo levanta el cambio. Cuatro agentes, un problema real, end-to-end.

## Cómo probar los agentes

**`coach-stats`** (sin deps de integración):
```bash
cd struere && bunx struere chat coach-stats --message "¿cuántos jugadores activos tengo?" --json   # esperá que executionMeta.toolCalls incluya list_players
```
O abrí la SPA, clickeá el icono de Sparkles (sidebar) / FAB (mobile), usá una sugerencia o tipeá `¿Quién marcó más puntos?`.

**`whatsapp-callup`** (necesita Kapso — paso 5). Primero actualizá el `phone` de un Player a tu número real en E.164:
```bash
cd struere && bunx struere data update <player-id> --data '{"phone":"+...."}'
# después mandá voy / no puedo / capaz al número de Business conectado
```

**`voice-suplente`** (necesita Twilio — paso 4). Elegí un Player active que NO esté en la próxima callup, seteá su phone como arriba, después:
```bash
bunx struere chat voice-suplente --message "Llama a un suplente para el próximo partido"
# o disparalo vía orquestación de WhatsApp: respondé `no puedo` desde un Player que SÍ esté en la próxima callup. Suena en 10–20s.
```

**`weekly-digest`** (necesita Resend — paso 6):
```bash
bunx struere chat weekly-digest --message "Compila el digest"   # ad-hoc
bunx struere triggers list                                       # verificá cron registrado (Dom 20:00 America/Santiago)
```

## ADRs

- [`docs/adr/0001-callup-availability-as-source-of-truth.md`](./docs/adr/0001-callup-availability-as-source-of-truth.md) — `MatchCallup.availability` es la única colección; `playerIds[]` se dropeó porque las dos se desincronizaban.
- [`docs/adr/0002-flat-callup-tuples-at-storage.md`](./docs/adr/0002-flat-callup-tuples-at-storage.md) — El storage persiste `Callup` como una fila por `(matchId, playerId)` para que los agentes puedan actualizar una entrada atómicamente; el dict en memoria del ADR 0001 sigue valiendo vía `fromRows`/`toRows`.

## Licencia / créditos

Workshop autorado por Marco Gómez ([Struere](https://struere.dev)) para **HACK@LATAM** (15–17 de mayo de 2026). Sesión en vivo: martes 6 de mayo, 8:00 AM hora de Sydney, online, 30 min.

Este repo es el ejemplo canónico para el [Struere Voice Agent Cookbook](https://docs.struere.dev/integrations/voice-cookbook).

Construido con Bun, React 19, Vite, Zustand, Tailwind 4, y Struere SDK 0.14.8.

## Los tres prompts

Estos son prompts de instrucciones para AI que se copy-pastean en Claude Code (con el skill `struere-developer` cargado) al arranque de una sesión de trabajo. El agente hace el resto. Los prompts están escritos en inglés con strings de UI en español preservados, y son idénticos sin importar qué toggle de idioma estés leyendo. Defieren a https://docs.struere.dev para los patrones canónicos — dan el contexto específico de voley pero asumen que el agente que implementa leyó el cookbook antes de escribir código de voice agent.

> **Lectura obligatoria antes de correr estos prompts.** Voice agents → https://docs.struere.dev/integrations/voice-cookbook ; gotchas de plataforma (sintaxis de filtros, soft-delete, schema cerrado) → https://docs.struere.dev/platform/gotchas ; los footguns por integración están en la página de cada integración. Modos de falla de voz específicamente: https://docs.struere.dev/integrations/voice#footguns.

Ramas y prompts se aparejan 1-a-1:

| Paso | Rama | Prompt |
|------|------|--------|
| 1 | `01-struere-setup` | Onboarding de Struere |
| 2 | `02-cloud-database` | Definir entidades + recablear la SPA por Struere |
| 3 | `03-agent-automations` | Construir 4 agentes + chat widget |

---

### **Prompt 1 — Struere setup**

> Rama en la que estás: `main` → termina en `01-struere-setup`.
> Tiempo: ~2 min.

Pegá esto en Claude Code (con el skill `struere-developer` instalado) arrancando desde la rama `main`. El agente te deja en `01-struere-setup`.

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

> Rama en la que estás: `01-struere-setup` → termina en `02-cloud-database`.
> Tiempo: ~5 min.

Pegá esto en Claude Code (con el skill `struere-developer` instalado) arrancando desde la rama `01-struere-setup`. El agente te deja en `02-cloud-database`.

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

> Rama en la que estás: `02-cloud-database` → termina en `03-agent-automations`.
> Tiempo: ~5 min.

Pegá esto en Claude Code (con el skill `struere-developer` instalado) arrancando desde la rama `02-cloud-database`. El agente te deja en `03-agent-automations`.

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

</details>
