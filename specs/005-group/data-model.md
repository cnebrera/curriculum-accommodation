# Data model: one worksheet, several learners

## The headline: nothing is added

The vault is unchanged. This feature writes exactly the files that already exist,
to exactly the paths `packages/core/src/vault/paths.ts` already computes:

```
material/<job>/ir.md                 the extraction — ONE, shared
material/<job>/source/               what she brought
material/<job>/<code>/adapted.md     one per learner
material/<job>/<code>/report.md      one per learner
output/<job>/<code>/sheet.{html,pdf} one per learner
```

Three learners produce three `<code>` directories under one job. That is the
whole storage change, and it was made in August.

## A batch is not an entity

There is no `batch.json`, no batch id, and nothing on disk that says these three
adaptations happened together.

**That is deliberate.** A batch is an *event* — she pressed the button once —
and not a thing with a life of its own. Storing it would create a second record
of a relationship the filesystem already expresses (`material/<job>/` contains
the codes), and a second copy of a truth is this project's recurring defect. It
would also have to be maintained: erasing a learner would have to edit it, a
fourth learner added next week would have to be appended to it, and a batch file
that disagrees with the directory listing is worse than no batch file.

`job:learners(jobId)` already answers "who has this been adapted for?" by
listing the directory. That is the batch, derived.

## In memory, during a run

```ts
interface BatchOutcome {
  jobId: string;
  results: Array<
    | { learner: string; ok: true;  result: AdaptResult }
    | { learner: string; ok: false; kind: ErrorKind | 'unknown'; message: string }
  >;
}
```

Discriminated per learner, not a list of successes plus a list of failures. The
shape is the requirement: FR-506 and FR-507 say a failure belongs to a learner
and is never a verdict on the batch, and a caller holding this type cannot
express "the batch failed" without saying whose.

## Progress

```ts
interface BatchProgress {
  stage: string;      // as today
  detail?: string;    // as today
  learner: string;    // NEW — whose adaptation this is
  index: number;      // NEW — 1-based
  of: number;         // NEW
}
```

FR-519. The existing single-learner shape is a `BatchProgress` with `of: 1`,
which is why the renderer's progress component needs no branch for the old case.

## Staleness

FR-520: correcting the extraction after adaptations exist marks them stale. The
mark goes in the **adapted document's** front matter, not in a side file:

```yaml
stale_since: "2026-08-30"      # the extraction changed under this sheet
```

In the document because that is where a teacher opening it in Obsidian will see
it, and because a side file would be the batch entity arriving by another door.
A stale sheet is not deleted — it is the sheet she may already have photocopied.

### Enmienda · 2026-09-05 (`031`)

**`stale_since` nunca se construyó.** Lo que se implementó, y lo que hay en el disco de
cualquier vault real, es una frescura **derivada**: ninguna hoja lleva marca alguna, y la
pregunta se responde comparando lo que la hoja registra contra lo que hay ahora
(`app/packages/core/src/ir/reading.ts`). La sección de arriba describe un diseño que se
descartó durante la implementación de `005` sin que este documento lo recogiera.

Se corrige aquí, y no borrando el párrafo, porque la razón por la que se descartó sigue
siendo la razón por la que no debe volver: **una marca escrita en la hoja edita un
documento que la PT puede haber firmado**. Cambiar de opinión sobre un dibujo no puede
tocar los bytes de una hoja firmada — es lo que `031` T019 comprueba byte a byte.

Desde `031` el modelo es **uno solo con dos ejes**, en
`app/packages/core/src/ir/freshness.ts`:

| Eje | Qué compara | Qué hace ella |
|---|---|---|
| `reading` | la huella de la lectura con la que se hizo, contra el `ir.md` de ahora | volver a verificar la lectura |
| `drawings` | el dibujo que registró cada palabra (`data-picto`), contra el que esa palabra tendría hoy | volver a preparar la hoja |

Dos ejes y dos frases, nunca una «desactualizada» fundida: son hechos distintos con
remedios distintos, y una sola palabra es exactamente donde uno esconde al otro
(`031` FR-2903). El eje de dibujos puede además responder «no lo sé», que es lo que
contesta cuando el vault es anterior a la versión que empezó a registrar los pares
(`031` FR-2906) — una hoja sin pares en un vault antiguo no dice que no llevara
pictogramas, dice que nadie lo anotó.

**Las cláusulas de FR-520 no cambian.** Corregir la extracción después de que existan
adaptaciones sigue dejándolas marcadas, la hoja sigue sin borrarse, y sigue siendo la
hoja que ella puede haber fotocopiado ya. Lo que cambia es dónde vive la marca: en
ninguna parte, porque se deduce.

Detalle en `specs/031-el-segundo-eje-de-frescura/`.
