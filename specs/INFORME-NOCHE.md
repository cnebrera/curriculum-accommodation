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

### 0.2 · Borrado completo, los cinco residuos — P38, COD-03/07/18/19

El hallazgo que la revisión puso primero de noventa y tres, y el único que encontraron
tres revisores por separado. Tras «he borrado todo lo de X» sobrevivían: **su nombre real**
en `.rampa/names.enc`, los **paquetes de traspaso**, su **fila del roster**, las
**peticiones de composición** con su código en claro y texto libre de la docente, y el
**diario archivado**. Cuatro de los cinco eran invisibles para `verifyForgotten` (recorría
cuatro directorios, ni `handover/` ni `.rampa/`); el quinto era invisible por construcción
— buscar un código dentro de base64 de texto cifrado es una comprobación que solo puede
pasar, y era exactamente la que había en el e2e.

Ahora: el plan recoge los cinco y **nombra los dos que son ediciones y no borrados**
(`ForgetPlan.entries`), así que el «lista todo antes de confirmar» de FR-215 los incluye y
la pantalla los muestra; `verifyForgotten` recorre seis directorios, exime
`.rampa/erasures.md` por nombre en vez de saltarse `.rampa` entero (que es lo que ocultaba
las peticiones), y **pregunta** al mapa cifrado. Ese `NameStore` es **parámetro obligatorio**
de `executeForget` y `verifyForgotten`, no un hook opcional: la omisión es literalmente cómo
esto pasó, y un parámetro requerido no se le puede olvidar a nadie. `status: 'forgotten'`
sale del enum del roster — nadie lo escribía nunca y no se podía usar: una fila con lápida
sigue llevando el código, así que el verificador la reportaría como residuo para siempre.

**Tests:** 7 casos nuevos en `packages/core/test/memory-audit.test.ts`; `e2e/erasure.spec.ts`
reescrito — la siembra crea ahora los cinco residuos y se han quitado los tres
`if (x) expect(…)` que hacían pasar requisitos por ausencia. **Verificado por mutación** en
cuatro costuras: quitar `handover` del recorrido, quitar la pregunta al mapa, quitar el
borrado de la fila del roster, y volver `nameStore.forget` un no-op (2 e2e en rojo).
`specs/006-desktop-app/validation.md` corregido: decía que el mapa se borraba.

tsc limpio · 1499 casos · 106 e2e.

### 0.3 · Endurecer los dos guardianes — P31 (CONS-14), P42 (COD-10)

Antes que las specs nuevas, porque protege todo lo que viene.

**`check-fr-coverage.sh`** preguntaba solo si el número *aparecía* en `tasks.md`, y una
mención no es una cuenta. Ahora cada requisito **declarado** por la spec (`- **FR-nnn**`)
tiene que estar citado en sus propias tasks en una de tres formas, y la forma es el estado:
tarea (el checkbox), marcador explícito `done:|deferred:|dropped:` con razón (que gana a la
tarea, para una decisión posterior), o fila de tabla de cobertura (el encabezado decide).
Además, **una cita con el prefijo de otra spec deja de contar** — la regla 8 de AGENTS.md
aplicada desde el otro lado —, y **una spec que marca `**DEFERRED` no puede aparecer como
cubierta en sus tasks**, que es CONS-14 exactamente.

Y deja de mentir en el resumen: imprime **595 requisitos · 144 open · 443 done · 8 deferred**
en vez de «596, todos contabilizados», que se lee como «todos hechos» y era falso por cuatro.

Al estrenarse encontró **11 problemas reales**, los 11 corregidos:

- **7 requisitos que nadie estaba guardando**: `005` FR-516 y `012` FR-1009 estaban citados
  con el prefijo de otra spec (`014` FR-516 y `016` FR-1009 **no existen** — eran suyos, mal
  etiquetados); `009` FR-710, `013` FR-1113, `016` FR-1408, `017` FR-1503 y `018` FR-1612
  solo aparecían en una frase. Ahora cada uno tiene fila con lo que lo hace verdad y el test
  que fallaría.
- **4 aplazados que sus tasks presentaban como cubiertos**: `020` FR-1802/1817/1819 y `024`
  FR-2218. La spec ya decía DEFERRED desde el ítem 1.4/1.8; las tasks no.

**`check-spec-kit.sh`** gana la **regla 4**: una spec **citada por código** (convención del
propio repo — `` `NNN` ``, `NNN FR-`, `NNN T012`, `specs/NNN-`) o **llamada «shipped» por otra
spec** debe tener `plan.md` y `tasks.md`. Es COD-10: `022` se implementó y se declaró shipped
sin pasar por los gates, y las reglas 1-3 no podían verlo porque cada una mira un commit o un
directorio, nunca la relación entre «hay código de esto» y «esto pasó por el proceso». Hoy
pasa (las 35 specs tienen plan y tasks): es un trinquete para lo que viene.

De paso, el resto del ítem 1.6 que quedaba en código: `pictograms/fetch.ts` citaba
`022` FR-2008 como autoridad de una decisión suya, que es la lectura que llevó a `023` a decir
«after `022` shipped». Reescrito diciendo por qué se retira.

**Verificado por mutación**, cuatro veces: mención en prosa en vez de fila → rojo; renombrar
la tabla «Not done» de `011` para que sus filas se lean como satisfechas → rojo con los tres
FR-918/920/921; quitarle plan y tasks a una spec citada por código → rojo; una spec llamada
«shipped» sin plan → rojo.

**Un hallazgo lateral que conviene saber:** `check-spec-kit.sh` sale con 0 **sin comprobar
nada** cuando no hay ficheros en el índice (`git diff --cached` vacío → `exit 0` en la línea
41). Es de diseño para el hook, pero significa que ejecutarlo a mano con el árbol limpio no
prueba nada. Para verificarlo de verdad hay que tener algo en el índice o pasarle un ref
(`bash scripts/check-spec-kit.sh origin/main`), que es lo que hace CI.

AGENTS.md gana la regla 9 con la convención, y `.specify/templates/tasks-template.md` gana la
sección de cobertura, para que `/speckit-tasks` la produzca en vez de que sea folklore.

tsc limpio · 1499 casos · guardianes en verde.

## Saltados y por qué

_(nada todavía)_

## Preguntas para Carlos

- **0.2 · Validación de protección de datos (P38, tu propia condición).** El código hace lo
  que pedía el hallazgo y está cubierto por tests, pero *si el resultado satisface el derecho
  de supresión de datos de un menor* es un juicio de protección de datos, no un resultado de
  test. Queda pendiente que lo revise quien lleve protección de datos / legal antes de que
  esto se pueda presentar como cumplimiento. Anotado también en `validation.md`.
- **0.2 · Una decisión que tomé yo y conviene que confirmes.** Retiré `status: 'forgotten'`
  del enum del roster. Razón: nadie lo escribía nunca *y no se puede usar* — una fila con
  lápida sigue llevando el código, así que `verifyForgotten` la reportaría como residuo para
  siempre. Si querías que el roster guardara memoria de que hubo un alumno, eso vive en
  `.rampa/erasures.md` (fecha + código, nada suyo dentro). Dime si preferías otra cosa.

## Estado de la verificación

| | |
|---|---|
| `npx tsc --noEmit` | verde (línea base) |
| `npx vitest run` | verde — 1499 casos |
| `npm run test:e2e` | verde — 106 casos |
| `scripts/check-fr-coverage.sh` | verde (línea base) |
| `scripts/check-spec-kit.sh` | verde (línea base) |

---

**Quedan 21 ítems de la cola.**
