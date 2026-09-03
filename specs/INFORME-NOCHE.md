# Informe de la noche — ejecución de la cola de trabajo

**Arranque:** 2026-09-03, desde `91c952f` (árbol limpio).
**Fuente:** `specs/COLA-DE-TRABAJO.md`, con el contexto de cada ítem en
`specs/revision-antagonista-2026-09-03.md`.

**Línea base verificada antes de tocar nada:** `npx tsc --noEmit` limpio,
`npx vitest run` 95 ficheros / 1482 casos en verde.

---

## Completados

### 0.1 · Ciclo de vida del estado de sesión de App.tsx — P11, P14, FLU-01/02/03/08

Un refactor, cinco síntomas. Los tres `useState` que ningún camino limpiaba (`review`,
`ingested`, `reconnect`) están ahora en el route, en `LegacyContext`
(`app/ui/src/nav/route.ts`): **lo que la acción de navegación no lleva, la ruta no tiene**,
así que no hay ningún `setX(null)` que se pueda olvidar. Eso cierra de raíz:

- **FLU-01** — `ReviewScreen` tenía cero salidas y `route.view === 'adapt' && !review` dejaba
  la pantalla de adaptar en blanco el resto de la sesión: firmar la 2ª hoja de una tanda era
  imposible. Ahora la revisión tiene «← Volver a la tanda» / «← Volver a lo que le he
  preparado», y la tanda se **re-deriva del vault** (`job:learners` + `job:isSignedOff`) en
  vez de restaurarse de un estado que la navegación destruía.
- **P11, la mitad durable** — el expediente ofrece «Revisar y firmar» en cualquier fila con
  hoja adaptada: pendiente-de-firma es un fichero sin firma, no memoria de sesión. Sobrevive
  a cerrar la aplicación.
- **FLU-02** — ir a «adaptar» sin trabajo ya no arrastra el material del trabajo anterior.
- **FLU-03** — reconectar es cancelable («← Dejarlo como está») y no sobrevive a cambiar de
  sección, así que ya no secuestra Configuración ni el puntero de pictogramas de `025`.
- **FLU-08 / P14** — el intent se limpia al llegar a «hecho» y en «Otra ficha»: el siguiente
  trabajo empieza sin «examen» ya pulsado.

De paso, dos honestidades que el refactor dejó a la vista: el badge de la tanda y su frase de
resumen se derivan de la firma en disco (decían «sin firmar» para todas incluso después de
firmar una), y `job:learners` usa `learnersOf` del core en vez de su propio filtro de
directorios — el filtro contestaba «qué subcarpetas hay», que no es «para quién hay hoja».

**Tests:** 12 casos nuevos en `app/ui/test/route.test.ts`; e2e nuevo en `group.spec.ts`
(firmar las dos hojas de una tanda, y ambas firmas comprobadas en disco) y en
`connect.spec.ts` (las dos salidas de la reconexión). **Verificado por mutación** en cuatro
costuras: llevar `reconnecting` entre secciones → 2 fallos; llevar el job anterior → 1 fallo;
quitar el botón del expediente → e2e rojo; anular «Dejarlo como está» → e2e rojo.

**Commit:** ver historia (`0.1`). tsc limpio · 1492 casos · 106 e2e.

## Saltados y por qué

_(nada todavía)_

## Preguntas para Carlos

_(ninguna todavía)_

## Estado de la verificación

| | |
|---|---|
| `npx tsc --noEmit` | verde (línea base) |
| `npx vitest run` | verde — 1492 casos |
| `npm run test:e2e` | verde — 106 casos |
| `scripts/check-fr-coverage.sh` | verde (línea base) |
| `scripts/check-spec-kit.sh` | verde (línea base) |

---

**Quedan 23 ítems de la cola.**
