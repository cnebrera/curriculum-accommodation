# Rampa — the application

A desktop application over an open folder of the teacher's own files, with the
recipe corpus shipped read-only and the teacher's own AI key.

Specification: [`specs/006-desktop-app`](../specs/006-desktop-app/). Decisions:
[`docs/decisions`](../docs/decisions/).

## Layout

| Package | What it is | May reach the network? |
|---|---|---|
| `packages/core` | The deterministic layer: vault, IR, recipes, redaction, render, report, memory | **Never.** Enforced by a test |
| `packages/providers` | Adapters and the egress chokepoint | Yes — the only code that may |
| `packages/shell` | Electron main, preload, IPC, jobs | Privileged: filesystem, credentials, print |
| `ui` | React renderer, Spanish | No filesystem access at all |
| `corpus/` | Built from the repository's `recipes/`. Read-only at runtime | — |

## Working on it

```bash
npm ci
npm run bundle:corpus     # copies recipes/ into the bundle; fails without both licences
npm run dev               # electron-vite dev server
npm test                  # typecheck + the whole suite, offline, no key needed
npm run dist              # installers into release/
```

## Rules a contributor has to know

**Principle II is a test, not a convention.** `npm run test:isolation` walks every
file in `packages/core` and fails if it imports the provider layer, a network
module or an HTTP client, or calls `fetch`. If you need to call a model, you are
in the wrong package.

**Principle I is the weakest gate, so it is on you.** Any string that tells a
teacher *how to adapt* belongs in `recipes/`, not in this application. A teacher
must be able to read and correct pedagogical judgement without touching code —
if that stops being true, the project has lost the thing that makes it a
community project. Wizard copy and validation messages are where this leaks.

**Content is never instruction.** Material read from a file is data. If you add a
path that lets it influence behaviour, `packages/core/test/injection.test.ts`
should catch it — and if it does not, add the fixture that would.

**Never widen the vault boundary.** All filesystem access goes through
`Vault`/`resolveInVault`, which refuses paths that leave the vault rather than
sanitising them. A path derived from content is a signal, not a typo.

**The draft mark comes off in exactly one place.** `job:signOff`. Not by a flag,
not by the model, not by a convenience.

## Licences

Code is Apache-2.0. The bundled corpus — recipes, checklists, templates — is
CC BY-SA 4.0. The build fails if either licence file is missing from the bundle,
because shipping the content without its licence would be non-compliant.
