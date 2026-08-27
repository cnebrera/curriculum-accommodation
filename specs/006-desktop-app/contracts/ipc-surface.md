# Contract — IPC surface

The UI has no filesystem access. Every privileged operation crosses this boundary,
which is what makes "writes confined to the vault" enforceable in one place
(`007` FR-508).

```ts
vault.choose(): Promise<VaultPath>
vault.read(relPath): Promise<{ content, repairs }>
vault.write(relPath, content): Promise<void>   // rejects any path outside the vault
vault.watch(cb): Unsubscribe

names.set(code, name): Promise<void>           // encrypted at rest
names.resolve(code): Promise<string | null>    // UI display only
names.redact(text): Promise<{ text, flagged }> // egress chokepoint

corpus.version(): Promise<string>
corpus.update(): Promise<UpdateResult>          // never touches the vault

job.adapt(jobId): AsyncIterable<Progress>
job.render(jobId, formats): Promise<Output[]>
job.signOff(jobId): Promise<void>               // the ONLY way the draft mark clears

cost.month(): Promise<Cents>
```

## Rules

1. `vault.write` resolves the path and rejects anything outside the vault root.
   Rejection, not sanitisation — a path derived from content is a signal, not a
   typo (`007` FR-508).
2. `job.signOff` is the sole clearer of the draft mark. No other call, and no
   model output, can produce a document without it (`007` FR-509).
3. `names.resolve` serves display only. Its result must never enter a payload;
   the type system keeps display strings and payload strings distinct.
4. The renderer receives an IR document. **The profile is not a parameter of any
   render call** — the structural form of "learner data cannot reach the page"
   (`007` FR-506). It is not a check that can be bypassed; there is no argument to
   pass.
