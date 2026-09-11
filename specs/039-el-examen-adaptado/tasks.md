# Tasks: El examen adaptado

**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/escalada.md](./contracts/escalada.md)

**Prefijo de requisito**: FR-37xx · SC-37xx

> **Tres decisiones están aplazadas a propósito** (D1, D2, D3 en la spec). Las fases están
> ordenadas para que lo que depende de ellas quede aislado al final: si D1 se responde en un
> sentido u otro, lo que cambia es una receta y una tabla del corpus, **nunca el mecanismo**.

---

## Phase 1: Setup

- [x] T001 Leer `recipes/core/response-route.md` entero antes de tocar nada, y anotar en
      `research.md` cualquier prescripción suya que el diseño de `data-model.md` no cubra.
      La receta lleva escrita más tiempo que esta spec y es la autoridad sobre el juicio.
      - **Valió las dos veces, y una de las dos invalidó un diseño ya aprobado.** Está en
        `research.md` como R5.
      - **R5a**: «quitar el espacio del todo» es un anti-patrón de la receta, y
        `data-model.md` lo pedía para quien dicta. El motivo que da la receta es bueno —
        «sin marca de que ahí va una respuesta, una hoja corregida no puede decir si
        contestó, y **en un examen eso es una pregunta sin evaluar**». Va la frase **y una
        casilla**.
      - **R5b**: la vía no puede salir de `MOT`, y eso **elimina** el knob que T005 iba a
        añadir. La receta lo nombra como anti-patrón: un alumno con parálisis cerebral, uno
        con la muñeca rota y uno con disgrafía «comparten el eje y no comparten ninguna
        solución». La salida la escribe ella en `profile.response`, el modelo la aplica, y
        llega al papel **por el documento**. El diseño correcto es **más pequeño** que el
        planificado: el renderizador lee el documento y nada más.

## Phase 2: Foundational

- [x] T002 En `docs/ir.md`, dejar dicho qué hace el renderizador con cada valor de
      `data-response` — hoy el contrato enumera ocho valores y no dice qué producen, que es
      la razón de que nadie notara en meses que no los leía nadie. (FR-3701)

---

## Phase 3: User Story 1 - Contesta como puede contestar (Priority: P1) 🎯 MVP

**Goal**: la vía de respuesta llega al papel, en las tres salidas.

**Independent Test**: adaptar un material con alumnos de vías distintas y comparar los
documentos. Sin ninguna otra parte de esta spec, la hoja ya cambia.

- [x] T003 [US1] Escribir `app/packages/core/test/response-route.test.ts` **en rojo**, con
      la tabla de `data-model.md` como casos y con el caso «ausente» exigiendo salida
      **idéntica a hoy**. Ése es el que protege a todo el material que ya existe en el vault
      de alguien. (FR-3701, FR-3704)
- [x] T004 [US1] En `app/packages/core/src/render/html.ts`, que `answerSpace()` resuelva
      desde `data-response` **y** desde la presentación, en vez de emitir dos rayas fijas.
      (FR-3701)
- [x] T005 [US1] ~~Añadir el knob de vía de respuesta a `Presentation` y producirlo desde
      `MOT`~~ — **no se hace, y el motivo es R5b.** Un knob derivado de `MOT` elegiría la
      salida desde el eje, que es exactamente el anti-patrón que la receta nombra. La vía
      llega por el documento. `007` FR-506 queda intacto **por no haber añadido nada**, que
      es más fuerte que haberlo añadido con cuidado. (FR-3701, FR-3704)
- [x] T006 [US1] La frase que dice cómo puede responder, en el idioma de instrucción del
      alumno. Sale del corpus y no de una constante en el código: es lo que se le dice a un
      niño, o sea Principio I. (FR-3702)
      - **Hecho a medias, y lo digo aquí en vez de dejarlo parecer completo.** La frase
        está, y está en castellano **en duro**, al lado de «Respuesta:» que ya lo estaba.
      - El motivo: **este renderizador es monolingüe hoy.** `opts.lang` sólo llega al
        atributo `lang` del `<html>`, y no existe ningún mecanismo para traducir una cadena
        suya. Inventar aquí medio mecanismo dejaría dos formas de decir una cosa, que es el
        generador de defectos de este repositorio.
      - Queda como trabajo propio y nombrado: **localizar las cadenas del renderizador**.
        Afecta a «Respuesta:», a esta frase y a «Contestado», y no es de `039`.
- [x] T007 [P] [US1] La misma vía en `render/odt.ts`. (FR-3703, Principio IV)
- [x] T008 [P] [US1] La misma vía en `render/linear.ts`, o declarado aquí con su motivo qué
      no aplica en una modalidad que no tiene página. (FR-3703)
      - **Declarado, no implementado, y escrito en `linear.ts` donde alguien iría a
        buscarlo.** La vía gobierna *cuánto papel* y *de qué forma*, y nada de eso tiene
        equivalente donde no hay página. Lo que hay que transmitir en audio es **que hay
        una respuesta que dar**, y eso ya se transmite para todo ejercicio.
      - Y los valores que en la hoja no producen espacio —`choice`, `match`, `fill`—
        tampoco se silencian aquí: la respuesta sigue existiendo, sólo que va en el
        contenido, y callar el aviso le quitaría a quien escucha la única señal de que le
        toca contestar.
- [x] T009 [US1] Comprobar que `untrusted.test.ts` FR-506 sigue verde **sin tocarlo**. Si
      hubo que tocarlo, el diseño se rompió y hay que volver a T005. (FR-3704)
- [x] T010 [US1] Añadir la hoja de examen del registro de `038` a la revisión: sus cuatro
      `data-response` salen hoy iguales y después no. Mirarlo. (SC-3701, SC-3702)
      - **Mirado, y se ve.** La 1 (`short`) lleva una raya; la 2 (`choice`) **ninguna**,
        porque la respuesta son las opciones; la 3 (`long`) lleva más sitio. Antes de esto
        las cuatro salían idénticas — sin espacio ninguno, que es el anti-patrón de la
        receta y lo que llevaba pasando en toda hoja adaptada.
      - La fixture tenía las cuatro vías escritas desde `038` T013, **antes de que nada las
        leyera**. Por eso sirve ahora: no se escribió con la forma del arreglo.

**Checkpoint**: US1 sola cierra la promesa que el corpus lleva haciendo desde que se
escribió `response-route.md`.

---

## Phase 4: User Story 2 - El canal de escalada, sin su disparador (Priority: P2)

**Goal**: el informe sabe llevar una escalada con su propuesta. **Qué la dispara es D1.**

**Independent Test**: construir una escalada a mano, renderizar el informe y leerlo.

- [x] T011 [US2] Escribir `app/packages/core/test/report-escalada.test.ts` en rojo, con la
      propuesta de tres líneas y la aserción de que **no** aparece dentro de «Lo que NO he
      hecho». (FR-3706, FR-3707, SC-3703)
- [x] T012 [US2] En `app/packages/core/src/report/index.ts`, que la escalada deje de ser
      `string[]` y pase a llevar qué, por qué y propuesta opcional. (FR-3706)
- [x] T013 [US2] Sacarla de `notDone` y darle su apartado, con la propuesta en bloque y sin
      pasar por el normalizador de `notes.ts` — que se queda como está, porque para las
      notas que ella escribe está bien. (FR-3707)
- [x] T014 [US2] Escribir en el contrato de la IR que una propuesta es **contenido de un
      modelo**: se muestra, no se ejecuta, y no alcanza la hoja por ningún camino. Principio
      IX, y es el punto de más riesgo de esta feature. (contracts/escalada.md)
- [x] T015 [P] [US2] Darle al informe el documento original además del adaptado, de modo que
      «toda numeración del origen sigue encabezando una tarea» sea comprobable sin depender
      de lo que el modelo cuente. (FR-3709, backlog G69)
      - **El original estaba al lado desde siempre.** `jobs/adapt.ts:155` ya tenía `doc`, el
        material leído, y el informe no lo recibía. Cablearlo fue una línea; lo que faltaba
        era la comprobación.
      - **«Encabeza una tarea», no «aparece», y ésa es la diferencia entera.** En el pase
        que produjo G69 el número 1 seguía en la hoja —dentro de un `.scaffold`, como
        ejemplo resuelto— así que buscarlo lo habría encontrado. Lo que había dejado de ser
        es un ejercicio.
      - Y se compara **por prefijo**, para que un `4` extendido en `4a` y `4b` no dé aviso:
        sigue encabezando tareas, dos, y es lo que la regla dura 7 prescribe.
      - El informe **avisa, no afirma**: «puede estar bien —un ejercicio convertido en
        ejemplo resuelto es una decisión legítima y a veces la buena— pero cambia lo que el
        alumno tiene que hacer, así que lo miras tú».
- [x] T016 [US2] Dejar el disparador **sin cablear**, y decirlo aquí y en el código: la
      estructura existe, nadie la rellena todavía, y eso es D1 y no un olvido. (FR-3705,
      FR-3708)

**Checkpoint**: el canal está entero. Lo único que falta es qué lo dispara.

---

## Phase 5: User Story 3 - El fantasma del contrato (Priority: P3)

- [x] T017 [US3] Hacer que `validate-recipes` falle ante una cita a una receta inexistente.
      **Rojo primero**, porque hoy `docs/ir.md:118` cita `one-task-per-item@1` y pasa.
      (FR-3710, SC-3705)
      - **El primer intento pasó en verde, y por mirar el sitio equivocado.** Busqué citas
        entre backticks, y la cita real del contrato no las lleva: está dentro de un bloque
        cercado, como `data-recipe="one-task-per-item@1"`. El validador miraba la prosa y
        el defecto estaba en el atributo.
      - Ahora mira los dos, y sólo esos dos: prosa entre backticks y el atributo. **Prosa
        suelta nombrando una receta sin versión no cuenta** — una guarda que salta con la
        prosa se acaba debilitando para que pase un commit, y la historia de este mismo
        fichero lo dice.
- [x] T018 [US3] Escribir `app/corpus/recipes/core/one-task-per-item.md`, que implementa la
      regla dura 7. **Con `scope` que excluya la evaluación y declarando su conflicto con
      `exam-access-not-difficulty`**, igual que `one-task-per-page` ya lo declara y pierde
      contra ella por P27 — partir un ítem es exactamente lo que la guarda nombra como
      anti-patrón. (FR-3710, FR-3711)
- [x] T019 [P] [US3] Test de que partir un ítem extiende la numeración (`4a`, `4b`) y no
      renumera el resto. (FR-3711)

---

## Phase 6: Polish

- [ ] T020 [P] Regenerar el registro de `038` y mirar la hoja de examen. Es SC-3701 y es la
      única forma de juzgar si el espacio de respuesta sirve.
- [ ] T021 [P] Anotar en `specs/BACKLOG.md` que G69 queda cerrado por T015, y que la lectura
      de la línea del perfil A3 sigue abierta como D2.
- [ ] T022 Añadir a `specs/006-desktop-app/validation.md` lo que ahora se comprueba y lo que
      no: que un modelo escriba `data-response` en un material que no lo traía **no se puede
      verificar offline**, y que SC-3704 —una PT leyendo una escalada— no lo dice ningún test.

---

## Bloqueado por D1 · aislado a propósito

- [ ] T023 **[BLOQUEADO · D1]** Las recetas de las cuatro medidas del PDF en disputa. No se
      escriben hasta que D1 se responda, y esa espera **es una decisión**: el corpus es lo
      que se le enseña al modelo, y una regla que se escribe y se revierte produce
      adaptaciones que se escriben y se revierten.
- [ ] T024 **[BLOQUEADO · D3]** Tres pasadas reales para medir si la reescritura de
      `§Output` sobre `.scaffold` movió el 19% de fallos de procedencia. Cuesta clave.

---

## Dependencies

```
Phase 1 (T001)
   └── Phase 2 (T002)
        ├── Phase 3 · US1 (T003…T010)  🎯 MVP — no depende de ninguna decisión abierta
        ├── Phase 4 · US2 (T011…T016)  — el mecanismo; el disparador es D1
        └── Phase 5 · US3 (T017…T019)  — sólo el fantasma
             └── Phase 6 (T020…T022)
                  └── Bloqueado (T023, T024)
```

US1, US2 y US3 tocan capas disjuntas —`render/`, `report/` y el corpus— así que pueden ir en
paralelo una vez pasada la fase 2.

## Cobertura de requisitos

| FR | Dónde |
|---|---|
| FR-3701 | T002, T003, T004, T005 |
| FR-3702 | T006 |
| FR-3703 | T007, T008 |
| FR-3704 | T003, T005, T009 |
| FR-3705 | T016 · estructura sí, disparador D1 |
| FR-3706 | T011, T012 |
| FR-3707 | T011, T013 |
| FR-3708 | T016 · el alcance se escribe con el disparador |
| FR-3709 | T015 |
| FR-3710 | T017, T018 |
| FR-3711 | T018, T019 |
| FR-3712 | por ausencia · la imagen fotografiada no se toca, y el motivo está en la spec |
| FR-3713 | T022 · nombradas en validation.md con la spec que las habilita |
| FR-3714 | T018 · el conflicto declarado en el corpus |
